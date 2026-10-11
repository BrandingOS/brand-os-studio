/**
 * Runs the intake against the live services and writes the result into the
 * draft. Called when the owner pastes or leaves the box, and again by
 * Continue if the text changed since — so nobody has to press "read".
 *
 * An answer the owner chose themselves (`sources[field] === 'you'`) is never
 * overwritten by a reading. Anything still empty after reading falls back to
 * what the logo suggests for personality; the rest stays open, and the
 * directions cope with an open answer.
 */
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';
import { defaultScanDeps, runWebsiteScan } from '@/features/onboarding/website/scanClient';
import { enrichFromWebsite } from '@/features/onboarding/website/enrich';
import { settledFromBrief } from '@/features/onboarding/website/settled';
import { understand, type UnderstandDeps } from '../engine/understand';
import { personalityFromTraits } from '../engine/personality';
import { useLogoFlow } from './flowStore';
import type { BrandContext, IntakeField } from './types';

export const liveIntakeDeps: UnderstandDeps = {
  async scanSite(url) {
    const outcome = await runWebsiteScan({ brandId: '', url }, () => {}, defaultScanDeps());
    return { evidence: outcome.status === 'failed' ? null : outcome.evidence, reason: outcome.reason };
  },
  enrichSite: (evidence, brandName) =>
    enrichFromWebsite({ evidence, brandName, brandId: '', settled: settledFromBrief(undefined) }),
  async askModel(system, user) {
    const res = await callAnthropic({ model: 'haiku', operation: 'logo-flow-intake', max_tokens: 400, system, messages: [{ role: 'user', content: user }] });
    return firstText(res);
  },
};

const FIELDS: IntakeField[] = ['industry', 'audience', 'positioning', 'personality', 'oneLiner'];

let inFlight: Promise<void> | null = null;

/** With nothing else to go on, the mark itself suggests how the brand feels. */
function feelFromLogo(): void {
  const live = useLogoFlow.getState();
  if (live.context.personality.length || !live.read) return;
  live.updateContext({
    personality: personalityFromTraits(live.read.traits),
    sources: { ...live.context.sources, personality: 'logo' },
  });
}

export function readIntake(deps: UnderstandDeps = liveIntakeDeps): Promise<void> {
  const { context, intakeRead } = useLogoFlow.getState();
  if (context.about.trim() === intakeRead.trim()) {
    if (inFlight) return inFlight;
    feelFromLogo();
    return Promise.resolve();
  }
  if (inFlight) return inFlight;
  const text = context.about;
  inFlight = (async () => {
    useLogoFlow.getState().setIntake({ reading: true, intakeNote: null });
    try {
      const reading = await understand(text, context.name, deps);
      const live = useLogoFlow.getState();
      const next: Partial<BrandContext> = {};
      const sources = { ...live.context.sources };
      for (const f of FIELDS) {
        if (sources[f] === 'you') continue;
        const v = reading.patch[f];
        if (v === undefined || (Array.isArray(v) && !v.length) || v === '') continue;
        (next as Record<string, unknown>)[f] = v;
        sources[f] = reading.sources[f];
      }
      if (reading.patch.loveHues?.length && !live.context.loveHues.length) next.loveHues = reading.patch.loveHues;
      live.updateContext({ ...next, sources });
      live.setIntake({ intakeRead: text, intakeNote: reading.note ?? null });
      feelFromLogo();
    } finally {
      useLogoFlow.getState().setIntake({ reading: false });
      inFlight = null;
    }
  })();
  return inFlight;
}
