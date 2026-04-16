import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Brief, BrandKit, CreationMode, LogoConcept } from './types';

type Screen = 1 | 2 | 3 | 4 | 5 | 6;

interface LogoMakerState {
  currentScreen: Screen;
  mode: CreationMode | null;
  brief: Brief;
  concepts: LogoConcept[];
  selectedConceptId: string | null;
  generationJobId: string | null;
  editedSVG: string | null;
  brandKit: BrandKit | null;
  brandId: string | null;

  setScreen: (screen: Screen) => void;
  setMode: (mode: CreationMode) => void;
  updateBrief: (updates: Partial<Brief>) => void;
  setConcepts: (concepts: LogoConcept[]) => void;
  selectConcept: (id: string) => void;
  setEditedSVG: (svg: string) => void;
  setBrandKit: (kit: BrandKit) => void;
  reset: () => void;
}

const INITIAL_BRIEF: Brief = {
  name: '',
  tagline: '',
  description: '',
  industry: null,
  vibes: [],
};

const INITIAL_STATE = {
  currentScreen: 1 as Screen,
  mode: null,
  brief: INITIAL_BRIEF,
  concepts: [],
  selectedConceptId: null,
  generationJobId: null,
  editedSVG: null,
  brandKit: null,
  brandId: null,
};

export const useLogoMakerStore = create<LogoMakerState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setScreen: (screen) => set({ currentScreen: screen }),
      setMode: (mode) => set({ mode }),
      updateBrief: (updates) => set((s) => ({ brief: { ...s.brief, ...updates } })),
      setConcepts: (concepts) => set({ concepts }),
      selectConcept: (id) => set({ selectedConceptId: id }),
      setEditedSVG: (svg) => set({ editedSVG: svg }),
      setBrandKit: (kit) => set({ brandKit: kit }),
      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'logo-maker-flow',
      partialize: (s) => ({
        mode: s.mode,
        brief: s.brief,
        concepts: s.concepts,
        selectedConceptId: s.selectedConceptId,
      }),
    },
  ),
);
