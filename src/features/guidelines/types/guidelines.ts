import type { PresentationSettings, PresentationTemplate, SizeFormat } from '@/shared/presentation/types';
import { SIZE_PRESETS as SHARED_SIZE_PRESETS, DEFAULT_PRESENTATION_SETTINGS } from '@/shared/presentation/types';

export interface GuidelineTemplate extends PresentationTemplate {
  preview: string;
  category: 'minimal' | 'corporate' | 'creative' | 'modern' | 'Creative' | 'Professional';
}

/**
 * GuidelineSettings is now an alias for the shared PresentationSettings.
 * All presentation types in BrandingOS share the same settings structure.
 */
export type GuidelineSettings = PresentationSettings;

export type { SizeFormat };

export interface GuidelineSlide {
  id: string;
  type: 'cover' | 'strategy' | 'logos' | 'colors' | 'typography' | 'voice' | 'iconography' | 'social' | 'stationery' | 'applications' | 'language';
  title: string;
  content: any;
  order: number;
  enabled: boolean;
}

export interface GuidelinePanel {
  id: 'customize' | 'edit' | 'add';
  name: string;
  icon: string;
  active: boolean;
}

export const DEFAULT_GUIDELINE_SETTINGS: GuidelineSettings = {
  ...DEFAULT_PRESENTATION_SETTINGS,
  template: 'minimal',
};

/** Re-export shared SIZE_PRESETS for backward compatibility */
export const SIZE_PRESETS = SHARED_SIZE_PRESETS;