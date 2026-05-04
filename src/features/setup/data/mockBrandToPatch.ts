import type { Brand, BrandLogoAssets } from '@/shared/types/brand';
import type { ColorSystem, ColorToken, TypographySystem } from '@/shared/types/brandAssets';
import type { BrandLogo, MockBrand } from './mockBrand';

/**
 * Inverse of `brandToMockBrand`: takes the current Setup mock shape
 * and the canonical Brand it came from, and produces a `Partial<Brand>`
 * patch suitable for `brandStore.update(id, patch)`.
 *
 * IMPORTANT — propagation: every consumer that reads brand state
 * (case-study deck, brand kit, presentation slides, AI tools, etc.)
 * prefers the canonical structures (`brand.colorSystem.primary.hex`,
 * `brand.typography.primary.family`) over the legacy simple fields
 * (`brand.primaryColor`, `brand.fonts.primary`). Patching only the
 * legacy fields means the canonical ones stay stale and the
 * consumers keep showing old data even after the user has saved a
 * change in /setup. So when a color or font changes, we patch BOTH:
 *   - the legacy simple field (for backward compat)
 *   - the canonical colorSystem/typography token (so consumers update)
 *
 * Logos persist by extracting the source URL from each logo's SVG
 * wrapper (or by serializing the whole SVG to a data: URL when the
 * user uploaded a self-contained vector) and writing it to
 * `brand.logo` + `brand.logoAssets`. Photos and icons still flow
 * through local component state — wiring them up follows the same
 * pattern (see `buildLogoPatch`) once we settle on slot semantics
 * for both.
 */
export function mockBrandToPatch(mock: MockBrand, existing: Brand): Partial<Brand> {
  const patch: Partial<Brand> = {};

  if (mock.name !== existing.name) patch.name = mock.name;

  /* ─────────────────────────  logos  ───────────────────────── */

  const logoPatch = buildLogoPatch(mock.logos, existing);
  if (logoPatch) Object.assign(patch, logoPatch);

  /* ─────────────────────────  colors  ───────────────────────── */

  const primary = mock.colors.core[0]?.hex;
  const secondary = mock.colors.core[1]?.hex;
  const accent = mock.colors.accent[0]?.hex;
  const neutrals = mock.colors.grey.map((c) => c.hex);

  const primaryChanged = primary && primary !== existing.primaryColor;
  const secondaryChanged = secondary !== existing.secondaryColor;
  const accentChanged = accent !== existing.accentColor;
  const neutralsChanged = !arraysEqual(neutrals, existing.neutrals ?? []);

  if (primaryChanged && primary) patch.primaryColor = primary;
  if (secondaryChanged) patch.secondaryColor = secondary;
  if (accentChanged) patch.accentColor = accent;
  if (neutralsChanged) patch.neutrals = neutrals;

  if (primaryChanged || secondaryChanged || accentChanged || neutralsChanged) {
    patch.colorSystem = mergeColorSystem(existing.colorSystem, mock);
  }

  /* ─────────────────────────  fonts  ───────────────────────── */

  const primaryFont = mock.fonts[0]?.family;
  const secondaryFont = mock.fonts[1]?.family;
  const fontsChanged =
    primaryFont !== existing.fonts?.primary || secondaryFont !== existing.fonts?.secondary;

  if (fontsChanged && primaryFont) {
    patch.fonts = {
      primary: primaryFont,
      secondary: secondaryFont,
    };
    patch.typography = mergeTypography(existing.typography, primaryFont, secondaryFont);
  }

  // Persist uploaded font files onto the canonical typography slot
  // so they survive reloads. Scan ALL mock.fonts[] (not just 0/1) and
  // route files to the matching primary/secondary slot via lenient
  // family-name matching — rescues uploads parsed as "GT Super Display"
  // when the brand declares "GT Super". When fonts also changed above,
  // patch.typography is already set by mergeTypography; we use it as the
  // spread base so file changes augment family changes instead of
  // clobbering the metadata mergeTypography preserved.
  const primaryFiles = collectFilesFor(mock, primaryFont);
  const secondaryFiles = collectFilesFor(mock, secondaryFont);
  const existingPrimaryFiles = existing.typography?.primary?.files ?? [];
  const existingSecondaryFiles = existing.typography?.secondary?.files ?? [];
  if (
    !fontFilesEqual(primaryFiles, existingPrimaryFiles) ||
    !fontFilesEqual(secondaryFiles, existingSecondaryFiles)
  ) {
    const baseTypography = patch.typography ?? existing.typography;
    patch.typography = {
      ...baseTypography,
      primary: {
        ...baseTypography?.primary,
        family: primaryFont ?? baseTypography?.primary?.family ?? '',
        ...(primaryFiles.length > 0 ? { files: primaryFiles } : {}),
      },
      ...(secondaryFont
        ? {
            secondary: {
              ...baseTypography?.secondary,
              family: secondaryFont,
              ...(secondaryFiles.length > 0 ? { files: secondaryFiles } : {}),
            },
          }
        : {}),
    };
  }

  /* ─────────────────────────  websites / voice / strategy  ───────────────────────── */

  const firstSite = mock.websites[0]?.url;
  if (firstSite !== existing.publicUrl) {
    patch.publicUrl = firstSite;
  }

  const voiceEssay = mock.voice.essay.trim();
  if (voiceEssay && voiceEssay !== existing.tone) {
    patch.tone = voiceEssay;
  }

  const strategyPatch = extractStrategyPatch(mock, existing);
  if (strategyPatch) {
    patch.guidelines = {
      ...existing.guidelines,
      strategy: {
        ...existing.guidelines?.strategy,
        ...strategyPatch,
      },
    };
  }

  return patch;
}

/* ─────────────────────────  helpers  ───────────────────────── */

function mergeColorSystem(existing: ColorSystem | undefined, mock: MockBrand): ColorSystem {
  const primary = mock.colors.core[0];
  const secondary = mock.colors.core[1];
  const accent = mock.colors.accent[0];
  const neutrals = mock.colors.grey;

  // Preserve existing token metadata (rgb / cmyk / pantone / usage / name)
  // when the hex hasn't changed; rebuild fresh when it has.
  const updateToken = (
    next: { hex: string; name?: string } | undefined,
    prev: ColorToken | undefined,
    fallbackName: string,
  ): ColorToken | undefined => {
    if (!next?.hex) return undefined;
    if (prev && prev.hex === next.hex) return prev;
    return {
      hex: next.hex,
      name: next.name ?? prev?.name ?? fallbackName,
    };
  };

  const merged: ColorSystem = {
    ...(existing ?? { primary: { hex: '#000000' } }),
    primary:
      updateToken(primary, existing?.primary, 'Primary') ??
      existing?.primary ??
      { hex: primary?.hex ?? '#000000' },
    secondary: updateToken(secondary, existing?.secondary, 'Secondary'),
    accent: updateToken(accent, existing?.accent, 'Accent'),
    neutrals:
      neutrals.length > 0
        ? neutrals.map((n, i) => {
            const prev = existing?.neutrals?.[i];
            if (prev && prev.hex === n.hex) return prev;
            return { hex: n.hex, name: n.name ?? prev?.name ?? `Neutral ${i + 1}` };
          })
        : existing?.neutrals,
  };

  // Strip undefined keys so an empty secondary doesn't write `secondary: undefined`.
  Object.keys(merged).forEach((k) => {
    if ((merged as Record<string, unknown>)[k] === undefined) {
      delete (merged as Record<string, unknown>)[k];
    }
  });

  return merged;
}

function mergeTypography(
  existing: TypographySystem | undefined,
  primaryFamily: string,
  secondaryFamily: string | undefined,
): TypographySystem {
  return {
    ...(existing ?? { primary: { family: primaryFamily } }),
    primary: {
      ...(existing?.primary ?? {}),
      family: primaryFamily,
    },
    secondary: secondaryFamily
      ? {
          ...(existing?.secondary ?? {}),
          family: secondaryFamily,
        }
      : existing?.secondary,
  };
}

function extractStrategyPatch(
  mock: MockBrand,
  existing: Brand,
): Record<string, string> | null {
  const byId = new Map(mock.about.map((a) => [a.id, a.content.trim()]));
  const next = {
    mission: byId.get('mission') ?? '',
    vision: byId.get('vision') ?? '',
    positioning: byId.get('messaging') ?? '',
  };
  const prev = existing.guidelines?.strategy ?? {};
  const changed: Record<string, string> = {};
  for (const [k, v] of Object.entries(next)) {
    if (v && v !== (prev as Record<string, unknown>)[k]) {
      changed[k] = v;
    }
  }
  return Object.keys(changed).length ? changed : null;
}

/** Pull every uploaded font file across mock.fonts[] that matches
 *  `family` under lenient comparison (case-insensitive, prefix-aware,
 *  ≥3 char overlap). Mirrors the matching SetupPage's handleAddFont
 *  uses when attaching uploads to existing entries — so an upload
 *  parsed as "GT Super Display" still attaches to a "GT Super" slot. */
function collectFilesFor(
  mock: MockBrand,
  family: string | undefined,
): Array<{ name: string; weight: string; format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot'; dataUrl: string; size: number }> {
  if (!family) return [];
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const target = norm(family);
  const out: Array<{ name: string; weight: string; format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot'; dataUrl: string; size: number }> = [];
  for (const f of mock.fonts) {
    const candidate = norm(f.family);
    const matches =
      candidate === target ||
      (candidate.length >= 3 && target.startsWith(candidate)) ||
      (target.length >= 3 && candidate.startsWith(target));
    if (matches && f.files && f.files.length > 0) {
      out.push(...f.files);
    }
  }
  return out;
}

function fontFilesEqual(
  a: Array<{ name: string; size: number }>,
  b: Array<{ name: string; size: number }>,
): boolean {
  if (a.length !== b.length) return false;
  const sig = (x: { name: string; size: number }) => `${x.name.toLowerCase()}::${x.size}`;
  const left = a.map(sig).sort().join('|');
  const right = b.map(sig).sort().join('|');
  return left === right;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/* ─────────────────────────  logos helpers  ───────────────────────── */

/**
 * Pull the original asset URL out of a Setup logo. Setup wraps every
 * uploaded image in a `<svg><image href="..."/></svg>` shell, and
 * `brandToMockBrand` does the same when projecting an existing brand
 * back into the Setup view. Round-tripping THROUGH that shell would
 * triple-base64 the asset on every save, so when a single `<image>`
 * is the only payload we extract its href verbatim.
 *
 * For self-contained SVGs (a `.svg` file the user uploaded with paths,
 * shapes, etc.) we serialize the whole document to a `data:image/svg+xml`
 * URL so it persists in the brand row.
 */
function extractLogoUrl(logo: BrandLogo): string {
  // First non-empty <image href> in the logo SVG. The wrapper Setup
  // produces always has exactly one such element.
  const m = logo.svg.match(/<image[^>]*?(?:xlink:)?href=["']([^"']+)["']/);
  if (m && m[1]) return m[1];

  // No <image> tag → user uploaded a real SVG document. Serialize it.
  try {
    const b64 = btoa(unescape(encodeURIComponent(logo.svg)));
    return `data:image/svg+xml;base64,${b64}`;
  } catch {
    // Fall through to a URI-encoded svg if base64 encoding fails on
    // exotic Unicode in the source (rare).
    return `data:image/svg+xml;utf8,${encodeURIComponent(logo.svg)}`;
  }
}

/** Map Setup logos to the BrandLogoAssets dict by inspecting their
 *  labels and variants. The first logo always anchors `full` and
 *  `brand.logo`. Subsequent logos fill more specific slots when their
 *  label hints at one (Wordmark / Mark / Icon / Inverse), falling back
 *  to ordinal fills (`alternate`, `icon`) so a no-label upload still
 *  lands somewhere.
 */
function logosToAssetsDict(logos: BrandLogo[]): BrandLogoAssets {
  const urls = logos.map(extractLogoUrl);
  const findUrl = (predicate: (l: BrandLogo, i: number) => boolean): string | undefined => {
    const idx = logos.findIndex(predicate);
    return idx >= 0 ? urls[idx] : undefined;
  };

  const out: BrandLogoAssets = {};
  if (urls[0]) out.full = urls[0];

  const wordmark = findUrl((l) => /wordmark/i.test(l.label));
  if (wordmark) out.wordmark = wordmark;

  const icon = findUrl((l) => /^(mark|icon|monogram)$/i.test(l.label));
  if (icon) out.icon = icon;

  const alternate = findUrl(
    (l, i) => i > 0 && !/wordmark|mark|icon|monogram/i.test(l.label),
  );
  if (alternate) out.alternate = alternate;
  // Fall back to the second logo if no labelled candidate stepped up
  // and no other slot has claimed it.
  if (!out.alternate && urls[1] && urls[1] !== out.wordmark && urls[1] !== out.icon) {
    out.alternate = urls[1];
  }

  const light = findUrl((l) => l.variant === 'light');
  if (light) out.light = light;
  const dark = findUrl((l) => l.variant === 'dark');
  if (dark) out.dark = dark;

  return out;
}

function logoAssetsEqual(a: BrandLogoAssets | undefined, b: BrandLogoAssets): boolean {
  const keys: (keyof BrandLogoAssets)[] = [
    'full',
    'icon',
    'wordmark',
    'alternate',
    'dark',
    'light',
  ];
  for (const k of keys) {
    if ((a?.[k] ?? undefined) !== (b[k] ?? undefined)) return false;
  }
  return true;
}

/**
 * Compute the logo slice of the patch. Returns null when the Setup
 * logos round-trip to the same URLs the brand already has — important,
 * because every Setup edit (even one unrelated to logos) flushes the
 * full mock through this function on the 400ms debounce; without an
 * equality check we'd rewrite the logo URLs on every keystroke.
 *
 * Strategy is MERGE, not replace. `brandToMockBrand` only surfaces
 * three logo slots in Setup (primary / wordmark / icon) — variants
 * like `light` and `dark` (used by pickLogoOnBackground for surface-
 * aware logo selection) live in `brand.logoAssets` but never appear
 * in the editor. A naive replace would clobber them on every Setup
 * save. We layer the Setup edits on top of the existing dict so seed
 * brand variants survive untouched.
 */
function buildLogoPatch(
  logos: BrandLogo[],
  existing: Brand,
): Partial<Brand> | null {
  if (logos.length === 0) {
    // User cleared every Setup-visible logo. We DON'T wipe
    // `brand.logoAssets` entirely — the user only had primary/
    // wordmark/icon under their hands; any pre-existing dark/light
    // variant they never saw should remain. Just clear the slots
    // Setup owns.
    const stripped: BrandLogoAssets = { ...existing.logoAssets };
    delete stripped.full;
    delete stripped.wordmark;
    delete stripped.icon;
    delete stripped.alternate;
    if (
      existing.logo === undefined &&
      logoAssetsEqual(existing.logoAssets, stripped)
    ) {
      return null;
    }
    return { logo: undefined, logoAssets: stripped } as Partial<Brand>;
  }

  const next = logosToAssetsDict(logos);
  const merged: BrandLogoAssets = { ...existing.logoAssets, ...next };

  const primaryUnchanged = existing.logo === merged.full;
  const assetsUnchanged = logoAssetsEqual(existing.logoAssets, merged);
  if (primaryUnchanged && assetsUnchanged) return null;

  const out: Partial<Brand> = { logoAssets: merged };
  if (merged.full) out.logo = merged.full;
  return out;
}
