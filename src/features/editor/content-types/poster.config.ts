import type { ContentTypeConfig } from './types';

// Poster — single-page large-format print piece.
// Phase 4 addition (Content Universe).
export const posterConfig: ContentTypeConfig = {
  id: 'poster',
  label: 'Poster',
  icon: 'Image',
  pageModel: 'single',
  defaultDimensions: { width: 1754, height: 2480 }, // A3 portrait @ 150dpi
  dimensionPresets: [
    { label: 'A3 portrait 150dpi', width: 1754, height: 2480 },
    { label: 'A3 landscape 150dpi', width: 2480, height: 1754 },
    { label: 'A4 portrait 150dpi', width: 1240, height: 1754 },
    { label: 'US Letter portrait 150dpi', width: 1275, height: 1650 },
    { label: 'Tabloid 11×17"', width: 1650, height: 2550 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: false,
    assets: true,
    masterPages: false,
  },
  exportFormats: ['pdf', 'png', 'jpg'],
  defaultExportFormat: 'pdf',
  supportsBrandKit: true,
  supportsMasterPages: false,
  // Posters reflow well — content stretches to canvas naturally.
  resizeStrategy: 'reflowable',
};
