export interface GuidelineTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'minimal' | 'corporate' | 'creative' | 'modern';
}

export interface GuidelineSettings {
  template: string;
  size: {
    format: '16:9' | '9:16' | 'A4' | 'Letter' | 'Square' | 'Custom';
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
  template: 'minimal',
  size: {
    format: '16:9',
    width: 1920,
    height: 1080,
  },
  language: {
    direction: 'ltr',
    primary: 'English',
  },
  spacing: {
    padding: 60,
    margins: 40,
    cornerRadius: 8,
  },
  header: {
    enabled: true,
    showDate: true,
    showProjectName: true,
  },
  footer: {
    enabled: true,
    showPageNumbers: true,
  },
};

export const SIZE_PRESETS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  'A4': { width: 2480, height: 3508 },
  'Letter': { width: 2550, height: 3300 },
  'Square': { width: 1080, height: 1080 },
  'Custom': { width: 1920, height: 1080 },
};