import type { ContentTypeConfig } from './types';

export const presentationConfig: ContentTypeConfig = {
  id: 'presentation',
  label: 'Presentation',
  icon: 'Presentation',
  pageModel: 'multi',
  defaultDimensions: { width: 1920, height: 1080 },
  dimensionPresets: [
    { label: '16:9', width: 1920, height: 1080 },
    { label: '4:3', width: 1600, height: 1200 },
    { label: 'Wide 21:9', width: 2520, height: 1080 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: true,
    assets: true,
    masterPages: true,
  },
  exportFormats: ['pdf', 'png', 'jpg'],
  defaultExportFormat: 'pdf',
  supportsBrandKit: true,
  supportsMasterPages: true,
};
