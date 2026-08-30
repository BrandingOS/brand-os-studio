import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { hexToName } from '@/features/setup/data/colorNames';
import {
  shuffleColorScheme,
  shuffleFontPairing,
  shuffleUIStyle,
  shuffleEverything,
  generateNeutrals,
} from '../engine/shuffle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandBoardDraft {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutrals: string[];
    /**
     * What each neutral is CALLED, when the brand owns them.
     *
     * The board is the one artefact whose job is to state the palette, so a
     * neutral the brand chose is printed under its own name rather than as
     * `N0`. Absent (a generated ramp, a shuffle) means the board falls back
     * to the positional label.
     */
    neutralNames?: string[];
    background: string;
    foreground: string;
  };
  typography: {
    heading: string;
    body: string;
    weight: 'light' | 'regular' | 'bold';
  };
  uiStyle: {
    borderRadius: number;
    shadowIntensity: 'none' | 'subtle' | 'medium' | 'bold';
    spacing: 'compact' | 'comfortable' | 'spacious';
  };
  logo?: string;
  brandName: string;
}

export interface BrandBoardConcept {
  name: string;
  draft: BrandBoardDraft;
}

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'neutrals';

export interface BrandBoardState {
  /** Brand id the current draft was built from; null before any init. */
  initializedForBrandId: string | null;
  draft: BrandBoardDraft;
  concepts: BrandBoardConcept[];
  activeConcept: number;
  history: BrandBoardDraft[];
  future: BrandBoardDraft[];
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  previewTemplate: 'saas' | 'portfolio' | 'ecommerce';
  darkMode: boolean;
  /** Per-role locks. A locked role is skipped by the Shuffle action so the
   *  user can iterate on the rest of the palette without losing a color
   *  they want to keep. */
  lockedColors: Record<ColorRole, boolean>;

  // Color actions
  setColor: (role: 'primary' | 'secondary' | 'accent', hex: string) => void;
  setNeutrals: (neutrals: string[]) => void;
  addColor: (hex: string) => void;
  toggleColorLock: (role: ColorRole) => void;

  // Typography actions
  setFont: (slot: 'heading' | 'body', family: string) => void;
  setWeight: (weight: 'light' | 'regular' | 'bold') => void;

  // UI Style actions
  setBorderRadius: (px: number) => void;
  setShadowIntensity: (v: 'none' | 'subtle' | 'medium' | 'bold') => void;
  setSpacing: (v: 'compact' | 'comfortable' | 'spacious') => void;

  // Shuffle
  shuffleColors: () => void;
  shuffleTypography: () => void;
  shuffleUI: () => void;
  shuffleAll: () => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Concepts
  saveConcept: (name?: string) => void;
  loadConcept: (index: number) => void;
  deleteConcept: (index: number) => void;

  // Preview
  setPreviewDevice: (d: 'desktop' | 'tablet' | 'mobile') => void;
  setPreviewTemplate: (t: 'saas' | 'portfolio' | 'ecommerce') => void;
  toggleDarkMode: () => void;

  // Init/Save
  initFromBrand: (brand: any) => void;
  /**
   * Init only if this brand's draft is not already loaded.
   *
   * `initFromBrand` is a destructive `set` — it replaces the draft AND
   * clears undo history. That is right when the board is deliberately
   * (re)opened on a brand, and wrong every other time: the draft lives in
   * memory only, so a second surface mounting on the same brand would
   * throw away edits the user has not saved back yet. Callers that merely
   * need "a draft for this brand to exist" must use this.
   */
  ensureInitFromBrand: (brand: any) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const MAX_HISTORY = 50;

const DEFAULT_DRAFT: BrandBoardDraft = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#f59e0b',
    neutrals: ['#f7f7f8', '#ebebed', '#d1d1d6', '#9e9ea7', '#6b6b76', '#2e2e35'],
    background: '#ffffff',
    foreground: '#0a0a0f',
  },
  typography: {
    heading: 'Inter',
    body: 'Inter',
    weight: 'regular',
  },
  uiStyle: {
    borderRadius: 8,
    shadowIntensity: 'medium',
    spacing: 'comfortable',
  },
  brandName: 'Untitled Brand',
};

// ---------------------------------------------------------------------------
// HSL helper (duplicated locally to avoid circular dep issues at import time)
// ---------------------------------------------------------------------------

function hexToHue(hex: string): number {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max === min) return 0;

  let h = 0;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return h * 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => {
    const val = Math.round((v + m) * 255).toString(16);
    return val.length === 1 ? '0' + val : val;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// The brand's own palette
// ---------------------------------------------------------------------------

/** `#abc` / `ABCDEF` → `#abcdef`, or null when it is not a colour. */
function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (!m) return null;
  const body = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return `#${body.toUpperCase()}`;
}

/**
 * The accent the BRAND declared, in the order the rest of the app reads it.
 *
 * `brandToMockBrand` reads `accentColor` then `colorSystem.accent.hex`; the
 * guidelines palette is the third place because a seed brand carries its
 * accent there and `migrateBrandToCurrent` is what hydrates the other two —
 * a board handed a raw record would otherwise invent one.
 */
export function brandAccentOf(brand: any): string | null {
  return (
    normalizeHex(brand?.accentColor) ??
    normalizeHex(brand?.colorSystem?.accent?.hex) ??
    normalizeHex(brand?.guidelines?.colorPalette?.accent?.hex)
  );
}

/** 0 (black) → 1 (white). Perceptual enough to sort a neutral ladder by. */
function toneOf(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * The neutrals the BRAND declared, named the way the Brand Kit names them,
 * ordered LIGHTEST FIRST.
 *
 * `hexToName` rather than the stored name for the same reason
 * `brandToMockBrand` uses it: one source of truth for what a swatch is
 * called, so "Pearl" on the Colors card is "Pearl" on the board.
 *
 * The order is not cosmetic. `BrandBoardCanvas` reads these six as a
 * LADDER — `--bb-neutral-50` is the page's own surface and `--bb-neutral-500`
 * is muted text — so a brand that happens to list its neutrals darkest-first
 * (SKAM does: black, jet, grey, white) would paint the typography panel
 * black and its text on top of it in near-black. Measured on the export,
 * which is exactly what happened the first time this read the brand's own
 * values.
 */
export function brandNeutralsOf(brand: any): Array<{ hex: string; name: string }> {
  const sources = [
    ...(Array.isArray(brand?.colorSystem?.neutrals) ? brand.colorSystem.neutrals : []),
    ...(Array.isArray(brand?.guidelines?.colorPalette?.neutral)
      ? brand.guidelines.colorPalette.neutral
      : []),
    ...(Array.isArray(brand?.neutrals) ? brand.neutrals : []),
  ];
  const out: Array<{ hex: string; name: string }> = [];
  const seen = new Set<string>();
  for (const entry of sources) {
    const hex = normalizeHex(typeof entry === 'string' ? entry : entry?.hex);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    // Two near-identical greys resolve to one word; a palette that prints
    // "Grey" twice reads as a mistake, so the second is "Grey 2" — the same
    // rule `brandToMockBrand` applies to the Colors card.
    const base = hexToName(hex);
    let name = base;
    let n = 2;
    while (out.some((c) => c.name === name)) {
      name = `${base} ${n}`;
      n += 1;
    }
    out.push({ hex, name });
    if (out.length === 6) break;
  }
  return out.sort((a, b) => toneOf(b.hex) - toneOf(a.hex));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBrandBoardStore = create<BrandBoardState>()(
  devtools(
    (set, get) => ({
      initializedForBrandId: null,
      draft: { ...DEFAULT_DRAFT },
      concepts: [],
      activeConcept: -1,
      history: [],
      future: [],
      previewDevice: 'desktop',
      previewTemplate: 'saas',
      darkMode: false,
      lockedColors: { primary: false, secondary: false, accent: false, neutrals: false },

      // ------------------------------------------------------------------
      // History helpers
      // ------------------------------------------------------------------

      pushHistory: () => {
        const { draft, history } = get();
        const trimmed =
          history.length >= MAX_HISTORY ? history.slice(1) : [...history];
        trimmed.push(structuredClone(draft));
        set({ history: trimmed, future: [] });
      },

      undo: () => {
        const { history, draft, future } = get();
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        set({
          draft: prev,
          history: history.slice(0, -1),
          future: [structuredClone(draft), ...future],
        });
      },

      redo: () => {
        const { future, draft, history } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({
          draft: next,
          future: future.slice(1),
          history: [...history, structuredClone(draft)],
        });
      },

      // ------------------------------------------------------------------
      // Color actions
      // ------------------------------------------------------------------

      setColor: (role, hex) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            colors: { ...state.draft.colors, [role]: hex },
          },
        }));
      },

      setNeutrals: (neutrals) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            colors: { ...state.draft.colors, neutrals, neutralNames: undefined },
          },
        }));
      },

      addColor: (hex) => {
        // Round-robin: each `+` click writes into the next unlocked slot
        // (secondary → accent → secondary …). Locked slots are skipped so
        // the user's pinned colors stay untouched. Falls back to accent
        // if everything non-primary is locked.
        get().pushHistory();
        const { lockedColors } = get();
        set((state) => {
          const next = { ...state.draft.colors };
          const candidates: Array<keyof typeof next> = ['secondary', 'accent'];
          const available = candidates.filter((c) => !lockedColors[c as ColorRole]);
          const slot =
            available.length > 0
              ? available[state.history.length % available.length]
              : 'accent';
          next[slot] = hex;
          return { draft: { ...state.draft, colors: next } };
        });
      },

      toggleColorLock: (role) =>
        set((state) => ({
          lockedColors: { ...state.lockedColors, [role]: !state.lockedColors[role] },
        }), false, 'toggleColorLock'),

      // ------------------------------------------------------------------
      // Typography actions
      // ------------------------------------------------------------------

      setFont: (slot, family) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            typography: { ...state.draft.typography, [slot]: family },
          },
        }));
      },

      setWeight: (weight) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            typography: { ...state.draft.typography, weight },
          },
        }));
      },

      // ------------------------------------------------------------------
      // UI Style actions
      // ------------------------------------------------------------------

      setBorderRadius: (px) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            uiStyle: { ...state.draft.uiStyle, borderRadius: px },
          },
        }));
      },

      setShadowIntensity: (v) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            uiStyle: { ...state.draft.uiStyle, shadowIntensity: v },
          },
        }));
      },

      setSpacing: (v) => {
        get().pushHistory();
        set((state) => ({
          draft: {
            ...state.draft,
            uiStyle: { ...state.draft.uiStyle, spacing: v },
          },
        }));
      },

      // ------------------------------------------------------------------
      // Shuffle actions
      // ------------------------------------------------------------------

      shuffleColors: () => {
        get().pushHistory();
        const { draft, lockedColors } = get();
        const scheme = shuffleColorScheme(draft.colors.primary);
        set((state) => ({
          draft: {
            ...state.draft,
            colors: {
              ...state.draft.colors,
              primary:   lockedColors.primary   ? state.draft.colors.primary   : scheme.primary,
              secondary: lockedColors.secondary ? state.draft.colors.secondary : scheme.secondary,
              accent:    lockedColors.accent    ? state.draft.colors.accent    : scheme.accent,
              neutrals:  lockedColors.neutrals  ? state.draft.colors.neutrals  : scheme.neutrals,
              // A generated ramp has no names. Keeping the brand's would
              // label somebody else's greys with the brand's own words.
              neutralNames: lockedColors.neutrals ? state.draft.colors.neutralNames : undefined,
            },
          },
        }));
      },

      shuffleTypography: () => {
        get().pushHistory();
        const pairing = shuffleFontPairing();
        set((state) => ({
          draft: {
            ...state.draft,
            typography: {
              ...state.draft.typography,
              heading: pairing.heading,
              body: pairing.body,
            },
          },
        }));
      },

      shuffleUI: () => {
        get().pushHistory();
        const preset = shuffleUIStyle();
        set((state) => ({
          draft: {
            ...state.draft,
            uiStyle: {
              borderRadius: preset.borderRadius,
              shadowIntensity: preset.shadowIntensity as BrandBoardDraft['uiStyle']['shadowIntensity'],
              spacing: preset.spacing as BrandBoardDraft['uiStyle']['spacing'],
            },
          },
        }));
      },

      shuffleAll: () => {
        get().pushHistory();
        const { draft, lockedColors } = get();
        const result = shuffleEverything(draft.colors.primary);
        set((state) => ({
          draft: {
            ...state.draft,
            colors: {
              ...state.draft.colors,
              primary:   lockedColors.primary   ? state.draft.colors.primary   : result.colors.primary,
              secondary: lockedColors.secondary ? state.draft.colors.secondary : result.colors.secondary,
              accent:    lockedColors.accent    ? state.draft.colors.accent    : result.colors.accent,
              neutrals:  lockedColors.neutrals  ? state.draft.colors.neutrals  : result.colors.neutrals,
              neutralNames: lockedColors.neutrals ? state.draft.colors.neutralNames : undefined,
            },
            typography: {
              ...state.draft.typography,
              heading: result.typography.heading,
              body: result.typography.body,
            },
            uiStyle: {
              borderRadius: result.uiStyle.borderRadius,
              shadowIntensity: result.uiStyle.shadowIntensity as BrandBoardDraft['uiStyle']['shadowIntensity'],
              spacing: result.uiStyle.spacing as BrandBoardDraft['uiStyle']['spacing'],
            },
          },
        }));
      },

      // ------------------------------------------------------------------
      // Concepts
      // ------------------------------------------------------------------

      saveConcept: (name?) => {
        const { draft, concepts } = get();
        const conceptName =
          name ?? `Concept ${concepts.length + 1}`;
        set({
          concepts: [
            ...concepts,
            { name: conceptName, draft: structuredClone(draft) },
          ],
          activeConcept: concepts.length,
        });
      },

      loadConcept: (index) => {
        const { concepts } = get();
        if (index < 0 || index >= concepts.length) return;
        get().pushHistory();
        set({
          draft: structuredClone(concepts[index].draft),
          activeConcept: index,
        });
      },

      deleteConcept: (index) => {
        const { concepts, activeConcept } = get();
        if (index < 0 || index >= concepts.length) return;
        const updated = concepts.filter((_, i) => i !== index);
        set({
          concepts: updated,
          activeConcept:
            activeConcept === index
              ? -1
              : activeConcept > index
                ? activeConcept - 1
                : activeConcept,
        });
      },

      // ------------------------------------------------------------------
      // Preview controls
      // ------------------------------------------------------------------

      setPreviewDevice: (d) => set({ previewDevice: d }),
      setPreviewTemplate: (t) => set({ previewTemplate: t }),

      toggleDarkMode: () => {
        get().pushHistory();
        set((state) => {
          const isDark = !state.darkMode;
          return {
            darkMode: isDark,
            draft: {
              ...state.draft,
              colors: {
                ...state.draft.colors,
                background: isDark ? '#0a0a0f' : '#ffffff',
                foreground: isDark ? '#ffffff' : '#0a0a0f',
              },
            },
          };
        });
      },

      // ------------------------------------------------------------------
      // Init from brand
      // ------------------------------------------------------------------

      initFromBrand: (brand: any) => {
        const primaryColor = brand?.primaryColor ?? '#2563eb';
        const secondaryColor = brand?.secondaryColor ?? '#7c3aed';
        const headingFont = brand?.fonts?.primary ?? 'Inter';
        const bodyFont = brand?.fonts?.secondary ?? 'Inter';
        const brandName = brand?.name ?? 'Untitled Brand';
        const logo = brand?.logo;

        const hue = hexToHue(primaryColor);

        /*
         * THE BOARD STATES THE BRAND'S PALETTE, SO IT READS THE BRAND'S
         * PALETTE.
         *
         * It used to derive both of these instead: the accent was a triadic
         * rotation of the primary and the neutrals were a tinted ramp off
         * the same hue — so `deliverables/brand-board.png` printed ACCENT
         * `#D95F26` for a brand whose accent is `#F59E0B`, and six neutrals
         * `N0…N5` the brand had never chosen (QA Q12). The one artefact
         * whose whole job is to state the palette stated a different one.
         *
         * The brand's own answer is taken wherever it keeps it — the same
         * places `brandToMockBrand` reads, so the board and the Colors card
         * cannot disagree — and the derivation stays as the fallback for a
         * brand that genuinely has neither.
         */
        const accent = brandAccentOf(brand) ?? hslToHex(hue + 120, 0.7, 0.5);
        const own = brandNeutralsOf(brand);
        const neutrals: string[] = own.length >= 3 ? own.map((n) => n.hex) : generateNeutrals(hue);
        const neutralNames = own.length >= 3 ? own.map((n) => n.name) : undefined;

        const savedUi = brand?.uiStyle;

        set({
          initializedForBrandId: brand?.id ?? null,
          draft: {
            colors: {
              primary: primaryColor,
              secondary: secondaryColor,
              accent,
              neutrals,
              neutralNames,
              background: '#ffffff',
              foreground: '#0a0a0f',
            },
            typography: {
              heading: headingFont,
              body: bodyFont,
              weight: savedUi?.weight ?? 'regular',
            },
            uiStyle: {
              borderRadius: savedUi?.borderRadius ?? 8,
              shadowIntensity: savedUi?.shadowIntensity ?? 'medium',
              spacing: savedUi?.spacing ?? 'comfortable',
            },
            logo,
            brandName,
          },
          history: [],
          future: [],
          darkMode: false,
        });
      },

      ensureInitFromBrand: (brand: any) => {
        const id = brand?.id ?? null;
        // Already holding this brand's draft — leave it exactly as it is,
        // unsaved edits and undo history included.
        if (id !== null && get().initializedForBrandId === id) return;
        get().initFromBrand(brand);
      },
    }),
    { name: 'BrandBoardStore' },
  ),
);
