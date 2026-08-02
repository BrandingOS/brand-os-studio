import { create } from 'zustand';
import type {
  AboutSection,
  CreateStep,
  DefineAnswers,
  FeelPalette,
  LogoSlot,
  OnboardingAsset,
  SetupPanel,
  StyleCardState,
} from '../types';
import { STYLE_CARDS, poolForCard } from '../data/styleCards';
import { initialPalettes } from '../data/seedPalettes';

interface V4State {
  step: CreateStep;
  setupPanel: SetupPanel;
  define: DefineAnswers;
  assets: OnboardingAsset[];
  aboutSections: AboutSection[];
  extraLogoSlots: LogoSlot[];
  styleCards: StyleCardState[];
  palettes: FeelPalette[];
  selectedPaletteId: string | null;
  editingPaletteId: string | null;
  /** Color asset the user tagged as the brand's primary. Null → first color wins. */
  primaryColorId: string | null;
}

interface V4Actions {
  setStep(s: CreateStep): void;
  setSetupPanel(p: SetupPanel): void;
  updateDefine(patch: Partial<DefineAnswers>): void;
  addAsset(a: OnboardingAsset): void;
  updateAssetProgress(id: string, pct: number): void;
  markAssetDone(id: string, previewUrl?: string | null): void;
  removeAsset(id: string): void;
  clearAssets(): void;
  renameAsset(id: string, name: string): void;
  toggleAssetLogo(id: string): void;
  updateAsset(id: string, patch: Partial<OnboardingAsset>): void;
  setPrimaryColor(id: string | null): void;
  addAboutSection(section: Omit<AboutSection, 'id'>): void;
  updateAboutSection(id: string, patch: Partial<AboutSection>): void;
  removeAboutSection(id: string): void;
  addLogoSlot(slot: LogoSlot): void;
  removeLogoSlot(slot: LogoSlot): void;
  toggleStyleLock(id: string): void;
  shuffleStyles(): void;
  selectPalette(id: string): void;
  togglePaletteLock(id: string): void;
  setEditingPalette(id: string | null): void;
  updatePaletteColors(id: string, colors: string[]): void;
  shufflePalettes(): void;
  reset(): void;
}

const initialStyleCards = (): StyleCardState[] =>
  STYLE_CARDS.map((def) => ({
    id: def.id,
    locked: false,
    fontIdx: Math.floor(Math.random() * poolForCard(def).length),
  }));

const initial: V4State = {
  step: 1,
  setupPanel: 1,
  define: { name: '', description: '' },
  assets: [],
  aboutSections: [],
  extraLogoSlots: [],
  styleCards: initialStyleCards(),
  palettes: initialPalettes(),
  selectedPaletteId: null,
  editingPaletteId: null,
  primaryColorId: null,
};

function genSectionId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? `s-${crypto.randomUUID()}`
    : `s-${Math.random().toString(36).slice(2, 11)}`;
}

export const useV4Store = create<V4State & V4Actions>((set, get) => ({
  ...initial,

  setStep: (step) => set({ step }),
  setSetupPanel: (setupPanel) => set({ setupPanel }),
  updateDefine: (patch) => set({ define: { ...get().define, ...patch } }),

  addAsset: (a) => set({ assets: [...get().assets, a] }),
  updateAssetProgress: (id, pct) =>
    set({
      assets: get().assets.map((a) =>
        a.id === id ? { ...a, uploadProgress: pct, uploadStatus: 'uploading' as const } : a
      ),
    }),
  markAssetDone: (id, previewUrl) =>
    set({
      assets: get().assets.map((a) =>
        a.id === id
          ? { ...a, uploadProgress: 1, uploadStatus: 'done' as const, previewUrl: previewUrl ?? a.previewUrl }
          : a
      ),
    }),
  removeAsset: (id) =>
    set({
      assets: get().assets.filter((a) => a.id !== id),
      // Don't leave the primary pointing at a deleted swatch.
      primaryColorId: get().primaryColorId === id ? null : get().primaryColorId,
    }),
  clearAssets: () => set({ assets: [], primaryColorId: null }),
  renameAsset: (id, name) =>
    set({
      assets: get().assets.map((a) => (a.id === id ? { ...a, name: name.trim() || a.name } : a)),
    }),
  toggleAssetLogo: (id) =>
    set({
      assets: get().assets.map((a) => (a.id === id ? { ...a, isLogo: !a.isLogo } : a)),
    }),
  updateAsset: (id, patch) =>
    set({
      assets: get().assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }),
  setPrimaryColor: (id) => set({ primaryColorId: get().primaryColorId === id ? null : id }),

  addAboutSection: (section) =>
    set({ aboutSections: [...get().aboutSections, { id: genSectionId(), ...section }] }),
  updateAboutSection: (id, patch) =>
    set({
      aboutSections: get().aboutSections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }),
  removeAboutSection: (id) =>
    set({ aboutSections: get().aboutSections.filter((s) => s.id !== id) }),
  addLogoSlot: (slot) => {
    const cur = get().extraLogoSlots;
    if (cur.includes(slot)) return;
    set({ extraLogoSlots: [...cur, slot] });
  },
  removeLogoSlot: (slot) => {
    const next = get().extraLogoSlots.filter((s) => s !== slot);
    // Drop any asset that was bound to this slot
    const cleanedAssets = get().assets.filter((a) => a.logoSlot !== slot);
    set({ extraLogoSlots: next, assets: cleanedAssets });
  },

  toggleStyleLock: (id) =>
    set({
      styleCards: get().styleCards.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)),
    }),
  shuffleStyles: () =>
    set({
      styleCards: get().styleCards.map((s) => {
        if (s.locked) return s;
        const def = STYLE_CARDS.find((d) => d.id === s.id);
        if (!def) return s;
        const pool = poolForCard(def);
        return { ...s, fontIdx: Math.floor(Math.random() * pool.length) };
      }),
    }),

  selectPalette: (id) =>
    set({ selectedPaletteId: id === get().selectedPaletteId ? null : id, editingPaletteId: null }),
  togglePaletteLock: (id) =>
    set({
      palettes: get().palettes.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p)),
    }),
  setEditingPalette: (id) => set({ editingPaletteId: id }),
  updatePaletteColors: (id, colors) =>
    set({
      palettes: get().palettes.map((p) => (p.id === id ? { ...p, colors, isCustom: true } : p)),
    }),
  shufflePalettes: () => {
    const pool = initialPalettes();
    set({
      palettes: get().palettes.map((p, i) => {
        if (p.locked) return p;
        const pick = pool[(i + Math.floor(Math.random() * pool.length)) % pool.length];
        return { ...pick, id: p.id, locked: false };
      }),
    });
  },

  reset: () =>
    set({ ...initial, styleCards: initialStyleCards(), palettes: initialPalettes(), primaryColorId: null }),
}));
