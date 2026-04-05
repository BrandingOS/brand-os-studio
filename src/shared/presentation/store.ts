/**
 * Presentation Store Factory
 *
 * Creates a Zustand store for any presentation type (guidelines, logo, etc.)
 * with shared settings actions. Each presentation creates its own store instance
 * so settings are persisted independently.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { PresentationSettings, PresentationSettingsActions, SizeFormat } from './types';
import { DEFAULT_PRESENTATION_SETTINGS, SIZE_PRESETS } from './types';

export interface PresentationStore extends PresentationSettingsActions {
  settings: PresentationSettings;
}

/**
 * Creates a new Zustand store for presentation settings.
 *
 * @param storeName — Unique key for persistence (e.g. 'logo-presentation-settings')
 * @param defaults  — Override default settings per presentation type
 */
export function createPresentationStore(
  storeName: string,
  defaults?: Partial<PresentationSettings>,
) {
  const initialSettings: PresentationSettings = {
    ...DEFAULT_PRESENTATION_SETTINGS,
    ...defaults,
    size: { ...DEFAULT_PRESENTATION_SETTINGS.size, ...defaults?.size },
    language: { ...DEFAULT_PRESENTATION_SETTINGS.language, ...defaults?.language },
    spacing: { ...DEFAULT_PRESENTATION_SETTINGS.spacing, ...defaults?.spacing },
    header: { ...DEFAULT_PRESENTATION_SETTINGS.header, ...defaults?.header },
    footer: { ...DEFAULT_PRESENTATION_SETTINGS.footer, ...defaults?.footer },
  };

  return create<PresentationStore>()(
    devtools(
      persist(
        (set) => ({
          settings: initialSettings,

          updateSettings: (newSettings) =>
            set(
              (state) => ({ settings: { ...state.settings, ...newSettings } }),
              false,
              'updateSettings',
            ),

          setTemplate: (templateId) =>
            set(
              (state) => ({ settings: { ...state.settings, template: templateId } }),
              false,
              'setTemplate',
            ),

          setSizeFormat: (format: SizeFormat) => {
            const dimensions = SIZE_PRESETS[format];
            set(
              (state) => ({
                settings: { ...state.settings, size: { format, ...dimensions } },
              }),
              false,
              'setSizeFormat',
            );
          },

          setCustomSize: (width: number, height: number) =>
            set(
              (state) => ({
                settings: {
                  ...state.settings,
                  size: { format: 'Custom' as SizeFormat, width, height },
                },
              }),
              false,
              'setCustomSize',
            ),

          setLanguageDirection: (direction) =>
            set(
              (state) => ({
                settings: {
                  ...state.settings,
                  language: { ...state.settings.language, direction },
                },
              }),
              false,
              'setLanguageDirection',
            ),

          updateSpacing: (spacing) =>
            set(
              (state) => ({
                settings: {
                  ...state.settings,
                  spacing: { ...state.settings.spacing, ...spacing },
                },
              }),
              false,
              'updateSpacing',
            ),

          updateHeader: (header) =>
            set(
              (state) => ({
                settings: {
                  ...state.settings,
                  header: { ...state.settings.header, ...header },
                },
              }),
              false,
              'updateHeader',
            ),

          updateFooter: (footer) =>
            set(
              (state) => ({
                settings: {
                  ...state.settings,
                  footer: { ...state.settings.footer, ...footer },
                },
              }),
              false,
              'updateFooter',
            ),

          resetSettings: () =>
            set({ settings: initialSettings }, false, 'resetSettings'),
        }),
        {
          name: storeName,
          partialize: (state) => ({ settings: state.settings }),
        },
      ),
      { name: storeName },
    ),
  );
}
