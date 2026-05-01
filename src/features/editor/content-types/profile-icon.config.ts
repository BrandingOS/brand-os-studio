import type { ContentTypeConfig } from './types';

// Square logo container for avatars / favicons / social profile pics.
// Distinct from social-post (which is also square) because the
// presets are exact icon sizes, not social-feed sizes — squatting on
// social-post would pollute its preset list with non-feed dimensions.
export const profileIconConfig: ContentTypeConfig = {
  id: 'profile-icon',
  label: 'Profile icon',
  icon: 'CircleUser',
  pageModel: 'single',
  defaultDimensions: { width: 1080, height: 1080 },
  dimensionPresets: [
    { label: 'Source 1080×1080', width: 1080, height: 1080 },
    { label: 'Twitter/X 400×400', width: 400, height: 400 },
    { label: 'Facebook profile 512×512', width: 512, height: 512 },
    { label: 'App icon 256×256', width: 256, height: 256 },
    { label: 'Favicon 64×64', width: 64, height: 64 },
  ],
  panels: {
    layers: true,
    properties: true,
    pageNavigator: false,
    assets: true,
    masterPages: false,
  },
  exportFormats: ['png', 'svg'],
  defaultExportFormat: 'png',
  supportsBrandKit: true,
  supportsMasterPages: false,
  // Icon sizes are exact — 64px favicon and 1080px profile aren't
  // "the same icon at different sizes," they need re-export from the
  // source square. No reflow.
  resizeStrategy: 'fixed',
};
