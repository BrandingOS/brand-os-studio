/**
 * Shared Presentation Settings
 *
 * Centralized types for any slide-based presentation in BrandOS:
 * brand guidelines, logo presentations, social media decks, etc.
 *
 * Each presentation type reuses these settings so that customization
 * (size, spacing, header/footer, language) is consistent across the platform.
 */

// ── Size ────────────────────────────────────────────────

export type SizeFormat = '16:9' | '9:16' | 'A4' | 'Letter' | 'Square' | 'Custom';

export const SIZE_PRESETS: Record<SizeFormat, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  'A4': { width: 2480, height: 3508 },
  'Letter': { width: 2550, height: 3300 },
  'Square': { width: 1080, height: 1080 },
  'Custom': { width: 1920, height: 1080 },
};

// ── Settings ────────────────────────────────────────────

export interface PresentationSettings {
  template: string;
  size: {
    format: SizeFormat;
    width: number;
    height: number;
  };
  language: {
    direction: 'ltr' | 'rtl';
    primary: string;
  };
  spacing: {
    padding: number;
    margins: number;
    cornerRadius: number;
  };
  header: {
    enabled: boolean;
    showDate: boolean;
    showProjectName: boolean;
    customText?: string;
  };
  footer: {
    enabled: boolean;
    showPageNumbers: boolean;
    customText?: string;
  };
}

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  template: 'minimal',
  size: { format: '16:9', width: 1920, height: 1080 },
  language: { direction: 'ltr', primary: 'English' },
  spacing: { padding: 60, margins: 40, cornerRadius: 8 },
  header: { enabled: true, showDate: true, showProjectName: true },
  footer: { enabled: true, showPageNumbers: true },
};

// ── Template ────────────────────────────────────────────

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  preview?: string;
  category?: string;
}

// ── Store Actions (interface for consumers) ─────────────

export interface PresentationSettingsActions {
  updateSettings: (settings: Partial<PresentationSettings>) => void;
  setTemplate: (templateId: string) => void;
  setSizeFormat: (format: SizeFormat) => void;
  setCustomSize: (width: number, height: number) => void;
  setLanguageDirection: (direction: 'ltr' | 'rtl') => void;
  updateSpacing: (spacing: Partial<PresentationSettings['spacing']>) => void;
  updateHeader: (header: Partial<PresentationSettings['header']>) => void;
  updateFooter: (footer: Partial<PresentationSettings['footer']>) => void;
  resetSettings: () => void;
}
