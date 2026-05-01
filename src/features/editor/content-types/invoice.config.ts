import type { ContentTypeConfig } from './types';

// Print-document portrait: A4 portrait at 150dpi → 1240×1754 px.
// Default kept at 1080×1920 to match the brandkit fixture's prior
// canvas dimensions so existing invoice templates open at the same
// visible aspect ratio.
export const invoiceConfig: ContentTypeConfig = {
  id: 'invoice',
  label: 'Invoice',
  icon: 'Receipt',
  pageModel: 'single',
  defaultDimensions: { width: 1080, height: 1920 },
  dimensionPresets: [
    { label: 'Mobile portrait 1080×1920', width: 1080, height: 1920 },
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
  // Financial documents: line items, totals, tax columns, page numbers
  // — reflowing breaks legal/regulatory layout requirements. Fixed.
  resizeStrategy: 'fixed',
};
