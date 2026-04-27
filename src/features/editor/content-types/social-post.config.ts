import type { ContentTypeConfig } from './types';

export const socialPostConfig: ContentTypeConfig = {
  id: 'social-post',
  label: 'Social post',
  icon: 'Square',
  pageModel: 'single',
  defaultDimensions: { width: 1080, height: 1080 },
  dimensionPresets: [
    { label: 'Square 1:1', width: 1080, height: 1080 },
    { label: 'Portrait 4:5', width: 1080, height: 1350 },
    { label: 'Story 9:16', width: 1080, height: 1920 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: false,
    assets: true,
    masterPages: false,
  },
  exportFormats: ['png', 'jpg'],
  defaultExportFormat: 'png',
  supportsBrandKit: true,
  supportsMasterPages: false,
};
