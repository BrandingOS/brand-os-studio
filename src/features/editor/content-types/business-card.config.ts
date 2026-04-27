import type { ContentTypeConfig } from './types';

// Print-safe: 3.5" × 2" at 300dpi → 1050 × 600 px.
export const businessCardConfig: ContentTypeConfig = {
  id: 'business-card',
  label: 'Business card',
  icon: 'IdCard',
  pageModel: 'single',
  defaultDimensions: { width: 1050, height: 600 },
  dimensionPresets: [
    { label: 'US standard 3.5×2"', width: 1050, height: 600 },
    { label: 'EU standard 85×55mm', width: 1004, height: 650 },
    { label: 'Square 2.5×2.5"', width: 750, height: 750 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: false,
    assets: true,
    masterPages: false,
  },
  exportFormats: ['pdf', 'png', 'svg'],
  defaultExportFormat: 'pdf',
  supportsBrandKit: true,
  supportsMasterPages: false,
  // Print stationery is fixed by physical reality — resizing breaks
  // the print spec, so refuse / warn hard.
  resizeStrategy: 'fixed',
};
