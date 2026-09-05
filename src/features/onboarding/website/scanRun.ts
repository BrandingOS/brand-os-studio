/**
 * One website scan, end to end, as the processing moment runs it.
 *
 * Pure orchestration over injected pieces so the screen stays thin and the
 * sequence is testable without a browser: scan → scraped items into the
 * store → enrichment → the stage findings that were actually earned. Nothing
 * here is a second pipeline; every value flows into `understand()` afterwards.
 */
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { VOCABULARIES } from '../vocabulary/vocabularies';
import type { StageSignals } from '../understanding/stages';
import { hostOf } from './detectSite';
import type { ScanEvent, WebsiteEvidence } from './evidence';
import { enrichFromWebsite, enrichmentCandidates, type EnrichDeps, type EnrichmentReading, type EnrichmentResult } from './enrich';
import { runWebsiteScan, type ScanClientDeps, type ScanOutcome } from './scanClient';
import type { ScanReport } from './ScanNotice';
import { scrapedItems } from './scrapedAssets';
import { settledFromBrief } from './settled';

export interface ScanRunInput {
  brandId: string;
  brandName: string;
  url: string;
  description: string | undefined;
  /** What the user already brought, for de-duplication and precedence. */
  existing: () => readonly OnboardingAsset[];
  addItem: (item: OnboardingAsset) => void;
  signals: StageSignals;
  genId: () => string;
}

export interface ScanRunDeps {
  scan: ScanClientDeps;
  enrich?: EnrichDeps;
  /** Skip the model entirely (tests, or a workspace that opted out). */
  skipEnrichment?: boolean;
}

export interface ScanRunResult {
  outcome: ScanOutcome;
  evidence: WebsiteEvidence | null;
  inference?: EnrichmentReading;
  enrichment: EnrichmentResult | null;
  scraped: { logos: number; links: number };
  report: ScanReport;
  /** Milestones since the run started, for telemetry. Never copy. */
  timing: { firstEventMs?: number; scanMs: number; aiStartMs?: number; aiMs?: number; totalMs: number };
}

const ROLE_LABEL: Record<string, string> = { about: 'About page', services: 'Services page', contact: 'Contact page', other: 'one more page', home: 'homepage' };

function toneLabel(reading: EnrichmentReading | undefined): string | null {
  const c = reading?.candidates.find((x) => x.corePath === 'voice.tone');
  if (!c) return null;
  return VOCABULARIES.tone.find((m) => m.id === c.value)?.label ?? String(c.value);
}

export async function runScan(input: ScanRunInput, deps: ScanRunDeps): Promise<ScanRunResult> {
  const t0 = performance.now();
  const host = hostOf(input.url) ?? input.url;
  const { signals } = input;

  const outcome = await runWebsiteScan({ brandId: input.brandId, url: input.url }, (e: ScanEvent) => {
    if (e.type === 'opened') signals.resolve('site-opened', e.redirected && hostOf(e.finalUrl) !== host ? { label: 'Site', value: hostOf(e.finalUrl) ?? e.finalUrl } : null);
    if (e.type === 'signals') signals.resolve('site-signals', e.socials ? { label: 'Socials', value: `${e.socials} found` } : null);
    if (e.type === 'identity') signals.resolve('site-identity', e.logos ? { label: 'Logo', value: e.logos === 1 ? 'found' : `${e.logos} candidates` } : null);
    if (e.type === 'pages') {
      const value = e.attempted === 0 ? 'homepage only' : e.failed.length ? `${e.read + 1} of ${e.attempted + 1} read` : `${e.read + 1} read`;
      signals.resolve('site-pages', { label: 'Pages', value });
    }
  }, deps.scan);
  const scanMs = performance.now() - t0;

  const evidence = outcome.evidence && outcome.status !== 'failed' ? outcome.evidence : null;
  const found = { logo: false, colors: false, fonts: false, socials: false };
  let scraped = { logos: 0, links: 0 };
  let inference: EnrichmentReading | undefined;
  let enrichment: EnrichmentResult | null = null;
  let aiStartMs: number | undefined;
  let aiMs: number | undefined;

  if (evidence) {
    const items = scrapedItems(evidence, input.existing(), input.genId);
    for (const a of [...items.logos, ...items.links]) input.addItem(a);
    scraped = { logos: items.logos.length, links: items.links.length };
    found.logo = items.logos.length > 0;
    found.colors = evidence.colors.length > 0;
    found.fonts = evidence.typography.length > 0;
    found.socials = evidence.links.length > 0;
    const fonts = evidence.typography.slice(0, 2).map((f) => f.family);
    const visual = [evidence.colors.length ? `${evidence.colors.length} colour${evidence.colors.length === 1 ? '' : 's'}` : '', fonts.join(' + ')].filter(Boolean).join(' · ');
    signals.resolve('site-visual', visual ? { label: 'Visual', value: visual } : null);

    if (!deps.skipEnrichment) {
      aiStartMs = performance.now() - t0;
      enrichment = await enrichFromWebsite({ evidence, brandName: input.brandName, brandId: input.brandId, settled: settledFromBrief(input.description) }, deps.enrich);
      aiMs = performance.now() - t0 - aiStartMs;
      inference = enrichmentCandidates(enrichment, host);
      const tone = toneLabel(inference);
      signals.resolve('site-voice', tone ? { label: 'Tone', value: tone } : null);
    } else {
      signals.resolve('site-voice', null);
    }
  } else {
    // The site never opened: every scan stage is over, with nothing to say.
    for (const key of ['site-opened', 'site-signals', 'site-identity', 'site-pages', 'site-visual', 'site-voice']) signals.resolve(key, null);
  }

  const missedPages = (evidence?.problems ?? [])
    .filter((p) => !p.fatal && p.page && (p.code === 'http_error' || p.code === 'timeout' || p.code === 'blocked' || p.code === 'network' || p.code === 'robots_restricted'))
    .map((p) => {
      const role = evidence?.pages.find((pg) => pg.url === p.page)?.role;
      const path = (() => { try { return new URL(p.page as string).pathname; } catch { return ''; } })();
      const guess = /about|company|story|team/i.test(path) ? 'about' : /service|product|solution|menu|shop/i.test(path) ? 'services' : /contact/i.test(path) ? 'contact' : 'other';
      return ROLE_LABEL[role ?? guess];
    });

  const report: ScanReport = {
    host,
    status: outcome.status,
    reason: outcome.reason,
    reasonCode: outcome.reasonCode,
    missedPages: [...new Set(missedPages)],
    found,
    aiSkipped: enrichment?.skipped,
  };

  return {
    outcome, evidence, inference, enrichment, scraped, report,
    timing: { firstEventMs: outcome.telemetry.firstEventMs, scanMs, aiStartMs, aiMs, totalMs: performance.now() - t0 },
  };
}
