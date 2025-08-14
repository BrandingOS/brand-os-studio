import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GuidelineSettings, GuidelineSlide, GuidelinePanel } from '../types/guidelines';
import { DEFAULT_GUIDELINE_SETTINGS } from '../types/guidelines';

interface GuidelinesStore {
  // Settings
  settings: GuidelineSettings;
  
  // Slides
  slides: GuidelineSlide[];
  currentSlide: number;
  
  // Panels
  panels: GuidelinePanel[];
  activePanel: string;
  
  // Loading states
  isLoading: boolean;
  error?: string;
  
  // Actions
  updateSettings: (settings: Partial<GuidelineSettings>) => void;
  setTemplate: (templateId: string) => void;
  setSizeFormat: (format: GuidelineSettings['size']['format']) => void;
  setLanguageDirection: (direction: 'ltr' | 'rtl') => void;
  updateSpacing: (spacing: Partial<GuidelineSettings['spacing']>) => void;
  updateHeader: (header: Partial<GuidelineSettings['header']>) => void;
  updateFooter: (footer: Partial<GuidelineSettings['footer']>) => void;
  
  // Slide actions
  setCurrentSlide: (index: number) => void;
  addSlide: (slide: GuidelineSlide) => void;
  removeSlide: (slideId: string) => void;
  updateSlide: (slideId: string, updates: Partial<GuidelineSlide>) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  
  // Panel actions
  setActivePanel: (panelId: string) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  resetSettings: () => void;
}

export const useGuidelinesStore = create<GuidelinesStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: DEFAULT_GUIDELINE_SETTINGS,
        slides: [],
        currentSlide: 0,
        panels: [
          { id: 'customize', name: 'Guideline Customize', icon: 'Settings', active: true },
          { id: 'edit', name: 'Edit Each Slide Data', icon: 'Edit', active: false },
          { id: 'add', name: 'Add Section', icon: 'Plus', active: false },
        ],
        activePanel: 'customize',
        isLoading: false,
        error: undefined,

        // Settings actions
        updateSettings: (newSettings) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }), false, 'updateSettings');
        },

        setTemplate: (templateId) => {
          set((state) => ({
            settings: { ...state.settings, template: templateId },
          }), false, 'setTemplate');
        },

        setSizeFormat: (format) => {
          const { SIZE_PRESETS } = require('../types/guidelines');
          const dimensions = SIZE_PRESETS[format];
          
          set((state) => ({
            settings: {
              ...state.settings,
              size: { format, ...dimensions },
            },
          }), false, 'setSizeFormat');
        },

        setLanguageDirection: (direction) => {
          set((state) => ({
            settings: {
              ...state.settings,
              language: { ...state.settings.language, direction },
            },
          }), false, 'setLanguageDirection');
        },

        updateSpacing: (spacing) => {
          set((state) => ({
            settings: {
              ...state.settings,
              spacing: { ...state.settings.spacing, ...spacing },
            },
          }), false, 'updateSpacing');
        },

        updateHeader: (header) => {
          set((state) => ({
            settings: {
              ...state.settings,
              header: { ...state.settings.header, ...header },
            },
          }), false, 'updateHeader');
        },

        updateFooter: (footer) => {
          set((state) => ({
            settings: {
              ...state.settings,
              footer: { ...state.settings.footer, ...footer },
            },
          }), false, 'updateFooter');
        },

        // Slide actions
        setCurrentSlide: (index) => {
          set({ currentSlide: index }, false, 'setCurrentSlide');
        },

        addSlide: (slide) => {
          set((state) => ({
            slides: [...state.slides, slide],
          }), false, 'addSlide');
        },

        removeSlide: (slideId) => {
          set((state) => ({
            slides: state.slides.filter(slide => slide.id !== slideId),
          }), false, 'removeSlide');
        },

        updateSlide: (slideId, updates) => {
          set((state) => ({
            slides: state.slides.map(slide =>
              slide.id === slideId ? { ...slide, ...updates } : slide
            ),
          }), false, 'updateSlide');
        },

        reorderSlides: (fromIndex, toIndex) => {
          set((state) => {
            const newSlides = [...state.slides];
            const [removed] = newSlides.splice(fromIndex, 1);
            newSlides.splice(toIndex, 0, removed);
            return { slides: newSlides };
          }), false, 'reorderSlides');
        },

        // Panel actions
        setActivePanel: (panelId) => {
          set((state) => ({
            activePanel: panelId,
            panels: state.panels.map(panel => ({
              ...panel,
              active: panel.id === panelId,
            })),
          }), false, 'setActivePanel');
        },

        // Utility actions
        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        resetSettings: () => {
          set({ settings: DEFAULT_GUIDELINE_SETTINGS }, false, 'resetSettings');
        },
      }),
      {
        name: 'guidelines-store',
        partialize: (state) => ({
          settings: state.settings,
          activePanel: state.activePanel,
        }),
      }
    ),
    { name: 'guidelines-store' }
  )
);