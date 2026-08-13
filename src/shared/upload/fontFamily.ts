/**
 * Font filename → family + weight.
 *
 * Uploading a family means dropping 4–8 files that are all the *same* font
 * ("Alexandria-Bold.ttf", "Alexandria-ExtraLight.ttf"…). The review step shows
 * one row per family and keeps the individual weights as detail, so the user
 * sees the two fonts they picked — not eight rows.
 */
import type { OnboardingAsset } from './intakeTypes';

/** Canonical display label + CSS numeric weight, keyed by the lowercased token. */
const WEIGHT_TOKENS: Record<string, { label: string; rank: number }> = {
  hairline: { label: 'Hairline', rank: 100 },
  thin: { label: 'Thin', rank: 100 },
  extralight: { label: 'ExtraLight', rank: 200 },
  ultralight: { label: 'UltraLight', rank: 200 },
  light: { label: 'Light', rank: 300 },
  book: { label: 'Book', rank: 380 },
  regular: { label: 'Regular', rank: 400 },
  normal: { label: 'Regular', rank: 400 },
  roman: { label: 'Regular', rank: 400 },
  medium: { label: 'Medium', rank: 500 },
  semibold: { label: 'SemiBold', rank: 600 },
  demibold: { label: 'SemiBold', rank: 600 },
  bold: { label: 'Bold', rank: 700 },
  extrabold: { label: 'ExtraBold', rank: 800 },
  ultrabold: { label: 'ExtraBold', rank: 800 },
  black: { label: 'Black', rank: 900 },
  heavy: { label: 'Black', rank: 900 },
};

const STYLE_TOKENS: Record<string, string> = {
  italic: 'Italic',
  oblique: 'Italic',
};

/** Prefixes that bind to the weight token that follows them. */
const MODIFIERS = new Set(['extra', 'ultra', 'semi', 'demi']);

/** Width/optical tokens that belong to the family name, not the weight. */
const WIDTH_TOKENS = new Set([
  'condensed', 'semicondensed', 'extracondensed', 'ultracondensed',
  'expanded', 'semiexpanded', 'extraexpanded', 'ultraexpanded', 'narrow', 'wide',
]);

export interface ParsedFontName {
  /** Display family, e.g. "Bricolage Grotesque". */
  family: string;
  /** Normalized key used for grouping (case/space/optical-size insensitive). */
  familyKey: string;
  /** Display weight, e.g. "SemiBold Italic". Empty when the file says nothing. */
  weight: string;
  /** CSS-ish numeric order for sorting weights. */
  rank: number;
}

/** Split "BricolageGrotesque_24pt-SemiBoldItalic.ttf" into its parts. */
export function parseFontName(rawName: string): ParsedFontName {
  const stem = rawName.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
  // Split on separators, then on camelCase boundaries so "SemiBoldItalic"
  // and "semi-bold-italic" both resolve.
  const tokens = stem
    .split(/[\s_\-.]+/)
    .flatMap((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/\s+/),
    )
    .filter(Boolean);

  const familyTokens: string[] = [];
  const weightParts: string[] = [];
  let rank = 0;
  let sawWeight = false;

  // Walk from the end: weight/style tokens live in the suffix. Once a token
  // isn't a weight/style, everything before it is family.
  let i = tokens.length - 1;
  for (; i >= 0; i--) {
    const t = tokens[i];
    const key = t.toLowerCase();
    if (WIDTH_TOKENS.has(key)) break; // width belongs to the family
    if (STYLE_TOKENS[key]) {
      weightParts.unshift(STYLE_TOKENS[key]);
      continue;
    }
    // "ExtraLight" camel-splits into Extra + Light — glue the modifier back on
    // before the lookup, else the family swallows it ("Alexandria Extra").
    const prev = i > 0 ? tokens[i - 1].toLowerCase() : '';
    const compound = MODIFIERS.has(prev) ? `${prev}${key}` : '';
    const hit = (compound && WEIGHT_TOKENS[compound]) || WEIGHT_TOKENS[key];
    if (hit) {
      weightParts.unshift(hit.label);
      rank = hit.rank;
      sawWeight = true;
      if (compound && WEIGHT_TOKENS[compound]) i--; // consume the modifier too
      continue;
    }
    if (/^[1-9]00$/.test(t)) {
      const n = Number(t);
      weightParts.unshift(String(n));
      rank = n;
      sawWeight = true;
      continue;
    }
    break;
  }
  for (let j = 0; j <= i; j++) familyTokens.push(tokens[j]);

  // "Italic" alone still implies the regular weight.
  if (!sawWeight && weightParts.length > 0) rank = 400;

  const family = (familyTokens.length ? familyTokens : tokens).join(' ').trim() || stem;
  return {
    family,
    // Optical-size markers (24pt, 14pt) are the same typeface — collapse them.
    familyKey: family.toLowerCase().replace(/\b\d+\s?pt\b/g, '').replace(/[^a-z0-9]/g, ''),
    weight: weightParts.join(' '),
    rank: rank || 400,
  };
}

export interface FontFamilyGroup {
  key: string;
  family: string;
  /** All uploaded assets of this family, sorted light → heavy. */
  assets: OnboardingAsset[];
  /** Parsed weight per asset, index-aligned with `assets`. */
  weights: ParsedFontName[];
  /** The asset whose row represents the family (lightest-but-regular first). */
  lead: OnboardingAsset;
}

/** Collapse font assets into one entry per family, weights sorted. */
export function groupFontAssets(assets: OnboardingAsset[]): FontFamilyGroup[] {
  const byKey = new Map<string, FontFamilyGroup>();
  for (const asset of assets) {
    // A Google Font is picked by family name — never split it on a weight token.
    const parsed =
      asset.fontSource === 'google'
        ? { family: asset.name, familyKey: asset.name.toLowerCase().replace(/[^a-z0-9]/g, ''), weight: '', rank: 400 }
        : parseFontName(asset.name);
    const existing = byKey.get(parsed.familyKey);
    if (existing) {
      existing.assets.push(asset);
      existing.weights.push(parsed);
    } else {
      byKey.set(parsed.familyKey, {
        key: parsed.familyKey,
        family: parsed.family,
        assets: [asset],
        weights: [parsed],
        lead: asset,
      });
    }
  }

  return Array.from(byKey.values()).map((group) => {
    const paired = group.assets
      .map((asset, i) => ({ asset, parsed: group.weights[i] }))
      .sort((a, b) => a.parsed.rank - b.parsed.rank || a.asset.name.localeCompare(b.asset.name));
    // Prefer Regular as the family's representative row when it's there.
    const lead = paired.find((p) => p.parsed.rank === 400)?.asset ?? paired[0].asset;
    return {
      ...group,
      assets: paired.map((p) => p.asset),
      weights: paired.map((p) => p.parsed),
      lead,
    };
  });
}

/** "Regular · Medium · Bold" — the weights line under a family row. */
export function weightsSummary(group: FontFamilyGroup): string {
  const labels = group.weights.map((w, i) => w.weight || (group.assets[i].fontSource === 'google' ? 'Variable' : 'Regular'));
  return Array.from(new Set(labels)).join(' · ');
}
