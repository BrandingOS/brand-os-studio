import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FeelStyle, FeelPalette, OnboardingAsset, DefineAnswers,
  AiState, OnboardingFlow, CreateStep,
} from '../types';
import { SEED_STYLES } from '../utils/seedStyles';
import { generateSeedPalettes, generateOnePalette } from '../utils/seedPalettes';
import { reshuffle } from '../utils/shuffle';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';

function newSessionId(): string {
  return `onb-${crypto.randomUUID()}`;
}

const EMPTY_DEFINE: DefineAnswers = {
  name: '', description: '', audience: '', market: '', goals: '', values: '',
};

interface OnboardingState {
  sessionId: string;
  flow: OnboardingFlow | null;
  step: CreateStep;
  define: DefineAnswers;
  feel: {
    styles: FeelStyle[];
    selectedStyleId: string | null;
    palettes: FeelPalette[];
    selectedPaletteId: string | null;
  };
  assets: OnboardingAsset[];
  aiState: AiState;
  variations: GeneratedBrand[] | null;
  variationsError: string | null;
}

interface OnboardingActions {
  setFlow(f: OnboardingFlow): void;
  setStep(s: CreateStep): void;
  updateDefine(patch: Partial<DefineAnswers>): void;
  toggleStyleLock(id: string): void;
  selectStyle(id: string): void;
  togglePaletteLock(id: string): void;
  selectPalette(id: string): void;
  updatePaletteColors(id: string, colors: string[]): void;
  shuffle(target: 'all' | 'styles' | 'palettes'): void;
  addAsset(a: OnboardingAsset): void;
  removeAsset(id: string): void;
  updateAssetProgress(id: string, progress: number): void;
  markAssetDone(id: string, remotePath: string): void;
  markAssetError(id: string, msg: string): void;
  setAiState(s: AiState): void;
  setVariations(v: GeneratedBrand[] | null): void;
  setVariationsError(msg: string | null): void;
  reset(): void;
}

function initialState(): OnboardingState {
  return {
    sessionId: newSessionId(),
    flow: null,
    step: 1,
    define: { ...EMPTY_DEFINE },
    feel: {
      styles: SEED_STYLES.map(s => ({ ...s })),
      selectedStyleId: null,
      palettes: generateSeedPalettes(),
      selectedPaletteId: null,
    },
    assets: [],
    aiState: 'idle',
    variations: null,
    variationsError: null,
  };
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setFlow: (flow) => set({ flow }),
      setStep: (step) => set({ step }),
      updateDefine: (patch) => set({ define: { ...get().define, ...patch } }),

      toggleStyleLock: (id) => set({
        feel: { ...get().feel, styles: get().feel.styles.map(s => s.id === id ? { ...s, locked: !s.locked } : s) },
      }),
      selectStyle: (id) => set({ feel: { ...get().feel, selectedStyleId: id } }),

      togglePaletteLock: (id) => set({
        feel: { ...get().feel, palettes: get().feel.palettes.map(p => p.id === id ? { ...p, locked: !p.locked } : p) },
      }),
      selectPalette: (id) => set({ feel: { ...get().feel, selectedPaletteId: id } }),

      updatePaletteColors: (id, colors) => {
        const safeColors = [...colors.slice(0, 5)] as [string, string, string, string, string];
        while (safeColors.length < 5) safeColors.push(colors[colors.length - 1] ?? '#000000');
        set({
          feel: {
            ...get().feel,
            palettes: get().feel.palettes.map(p => p.id === id ? { ...p, colors: safeColors, isCustom: true } : p),
          },
        });
      },

      shuffle: (target) => {
        const { feel } = get();
        if (target === 'styles' || target === 'all') {
          const pool = SEED_STYLES.filter(s => !feel.styles.some(fs => fs.locked && fs.id === s.id));
          let idx = 0;
          const styles = reshuffle(feel.styles, () => {
            const pick = pool[idx++ % pool.length];
            return { ...pick, locked: false };
          });
          set({ feel: { ...get().feel, styles } });
        }
        if (target === 'palettes' || target === 'all') {
          const palettes = reshuffle(get().feel.palettes, () => generateOnePalette()) as FeelPalette[];
          set({ feel: { ...get().feel, palettes } });
        }
      },

      addAsset: (a) => set({ assets: [...get().assets, a] }),
      removeAsset: (id) => set({ assets: get().assets.filter(a => a.id !== id) }),
      updateAssetProgress: (id, progress) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadProgress: progress, uploadStatus: 'uploading' } : a),
      }),
      markAssetDone: (id, remotePath) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadProgress: 1, uploadStatus: 'done', remotePath } : a),
      }),
      markAssetError: (id, msg) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadStatus: 'error', errorMessage: msg } : a),
      }),

      setAiState: (aiState) => set({ aiState }),
      setVariations: (variations) => set({ variations }),
      setVariationsError: (variationsError) => set({ variationsError }),

      reset: () => set(initialState()),
    }),
    {
      name: 'brandos-onboarding-v3',
      partialize: (s) => ({
        sessionId: s.sessionId,
        flow: s.flow,
        step: s.step,
        define: s.define,
        feel: s.feel,
      }),
    },
  ),
);
