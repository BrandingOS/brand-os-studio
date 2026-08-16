/**
 * Writes proposals into Brand Core at `suggested`.
 *
 * Every write goes through a canonical op with a SYSTEM actor, which is what
 * makes the authority come out right: a system write to a path with no
 * metadata entry opens at `suggested` (see `recordCoreWrite`). Nothing here can
 * reach `confirmed` — that requires a human actor and only `acceptance.ts`
 * supplies one.
 *
 * Failures are per-slice and reported by name. Because the brand already exists
 * and material is already in the Library, a failure here costs one value, not
 * the session.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { Actor, Provenance } from '@/domain/brand/coreMeta';
import { changeBrandColors, type BrandColorChanges } from '@/application/brand/changeBrandColor';
import { changeBrandTypography, type TypographyChanges } from '@/application/brand/changeBrandTypography';
import { changeBrandVoiceTone } from '@/application/brand/changeBrandVoice';
import { changeBrandStrategy } from '@/application/brand/changeBrandStrategy';
import { changeBrandVisualStyle } from '@/application/brand/changeBrandVisualStyle';
import { changeBusinessInfo } from '@/application/brand/changeBusinessInfo';
import type { StyleDescriptor } from '@/domain/brand/identity';
import { CARDINALITY } from '../vocabulary/vocabularies';
import type { BusinessFacts, Proposal } from './proposals';

/** The one actor onboarding's interpretation ever writes as. */
export const INTERPRETER: Actor = { kind: 'system', agent: 'onboarding-interpreter' };

export interface ApplyReport {
  /** Paths written successfully, at `suggested`. */
  applied: CoreFieldPath[];
  /** Paths that could not be written, with the reason, for honest reporting. */
  failed: Array<{ path: CoreFieldPath; reason: string }>;
}

/**
 * Sentinel paths a successful write retires.
 *
 * A path leaves the sentinel list the moment a REAL value lands on it, and
 * never comes back: the list only ever shrinks, so a brand cannot regress to
 * holding a stand-in for something it has since decided.
 */
export function sentinelsRetiredBy(report: ApplyReport): CoreFieldPath[] {
  return report.applied.filter(
    (p) => p === 'colors.primary' || p === 'typography.primary',
  );
}

type Hex = { hex: string };

function asHex(v: unknown): Hex | undefined {
  const h = (v as Hex | undefined)?.hex;
  return typeof h === 'string' && h ? { hex: h } : undefined;
}

/**
 * Applies a set of proposals, batching by the op that owns each path.
 *
 * Batching matters: `changeBrandColors` loads and saves once for every colour
 * role, so writing primary and secondary separately would mean two round trips
 * and a lost-update race between them.
 */
export async function applyProposals(
  repo: BrandRepository,
  brandId: string,
  proposals: Proposal[],
  /**
   * Overrides who is writing. Omitted, this is the interpreter and values open
   * at `suggested`. Supplied by the edit path, where a human is writing and the
   * value must record `user-entered` — the promotion to `confirmed` is a
   * separate act performed by `acceptance.ts`.
   */
  override?: { actor: Actor; provenance: Provenance },
): Promise<ApplyReport> {
  const applied: CoreFieldPath[] = [];
  const failed: Array<{ path: CoreFieldPath; reason: string }> = [];
  const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const by = (path: CoreFieldPath) => proposals.find((p) => p.corePath === path);
  const actor = override?.actor ?? INTERPRETER;
  const provenanceOf = (paths: CoreFieldPath[]): Provenance =>
    override?.provenance ??
    proposals.find((p) => paths.includes(p.corePath))?.provenance ??
    'inferred';

  // ── Colours ────────────────────────────────────────────────────────
  const colorPaths: CoreFieldPath[] = ['colors.primary', 'colors.secondary', 'colors.neutrals'];
  const colorChanges: BrandColorChanges = {};
  const primary = asHex(by('colors.primary')?.value);
  const secondary = asHex(by('colors.secondary')?.value);
  const neutrals = by('colors.neutrals')?.value as Hex[] | undefined;
  if (primary) colorChanges.primary = primary;
  if (secondary) colorChanges.secondary = secondary;
  if (Array.isArray(neutrals) && neutrals.length) colorChanges.neutrals = neutrals;
  if (Object.keys(colorChanges).length) {
    const touched = colorPaths.filter((p) => by(p));
    try {
      await changeBrandColors(repo, brandId, colorChanges, {
        actor,
        provenance: provenanceOf(colorPaths),
      });
      applied.push(...touched);
    } catch (e) {
      touched.forEach((path) => failed.push({ path, reason: reason(e) }));
    }
  }

  // ── Typography ─────────────────────────────────────────────────────
  const typePaths: CoreFieldPath[] = ['typography.primary', 'typography.secondary'];
  const typeChanges: TypographyChanges = {};
  const tp = by('typography.primary')?.value as { family?: string } | undefined;
  const ts = by('typography.secondary')?.value as { family?: string } | undefined;
  if (tp?.family) typeChanges.primary = { family: tp.family };
  if (ts?.family) typeChanges.secondary = { family: ts.family };
  if (Object.keys(typeChanges).length) {
    const touched = typePaths.filter((p) => by(p));
    try {
      await changeBrandTypography(repo, brandId, typeChanges, {
        actor,
        provenance: provenanceOf(typePaths),
      });
      applied.push(...touched);
    } catch (e) {
      touched.forEach((path) => failed.push({ path, reason: reason(e) }));
    }
  }

  // ── Voice ──────────────────────────────────────────────────────────
  const tone = by('voice.tone');
  if (tone && typeof tone.value === 'string' && tone.value) {
    try {
      await changeBrandVoiceTone(repo, brandId, tone.value, {
        actor,
        provenance: override?.provenance ?? tone.provenance,
      });
      applied.push('voice.tone');
    } catch (e) {
      failed.push({ path: 'voice.tone', reason: reason(e) });
    }
  }

  // ── Strategy ───────────────────────────────────────────────────────
  // One op per field: `changeBrandStrategy` takes a single change, and a
  // partial failure must cost only the field that failed.
  const strategyPaths: CoreFieldPath[] = [
    'strategy.summary',
    'strategy.mission',
    'strategy.vision',
    'strategy.values',
    'strategy.positioning',
    'strategy.personality',
    'strategy.targetAudience',
  ];
  for (const path of strategyPaths) {
    const p = by(path);
    if (!p) continue;
    const field = path.split('.')[1] as
      | 'summary' | 'mission' | 'vision' | 'values' | 'positioning' | 'personality' | 'targetAudience';
    try {
      await changeBrandStrategy(repo, brandId, { [field]: p.value } as never, {
        actor,
        provenance: override?.provenance ?? p.provenance,
      });
      applied.push(path);
    } catch (e) {
      failed.push({ path, reason: reason(e) });
    }
  }

  // ── Visual style ───────────────────────────────────────────────────
  // `descriptors` is a CLOSED union, so anything the normaliser could not
  // resolve to a member was already dropped upstream. Writing an "Other"
  // string here would fail schema validation and cost the whole write.
  const style = by('visualStyle.descriptors');
  if (style && Array.isArray(style.value) && style.value.length) {
    try {
      await changeBrandVisualStyle(
        repo,
        brandId,
        // Capped here as well as in the picker. A style list is a decision, and
        // twelve of them is the absence of one — a brand described as modern,
        // minimal, bold, geometric, artisanal, corporate, technical, futuristic,
        // retro, classic, organic and playful has said nothing.
        { descriptors: (style.value as StyleDescriptor[]).slice(0, CARDINALITY.style.max) },
        { actor, provenance: override?.provenance ?? style.provenance },
      );
      applied.push('visualStyle.descriptors');
    } catch (e) {
      failed.push({ path: 'visualStyle.descriptors', reason: reason(e) });
    }
  }

  return { applied, failed };
}

/**
 * Writes the business facts.
 *
 * Separate from `applyProposals` because these are NOT Core: they describe what
 * the business is, not what the brand looks and sounds like, so they carry no
 * authority sidecar and there is nothing to confirm. One call, because
 * `changeBusinessInfo` merges — writing them field by field would be four round
 * trips and a lost-update race between them.
 *
 * Returns the names of anything that did not save, so the caller can say so.
 * Never throws: a business fact failing must not cost the Core writes.
 */
export async function applyBusinessFacts(
  repo: BrandRepository,
  brandId: string,
  facts: BusinessFacts,
): Promise<string[]> {
  // Presence, not truthiness: these are editable fields now, and a user who
  // empties one is answering "none" rather than failing to answer. The
  // understanding pass only sets keys it actually found, so the two cases stay
  // distinguishable.
  const change: Record<string, unknown> = {};
  if (facts.industry !== undefined) change.industry = facts.industry;
  if (facts.tagline !== undefined) change.tagline = facts.tagline;
  if (facts.description !== undefined) change.description = facts.description;
  if (facts.audienceSummary !== undefined) change.audienceSummary = facts.audienceSummary;
  if (facts.links !== undefined) change.links = facts.links;
  if (facts.website) change.contact = { website: facts.website };
  if (!Object.keys(change).length) return [];

  try {
    await changeBusinessInfo(repo, brandId, change as never);
    return [];
  } catch {
    return ['your business details'];
  }
}
