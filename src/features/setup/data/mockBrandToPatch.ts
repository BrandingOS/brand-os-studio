import type { Brand } from '@/shared/types/brand';
import type { ColorSystem, ColorToken, TypographySystem } from '@/shared/types/brandAssets';
import type { MockBrand } from './mockBrand';

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
 * Binary assets (logos[], photos[], icons[]) are intentionally skipped
 * for now — they require an asset-upload pipeline that isn't wired
 * yet. Edits to those fields stay in local component state until that
 * lands.
 */
export function mockBrandToPatch(mock: MockBrand, existing: Brand): Partial<Brand> {
  const patch: Partial<Brand> = {};

  if (mock.name !== existing.name) patch.name = mock.name;

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

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
