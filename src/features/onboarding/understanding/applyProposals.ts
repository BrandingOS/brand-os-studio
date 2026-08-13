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
import type { Proposal } from './proposals';

/** The one actor onboarding's interpretation ever writes as. */
export const INTERPRETER: Actor = { kind: 'system', agent: 'onboarding-interpreter' };

export interface ApplyReport {
  /** Paths written successfully, at `suggested`. */
  applied: CoreFieldPath[];
  /** Paths that could not be written, with the reason, for honest reporting. */
  failed: Array<{ path: CoreFieldPath; reason: string }>;
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
    'strategy.mission',
    'strategy.vision',
    'strategy.values',
    'strategy.positioning',
    'strategy.targetAudience',
  ];
  for (const path of strategyPaths) {
    const p = by(path);
    if (!p) continue;
    const field = path.split('.')[1] as
      | 'mission' | 'vision' | 'values' | 'positioning' | 'targetAudience';
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

  return { applied, failed };
}
