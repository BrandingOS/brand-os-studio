/**
 * Shuffle logic — derives tile `content` from a brand and a template.
 *
 * Inputs:
 *   - brand (optional; null in standalone mode → neutral defaults)
 *   - template (which cells to fill)
 *   - seed (number) for reproducible shuffle
 *
 * Each tile picks a kind (from template hint or randomly) + content.
 */
import type { Brand, Asset } from '@/shared/types/brand';
import type { BentoTemplate, BentoTile, TileContent, TileKind } from './types';

// ─── Tiny seeded RNG (mulberry32). Deterministic across platforms. ─────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

// ─── Default palettes when brand is absent. ────────────────────────────
const NEUTRAL_COLORS = ['#0F172A', '#1E293B', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];
const ACCENT_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#10B981', '#06B6D4'];

const SAMPLE_QUOTES = [
  'Design is intelligence made visible.',
  'Make it simple. Make it memorable.',
  'Clarity over cleverness.',
  'Bold, warm, unmistakable.',
  'Every detail, on purpose.',
  'Built for the curious.',
];

const SAMPLE_STATS: Array<[string, string]> = [
  ['2019', 'Founded'],
  ['12k+', 'Customers'],
  ['98%', 'Retention'],
  ['A+', 'Recognition'],
  ['40+', 'Markets'],
  ['1M', 'Designs'],
];

const SAMPLE_TEXT = ['Aa', 'The quick brown fox', 'Brand • Identity', 'Made with care', 'Timeless'];

// ─── Brand-derived pickers. ────────────────────────────────────────────
function brandColors(brand: Brand | null | undefined): string[] {
  const list: string[] = [];
  if (brand?.primaryColor) list.push(brand.primaryColor);
  if (brand?.secondaryColor) list.push(brand.secondaryColor);
  const neutrals = brand?.guidelines?.colorPalette?.neutral ?? [];
  neutrals.forEach((n) => n?.hex && list.push(n.hex));
  if (list.length < 3) list.push(...ACCENT_COLORS.slice(0, 3));
  return list;
}

function brandImages(brand: Brand | null | undefined): Asset[] {
  if (!brand?.assets) return [];
  return brand.assets.filter((a) => a.type === 'image' && !!a.url);
}

function brandVoice(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  const v = brand?.guidelines?.voiceAndTone;
  if (v?.brandVoice) out.push(v.brandVoice);
  v?.examples?.forEach((e) => e.good && out.push(e.good));
  if (brand?.strategy) out.push(brand.strategy);
  if (brand?.tone) out.push(`Tone: ${brand.tone}`);
  if (out.length === 0) out.push(...SAMPLE_QUOTES);
  return out.slice(0, 10);
}

function brandFonts(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  if (brand?.fonts?.primary) out.push(brand.fonts.primary);
  if (brand?.fonts?.secondary) out.push(brand.fonts.secondary);
  const primary = brand?.guidelines?.typography?.primary?.family;
  const secondary = brand?.guidelines?.typography?.secondary?.family;
  if (primary) out.push(primary);
  if (secondary) out.push(secondary);
  return Array.from(new Set(out)).slice(0, 4);
}

// ─── Resolve a content blob for a given kind. ──────────────────────────
function resolveContent(kind: TileKind, brand: Brand | null | undefined, r: () => number): TileContent {
  switch (kind) {
    case 'color': {
      const colors = brandColors(brand);
      return { color: pick(colors, r) };
    }
    case 'gradient': {
      const colors = brandColors(brand);
      const from = pick(colors, r);
      let to = pick(colors, r);
      if (to === from) to = pick(colors.filter((c) => c !== from).concat(ACCENT_COLORS), r) ?? ACCENT_COLORS[0];
      return { gradient: { from, to, angle: Math.floor(r() * 360) } };
    }
    case 'logo': {
      const variants: NonNullable<TileContent['logoVariant']>[] = ['full', 'icon', 'wordmark'];
      return { logoVariant: pick(variants, r), bg: pick([...NEUTRAL_COLORS.slice(-3), brand?.primaryColor ?? '#FFFFFF'], r) };
    }
    case 'typography': {
      const fonts = brandFonts(brand);
      const font = fonts.length > 0 ? pick(fonts, r) : 'Inter';
      const samples = ['Aa', 'Aa Bb Cc', brand?.name ?? 'Brand', font];
      return { text: pick(samples, r), fontFamily: font, fg: pick(NEUTRAL_COLORS.slice(0, 3), r) };
    }
    case 'voice-quote': {
      const voices = brandVoice(brand);
      return { text: pick(voices, r), fontFamily: brandFonts(brand)[0] ?? 'Inter', align: 'left' };
    }
    case 'asset-image': {
      const imgs = brandImages(brand);
      if (imgs.length === 0) {
        // Fallback — render as gradient if no brand images available.
        const colors = brandColors(brand);
        return { gradient: { from: colors[0] ?? '#6366F1', to: colors[1] ?? '#EC4899', angle: 45 } };
      }
      return { assetId: pick(imgs, r).id };
    }
    case 'user-image': {
      return {}; // filled when user drops an image
    }
    case 'pattern': {
      const colors = brandColors(brand);
      const kinds: NonNullable<TileContent['patternKind']>[] = ['dots', 'stripes', 'checker', 'circles'];
      return {
        patternKind: pick(kinds, r),
        fg: pick(colors, r),
        bg: pick([...NEUTRAL_COLORS.slice(-3), '#FFFFFF'], r),
      };
    }
    case 'stat': {
      const [value, label] = pick(SAMPLE_STATS, r);
      return {
        text: value,
        label,
        fontFamily: brandFonts(brand)[0],
        fg: brand?.primaryColor ?? NEUTRAL_COLORS[0],
      };
    }
    case 'text': {
      return { text: pick(SAMPLE_TEXT, r), fontFamily: brandFonts(brand)[0] };
    }
    case 'empty':
    default:
      return {};
  }
}

export interface ShuffleArgs {
  brand: Brand | null | undefined;
  template: BentoTemplate;
  /** If set, preserves each tile's existing kind, only re-rolls content. */
  preserveKinds?: boolean;
  /** Preserve each tile's existing content (e.g. user-uploaded images). */
  preserveTiles?: BentoTile[];
  seed?: number;
}

/** Roll content for every cell in a template. */
export function generateTiles({ brand, template, preserveKinds, preserveTiles, seed }: ShuffleArgs): BentoTile[] {
  const r = rng(seed ?? Math.floor(Math.random() * 1e9));

  // Pool of candidate kinds when we're free-rolling (not preserving).
  const POOL: TileKind[] = brandImages(brand).length > 0
    ? ['logo', 'color', 'gradient', 'typography', 'voice-quote', 'asset-image', 'pattern', 'stat']
    : ['logo', 'color', 'gradient', 'typography', 'voice-quote', 'pattern', 'stat'];

  return template.tiles.map((tpl, idx) => {
    const existing = preserveTiles?.[idx];
    const isUserImage = existing?.kind === 'user-image' && existing.content?.dataUrl;

    if (isUserImage) {
      // Never clobber a user-uploaded image on shuffle.
      return {
        id: tpl.id,
        row: tpl.row,
        col: tpl.col,
        rowSpan: tpl.rowSpan,
        colSpan: tpl.colSpan,
        kind: existing!.kind,
        content: existing!.content,
      };
    }

    const kind: TileKind = preserveKinds
      ? (existing?.kind ?? tpl.kind)
      : (r() < 0.55 ? tpl.kind : pick(POOL, r));

    return {
      id: tpl.id,
      row: tpl.row,
      col: tpl.col,
      rowSpan: tpl.rowSpan,
      colSpan: tpl.colSpan,
      kind,
      content: resolveContent(kind, brand, r),
    };
  });
}
