// src/shared/typography/fontCatalog.ts
import type { FontRef } from '@/shared/types/typescale';

/** Curated Google Font pairings — safe, modern, loadable without auth. */
export const GOOGLE_FONT_CATALOG: readonly FontRef[] = [
  { family: 'Inter',             source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Manrope',           source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Space Grotesk',     source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'DM Sans',           source: 'google', weights: [400, 500, 700],      italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Plus Jakarta Sans', source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Work Sans',         source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Playfair Display',  source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Fraunces',          source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Source Serif 4',    source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Lora',              source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'IBM Plex Sans',     source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'IBM Plex Serif',    source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'IBM Plex Mono',     source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'JetBrains Mono',    source: 'google', weights: [400, 500, 700],      italic: true,  fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'Geist',             source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Geist Mono',        source: 'google', weights: [400, 500, 700],      italic: false, fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'Cal Sans',          source: 'google', weights: [400, 600],           italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Cormorant Garamond',source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'EB Garamond',       source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Crimson Pro',       source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
] as const;

/** System font stacks — always available, zero load cost. */
export const SYSTEM_FONT_CATALOG: readonly FontRef[] = [
  {
    family: 'system-ui',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: true,
    fallback: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  },
  {
    family: 'ui-serif',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: true,
    fallback: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    family: 'ui-monospace',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: false,
    fallback: 'SFMono-Regular, Menlo, Consolas, monospace',
  },
] as const;

export function findCatalogEntry(family: string): FontRef | undefined {
  return [...GOOGLE_FONT_CATALOG, ...SYSTEM_FONT_CATALOG].find(f => f.family === family);
}

export function googleFontsCssUrl(ref: FontRef): string {
  if (ref.source !== 'google') throw new Error('googleFontsCssUrl requires a google FontRef');
  const family = ref.family.replace(/\s+/g, '+');
  const axes = ref.italic
    ? `ital,wght@${ref.weights.flatMap(w => [`0,${w}`, `1,${w}`]).join(';')}`
    : `wght@${ref.weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${family}:${axes}&display=swap`;
}
