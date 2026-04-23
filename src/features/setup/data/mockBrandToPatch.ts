import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from './mockBrand';

/**
 * Inverse of `brandToMockBrand`: takes the current Setup mock shape
 * and the canonical Brand it came from, and produces a `Partial<Brand>`
 * patch suitable for `brandStore.update(id, patch)`.
 *
 * Only the fields that round-trip cleanly are persisted today:
 *   - name
 *   - primaryColor (core[0]) + secondaryColor (core[1])
 *   - accentColor (accent[0])
 *   - neutrals (grey[])
 *   - fonts.primary (fonts[0].family) + fonts.secondary (fonts[1].family)
 *   - publicUrl (websites[0].url)
 *   - tone (voice.essay)
 *   - guidelines.strategy.{mission,vision,positioning} (parts of about[])
 *
 * Binary assets (logos[], photos[], icons[]) are intentionally skipped
 * for now — they require an asset-upload pipeline (Supabase Storage or
 * similar) that isn't wired yet. Edits to those fields stay in local
 * component state until that lands.
 */
export function mockBrandToPatch(mock: MockBrand, existing: Brand): Partial<Brand> {
  const patch: Partial<Brand> = {};

  if (mock.name !== existing.name) patch.name = mock.name;

  const primary = mock.colors.core[0]?.hex;
  if (primary && primary !== existing.primaryColor) patch.primaryColor = primary;

  const secondary = mock.colors.core[1]?.hex;
  if (secondary !== existing.secondaryColor) {
    patch.secondaryColor = secondary;
  }

  const accent = mock.colors.accent[0]?.hex;
  if (accent !== existing.accentColor) {
    patch.accentColor = accent;
  }

  const neutrals = mock.colors.grey.map((c) => c.hex);
  if (!arraysEqual(neutrals, existing.neutrals ?? [])) {
    patch.neutrals = neutrals;
  }

  const primaryFont = mock.fonts[0]?.family;
  const secondaryFont = mock.fonts[1]?.family;
  if (primaryFont && (primaryFont !== existing.fonts?.primary || secondaryFont !== existing.fonts?.secondary)) {
    patch.fonts = {
      primary: primaryFont,
      secondary: secondaryFont,
    };
  }

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
