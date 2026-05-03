import type { ContentTypeConfig } from './types';

// Letterhead — print stationery for business correspondence.
// Phase 4 addition (Content Universe).
export const letterheadConfig: ContentTypeConfig = {
  id: 'letterhead',
  label: 'Letterhead',
  icon: 'FileText',
  pageModel: 'single',
  defaultDimensions: { width: 1240, height: 1754 }, // A4 portrait @ 150dpi
  dimensionPresets: [
    { label: 'A4 portrait 150dpi', width: 1240, height: 1754 },
    { label: 'A4 portrait 300dpi', width: 2480, height: 3508 },
    { label: 'US Letter portrait 150dpi', width: 1275, height: 1650 },
    { label: 'US Letter portrait 300dpi', width: 2550, height: 3300 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: false,
    assets: true,
    masterPages: false,
  },
  exportFormats: ['pdf', 'png'],
  defaultExportFormat: 'pdf',
  supportsBrandKit: true,
  supportsMasterPages: false,
  resizeStrategy: 'fixed', // print stationery — physical reality
};
