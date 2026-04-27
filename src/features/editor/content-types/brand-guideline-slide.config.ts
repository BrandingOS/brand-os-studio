import type { ContentTypeConfig } from './types';

export const brandGuidelineSlideConfig: ContentTypeConfig = {
  id: 'brand-guideline-slide',
  label: 'Brand guideline',
  icon: 'BookOpen',
  pageModel: 'multi',
  defaultDimensions: { width: 1920, height: 1080 },
  dimensionPresets: [
    { label: 'Slide 16:9', width: 1920, height: 1080 },
    { label: 'Document A4 portrait', width: 1240, height: 1754 },
    { label: 'Document A4 landscape', width: 1754, height: 1240 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: true,
    assets: true,
    masterPages: true,
  },
  exportFormats: ['pdf', 'png'],
  defaultExportFormat: 'pdf',
  supportsBrandKit: true,
  supportsMasterPages: true,
};
