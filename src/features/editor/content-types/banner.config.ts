import type { ContentTypeConfig } from './types';

export const bannerConfig: ContentTypeConfig = {
  id: 'banner',
  label: 'Banner',
  icon: 'RectangleHorizontal',
  pageModel: 'single',
  defaultDimensions: { width: 1500, height: 500 },
  dimensionPresets: [
    { label: 'Web wide 1500×500', width: 1500, height: 500 },
    { label: 'Twitter / X header', width: 1500, height: 500 },
    { label: 'LinkedIn cover', width: 1584, height: 396 },
    { label: 'Facebook cover', width: 1640, height: 624 },
    { label: 'YouTube channel art', width: 2560, height: 1440 },
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
  // Linear stretch with anchor-point translation works fine for
  // banner-style horizontal layouts.
  resizeStrategy: 'reflowable',
};
