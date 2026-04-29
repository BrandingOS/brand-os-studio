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

  // Persist uploaded font files onto the canonical typography slot
  // so they survive reloads. We scan ALL mock.fonts[] (not just 0/1)
  // and route files to the matching primary/secondary slot via
  // lenient family-name matching. This rescues uploads that landed
  // on a third entry (e.g. filename parsed as "GT Super Display"
  // when the brand declares "GT Super") so they still ship with the
  // canonical Brand instead of getting dropped on persist.
  const primaryFiles = collectFilesFor(mock, primaryFont);
  const secondaryFiles = collectFilesFor(mock, secondaryFont);
  const existingPrimaryFiles = existing.typography?.primary?.files ?? [];
  const existingSecondaryFiles = existing.typography?.secondary?.files ?? [];
  if (
    !fontFilesEqual(primaryFiles, existingPrimaryFiles) ||
    !fontFilesEqual(secondaryFiles, existingSecondaryFiles)
  ) {
    patch.typography = {
      ...existing.typography,
      primary: {
        ...existing.typography?.primary,
        family: primaryFont ?? existing.typography?.primary?.family ?? '',
        ...(primaryFiles.length > 0 ? { files: primaryFiles } : {}),
      },
      ...(secondaryFont
        ? {
            secondary: {
              ...existing.typography?.secondary,
              family: secondaryFont,
              ...(secondaryFiles.length > 0 ? { files: secondaryFiles } : {}),
            },
          }
        : {}),
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
