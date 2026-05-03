import type { ContentTypeConfig } from './types';

// Email signature — small wide format for email footers.
// Phase 4 addition (Content Universe).
export const emailSignatureConfig: ContentTypeConfig = {
  id: 'email-signature',
  label: 'Email signature',
  icon: 'Mail',
  pageModel: 'single',
  defaultDimensions: { width: 600, height: 200 },
  dimensionPresets: [
    { label: 'Standard 600×200', width: 600, height: 200 },
    { label: 'Compact 400×120', width: 400, height: 120 },
    { label: 'Wide 800×200', width: 800, height: 200 },
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
  resizeStrategy: 'fixed', // email render dimensions are exact
};
