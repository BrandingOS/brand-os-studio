import type { ContentTypeConfig } from './types';

// Brochure — multi-page folded print piece (bi-fold / tri-fold).
// Phase 4 addition (Content Universe). Multi-page so each panel
// is a separate page in the document; export collates as a print
// spread.
export const brochureConfig: ContentTypeConfig = {
  id: 'brochure',
  label: 'Brochure',
  icon: 'BookOpen',
  pageModel: 'multi',
  defaultDimensions: { width: 1650, height: 1275 }, // US Letter landscape
  dimensionPresets: [
    { label: 'US Letter landscape 150dpi', width: 1650, height: 1275 },
    { label: 'A4 landscape 150dpi', width: 1754, height: 1240 },
    { label: 'Tri-fold panel 150dpi', width: 550, height: 1275 },
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
  resizeStrategy: 'fixed',
};
