/**
 * Seed data for the Setup page. Mirrors the `Nuworld` brand embedded in the
 * source HTML (new-version/brandos/brandOS brand board.html) so the page
 * renders something concrete without a backend.
 *
 * TODO: replace with a real brand store read + persistence once the backend
 * + auth integration is wired (see TODO markers in SetupPage.tsx).
 */

export type BrandColor = {
  hex: string;
  name: string;
};

export type BrandLogo = {
  id: string;
  label: string;
  variant: 'light' | 'dark';
  svg: string;
};

export type BrandFont = {
  id: string;
  family: string;
  kind: 'Display' | 'Text';
  weights: string;
  fallback?: string;
};

export type BrandPhoto = {
  id: string;
  src: string;
  span?: 'wide' | 'tall';
};

export type MockBrand = {
  name: string;
  logos: BrandLogo[];
  colors: {
    core: BrandColor[];
    accent: BrandColor[];
    grey: BrandColor[];
  };
  fonts: {
    display: BrandFont;
    text: BrandFont;
  };
  icons: string[];
  photos: BrandPhoto[];
  website: { url: string; live: boolean };
  voice: {
    essay: string;
    pillars: string[];
  };
};

const nuworldLogoSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#2550E3"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#F1EEE4" font-family="Instrument Serif, Playfair Display, serif" font-size="54" font-weight="400" letter-spacing="-1">Nuworld</text>
</svg>`;

const nuworldLogoMonoSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#F1EEE4"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#111113" font-family="Instrument Serif, Playfair Display, serif" font-size="54" font-weight="400" letter-spacing="-1">Nuworld</text>
</svg>`;

const nuworldLogoMark = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#111113"/>
  <circle cx="100" cy="100" r="54" fill="none" stroke="#F1EEE4" stroke-width="6"/>
  <circle cx="100" cy="100" r="8" fill="#F1EEE4"/>
</svg>`;

export const mockBrand: MockBrand = {
  name: 'Nuworld',
  logos: [
    { id: 'l1', label: 'Primary', variant: 'light', svg: nuworldLogoSVG },
    { id: 'l2', label: 'Inverse', variant: 'light', svg: nuworldLogoMonoSVG },
    { id: 'l3', label: 'Mark', variant: 'dark', svg: nuworldLogoMark },
  ],
  colors: {
    core: [
      { hex: '#2550E3', name: 'Signal Blue' },
      { hex: '#F1EEE4', name: 'Bone' },
      { hex: '#111113', name: 'Carbon' },
    ],
    accent: [
      { hex: '#E7406A', name: 'Punch' },
      { hex: '#F6B1B9', name: 'Blush' },
      { hex: '#B01138', name: 'Ruby' },
      { hex: '#E76A27', name: 'Sunset' },
      { hex: '#EE9026', name: 'Clementine' },
      { hex: '#F3C644', name: 'Vivid' },
      { hex: '#1F5C3C', name: 'Pine' },
      { hex: '#8EB832', name: 'Lime' },
      { hex: '#117481', name: 'Teal' },
      { hex: '#35C1E1', name: 'Cerulean' },
      { hex: '#1E2A4A', name: 'Navy' },
      { hex: '#662369', name: 'Plum' },
    ],
    grey: [
      { hex: '#0A0A0A', name: 'Carbon 900' },
      { hex: '#1F1F1F', name: 'Coal' },
      { hex: '#323231', name: 'Graphite' },
      { hex: '#484846', name: 'Slate' },
      { hex: '#615F5A', name: 'Lead' },
      { hex: '#7A7870', name: 'Pewter' },
      { hex: '#959287', name: 'Ash' },
      { hex: '#B1AEA0', name: 'Sand' },
      { hex: '#CCC9BB', name: 'Bone 200' },
      { hex: '#E6E3D6', name: 'Linen' },
      { hex: '#F1EEE4', name: 'Eggshell' },
      { hex: '#FAF8F1', name: 'Milk' },
    ],
  },
  fonts: {
    display: {
      id: 'f1',
      family: 'Instrument Serif',
      kind: 'Display',
      weights: 'Regular · Italic',
      fallback: 'Playfair Display, serif',
    },
    text: {
      id: 'f2',
      family: 'Inter',
      kind: 'Text',
      weights: '400 · 500 · 600 · 700',
      fallback: 'system-ui, -apple-system, sans-serif',
    },
  },
  icons: [
    'camera',
    'sparkle',
    'image',
    'link',
    'star',
    'settings',
    'send',
    'trash',
    'edit',
    'bell',
    'heart',
    'search',
  ],
  photos: [
    { id: 'p1', src: '/setup/photos/style-nuworld.jpg', span: 'wide' },
    { id: 'p2', src: '/setup/photos/style-spectrum.jpg' },
    { id: 'p3', src: '/setup/photos/style-amber.jpg' },
    { id: 'p4', src: '/setup/photos/style-crater.jpg', span: 'tall' },
    { id: 'p5', src: '/setup/photos/style-mindshift.jpg' },
    { id: 'p6', src: '/setup/photos/style-soan.jpg' },
  ],
  website: { url: 'brand.dropbox.com', live: true },
  voice: {
    essay:
      'We speak plainly. We make complex things feel simple. We respect our readers’ time — and their intelligence.',
    pillars: ['Clear', 'Warm', 'Precise', 'Confident'],
  },
};
