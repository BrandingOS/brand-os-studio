/**
 * Generation service — decides which designs a deliverable's Generate
 * action proposes. Deliberately separated from the UI (and behind an
 * async interface) so a future AI generator can replace or augment the
 * template-library strategy without touching the UX architecture.
 *
 * The default `TemplateLibraryGenerator` ranks the deliverable's
 * variant library: curated `featuredIds` first, then a brand-seeded
 * deterministic shuffle — different brands see different (but stable
 * across reloads) candidate sets. Regenerate passes the already-seen
 * variant ids as `exclude` to walk further down the ranking, wrapping
 * around once the library is exhausted.
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { variantsForCard } from '../data/legacy-mapping';
import type { DeliverableDef, RankContext } from './registry';

export type GenerationContext = {
  /** Stable per-brand seed (brand id). */
  seed: string;
  brand: MockBrand;
};

export type GenerationResult = {
  candidates: BrandKitTemplate[];
};

export interface KitGenerator {
  generate(
    def: DeliverableDef,
    ctx: GenerationContext,
    opts?: { exclude?: string[] },
  ): Promise<GenerationResult>;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Seeded xorshift shuffle — stable for a given seed. */
function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Featured-first + seeded shuffle of the rest. Exported so tests and
 *  custom `rank` implementations can compose with it. */
export function rankVariants(
  def: DeliverableDef,
  templates: BrandKitTemplate[],
  ctx: RankContext,
): BrandKitTemplate[] {
  if (def.rank) return def.rank(templates, ctx);
  const featured: BrandKitTemplate[] = [];
  const rest: BrandKitTemplate[] = [];
  const featuredIds = def.featuredIds ?? [];
  for (const id of featuredIds) {
    const t = templates.find((x) => x.id === id);
    if (t) featured.push(t);
  }
  for (const t of templates) {
    if (!featuredIds.includes(t.id)) rest.push(t);
  }
  return [...featured, ...seededShuffle(rest, hashString(`${ctx.seed}::${def.key}`))];
}

export class TemplateLibraryGenerator implements KitGenerator {
  async generate(
    def: DeliverableDef,
    ctx: GenerationContext,
    opts?: { exclude?: string[] },
  ): Promise<GenerationResult> {
    const blocker = def.validate?.(ctx.brand);
    if (blocker) throw new Error(blocker);

    const templates = variantsForCard(def.sectionKey, def.label, ctx.brand);
    if (templates.length === 0) {
      throw new Error(`No designs available for ${def.label} yet`);
    }

    const ranked = rankVariants(def, templates, { seed: ctx.seed, brand: ctx.brand });
    const exclude = new Set(opts?.exclude ?? []);
    const fresh = ranked.filter((t) => !exclude.has(t.id));
    // Wrap around when the exclude list has consumed the library — the
    // user can keep pressing "Show me more" without dead-ending.
    const pool = fresh.length > 0 ? fresh : ranked;
    return { candidates: pool.slice(0, def.candidateCount) };
  }
}

export const defaultKitGenerator: KitGenerator = new TemplateLibraryGenerator();
