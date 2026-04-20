import { create } from 'zustand';
import type { CreateStep, DefineAnswers, FeelPalette, OnboardingAsset, StyleCardState } from '../types';
import { STYLE_CARDS, poolForCard } from '../data/styleCards';
import { initialPalettes } from '../data/seedPalettes';

interface V4State {
  step: CreateStep;
  define: DefineAnswers;
  assets: OnboardingAsset[];
  styleCards: StyleCardState[];
  palettes: FeelPalette[];
  selectedPaletteId: string | null;
  editingPaletteId: string | null;
}

interface V4Actions {
  setStep(s: CreateStep): void;
  updateDefine(patch: Partial<DefineAnswers>): void;
  addAsset(a: OnboardingAsset): void;
  updateAssetProgress(id: string, pct: number): void;
  markAssetDone(id: string, previewUrl?: string | null): void;
  removeAsset(id: string): void;
  clearAssets(): void;
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
  define: { name: '', description: '' },
  assets: [],
  styleCards: initialStyleCards(),
  palettes: initialPalettes(),
  selectedPaletteId: null,
  editingPaletteId: null,
};

export const useV4Store = create<V4State & V4Actions>((set, get) => ({
  ...initial,

  setStep: (step) => set({ step }),
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
  removeAsset: (id) => set({ assets: get().assets.filter((a) => a.id !== id) }),
  clearAssets: () => set({ assets: [] }),

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

  reset: () => set({ ...initial, styleCards: initialStyleCards(), palettes: initialPalettes() }),
}));
