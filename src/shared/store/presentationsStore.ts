import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GuidelinePresentation, GuidelineSlide } from '@/shared/services/presentations.supabase';

interface PresentationsState {
  // Current presentation
  currentPresentation: GuidelinePresentation | null;
  slides: GuidelineSlide[];
  currentSlideIndex: number;
  
  // UI State
  isSidebarCollapsed: boolean;
  isPreviewMode: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  setCurrentPresentation: (presentation: GuidelinePresentation | null) => void;
  setSlides: (slides: GuidelineSlide[]) => void;
  setCurrentSlideIndex: (index: number) => void;
  addSlide: (slide: GuidelineSlide) => void;
  updateSlide: (slideId: string, updates: Partial<GuidelineSlide>) => void;
  removeSlide: (slideId: string) => void;
  reorderSlides: (slideIds: string[]) => void;
  
  // UI Actions
  toggleSidebar: () => void;
  setPreviewMode: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentPresentation: null,
  slides: [],
  currentSlideIndex: 0,
  isSidebarCollapsed: false,
  isPreviewMode: false,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const usePresentationsStore = create<PresentationsState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentPresentation: (presentation) =>
          set({ currentPresentation: presentation }),

        setSlides: (slides) =>
          set({ slides }),

        setCurrentSlideIndex: (index) =>
          set({ currentSlideIndex: index }),

        addSlide: (slide) =>
          set((state) => ({
            slides: [...state.slides, slide].sort((a, b) => a.order_index - b.order_index),
          })),

        updateSlide: (slideId, updates) =>
          set((state) => ({
            slides: state.slides.map((slide) =>
              slide.id === slideId ? { ...slide, ...updates } : slide
            ),
          })),

        removeSlide: (slideId) =>
          set((state) => ({
            slides: state.slides.filter((slide) => slide.id !== slideId),
          })),

        reorderSlides: (slideIds) =>
          set((state) => {
            const slideMap = new Map(state.slides.map((s) => [s.id, s]));
            const reordered = slideIds
              .map((id, index) => {
                const slide = slideMap.get(id);
                if (slide) {
                  return { ...slide, order_index: index };
                }
                return null;
              })
              .filter((s): s is GuidelineSlide => s !== null);
            
            return { slides: reordered };
          }),

        toggleSidebar: () =>
          set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

        setPreviewMode: (enabled) =>
          set({ isPreviewMode: enabled }),

        setLoading: (loading) =>
          set({ isLoading: loading }),

        setSaving: (saving) =>
          set({ isSaving: saving }),

        setError: (error) =>
          set({ error }),

        reset: () =>
          set(initialState),
      }),
      {
        name: 'presentations-store',
        partialize: (state) => ({
          isSidebarCollapsed: state.isSidebarCollapsed,
          isPreviewMode: state.isPreviewMode,
        }),
      }
    ),
    { name: 'PresentationsStore' }
  )
);
