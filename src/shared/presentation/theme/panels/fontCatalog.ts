// src/shared/presentation/theme/panels/fontCatalog.ts
//
// Curated list of fonts the deck Customize panel offers. Each entry
// carries a Google Fonts URL (or 'system') so picking the font also
// LOADS it — without the loader, changing the font-family CSS var
// just falls back to a system font the user can't tell from the
// previous one.
//
// `family` is the value we write into a role's `font` field
// (`theme.typography.roles.h1.font`, etc.). Fallbacks mean the var
// is safe even if the load races the first paint.

export type FontKind = 'sans' | 'serif' | 'display' | 'mono' | 'arabic';

export interface DeckFont {
  /** Human-readable label shown in the picker. */
  label: string;
  /** Full font-family string written to the theme (with fallbacks). */
  family: string;
  /** Bucket for grouping in the dropdown. */
  kind: FontKind;
  /** Google Fonts CSS2 link href. `null` = system font, no load. */
  googleHref: string | null;
}

export const DECK_FONTS: DeckFont[] = [
  // System
  { label: 'System sans',   family: 'system-ui, -apple-system, "Segoe UI", sans-serif', kind: 'sans',   googleHref: null },
  { label: 'System serif',  family: 'ui-serif, Georgia, "Times New Roman", serif',     kind: 'serif',  googleHref: null },
  { label: 'System mono',   family: 'ui-monospace, "SF Mono", Menlo, monospace',        kind: 'mono',   googleHref: null },

  // Sans (Google)
  { label: 'Inter',         family: '"Inter", system-ui, sans-serif',         kind: 'sans',   googleHref: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap' },
  { label: 'Manrope',       family: '"Manrope", system-ui, sans-serif',       kind: 'sans',   googleHref: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap' },
  { label: 'Plus Jakarta',  family: '"Plus Jakarta Sans", system-ui, sans-serif', kind: 'sans', googleHref: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap' },
  { label: 'DM Sans',       family: '"DM Sans", system-ui, sans-serif',       kind: 'sans',   googleHref: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap' },
  { label: 'Space Grotesk', family: '"Space Grotesk", system-ui, sans-serif', kind: 'sans',   googleHref: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap' },
  { label: 'Outfit',        family: '"Outfit", system-ui, sans-serif',        kind: 'sans',   googleHref: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap' },

  // Serif (Google)
  { label: 'Playfair',      family: '"Playfair Display", Georgia, serif',     kind: 'serif',  googleHref: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap' },
  { label: 'Fraunces',      family: '"Fraunces", Georgia, serif',             kind: 'serif',  googleHref: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700;800;900&display=swap' },
  { label: 'Cormorant',     family: '"Cormorant Garamond", Georgia, serif',   kind: 'serif',  googleHref: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap' },
  { label: 'Lora',          family: '"Lora", Georgia, serif',                 kind: 'serif',  googleHref: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },

  // Display (Google)
  { label: 'Bricolage',     family: '"Bricolage Grotesque", system-ui, sans-serif', kind: 'display', googleHref: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&display=swap' },
  { label: 'Unbounded',     family: '"Unbounded", system-ui, sans-serif',     kind: 'display', googleHref: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;600;700;800;900&display=swap' },
  { label: 'Syne',          family: '"Syne", system-ui, sans-serif',          kind: 'display', googleHref: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap' },

  // Arabic (Google) — important for the Uniex deck which is RTL Arabic
  { label: 'Cairo',         family: '"Cairo", system-ui, sans-serif',         kind: 'arabic', googleHref: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap' },
  { label: 'IBM Plex Arabic', family: '"IBM Plex Sans Arabic", system-ui, sans-serif', kind: 'arabic', googleHref: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap' },
  { label: 'Tajawal',       family: '"Tajawal", system-ui, sans-serif',       kind: 'arabic', googleHref: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap' },
  { label: 'Rubik',         family: '"Rubik", system-ui, sans-serif',         kind: 'arabic', googleHref: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap' },
  { label: 'Almarai',       family: '"Almarai", system-ui, sans-serif',       kind: 'arabic', googleHref: 'https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap' },

  // Mono (Google)
  { label: 'JetBrains Mono', family: '"JetBrains Mono", ui-monospace, monospace', kind: 'mono', googleHref: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
];

const KIND_ORDER: FontKind[] = ['arabic', 'sans', 'serif', 'display', 'mono'];

export function groupedDeckFonts(): Array<{ kind: FontKind; fonts: DeckFont[] }> {
  return KIND_ORDER.map((kind) => ({
    kind,
    fonts: DECK_FONTS.filter((f) => f.kind === kind),
  }));
}

const KIND_LABEL: Record<FontKind, string> = {
  arabic:  'Arabic',
  sans:    'Sans-serif',
  serif:   'Serif',
  display: 'Display',
  mono:    'Monospace',
};

export function kindLabel(k: FontKind): string {
  return KIND_LABEL[k];
}

/**
 * Inject the Google Fonts <link> for a font family if not already
 * present on the page. Idempotent — safe to call on every change.
 * No-op for system fonts (`googleHref === null`) and on the server.
 */
export function ensureFontLoaded(family: string): void {
  if (typeof document === 'undefined') return;
  const entry = DECK_FONTS.find((f) => f.family === family);
  if (!entry || entry.googleHref === null) return;
  if (document.querySelector(`link[data-deck-font="${entry.label}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = entry.googleHref;
  link.setAttribute('data-deck-font', entry.label);
  document.head.appendChild(link);
}

/**
 * Find the catalog entry matching a given family string. Returns
 * `undefined` if the user-chosen family isn't one of ours (e.g.
 * inherited from brand typescale).
 */
export function findDeckFont(family: string | undefined): DeckFont | undefined {
  if (!family) return undefined;
  return DECK_FONTS.find((f) => f.family === family);
}
