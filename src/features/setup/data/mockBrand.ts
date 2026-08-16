import type { LogoRole } from '@/shared/types/brandAssets';

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
  /**
   * Which GROUND this tile is drawn on — never a claim about the artwork.
   *
   * `dark` means "preview this on a dark tile", because that is the ground the
   * variant was drawn for. The artwork itself is shown exactly as uploaded.
   */
  variant: 'light' | 'dark';
  svg: string;
  /**
   * The canonical logo role this tile holds.
   *
   * The label used to be the only record of which slot a tile was, so the
   * write-back re-derived roles by matching label text — and `variant` doubled
   * as evidence, which put the primary logo in the mono-white slot (the first
   * light-VARIANT tile is Primary, not the light-coloured artwork). Carrying
   * the role means a tile knows what it is, and a swap is exact.
   *
   * Absent on a tile that came from a legacy scalar with no role behind it.
   */
  role?: LogoRole;
};

/** A single font file uploaded by the user — kept as a data URL so
 *  the brand object stays self-contained (localStorage-friendly,
 *  no extra storage layer). The bytes flow through to exporters
 *  unchanged, so a `.ttf` upload comes out as a `.ttf` download. */
export type BrandFontFile = {
  /** Original filename, e.g. "Bricolage-Bold.ttf". */
  name: string;
  /** Detected weight label (Regular / Bold / 600 / etc.). */
  weight: string;
  /** Lower-case file extension without the dot — drives MIME + zip
   *  filename when re-exported. */
  format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot';
  /** `data:font/...;base64,…` URL of the uploaded bytes. */
  dataUrl: string;
  /** File size in bytes — kept for future "limit reached" UI. */
  size: number;
};

export type BrandFont = {
  id: string;
  family: string;
  /** Free-form role label shown above the family name (e.g. "Display", "Text", "Mono"). */
  role: string;
  weights: string;
  fallback?: string;
  /** Uploaded files for this family. Populated when the user uploads
   *  the font through the setup picker; absent for Google-Fonts-only
   *  picks. The brand-kit Fonts download prefers these over a remote
   *  fetch so the user gets exactly the file they uploaded. */
  files?: BrandFontFile[];
};

export type BrandPhoto = {
  id: string;
  src: string;
  slot: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
};

export type BrandWebsite = {
  id: string;
  url: string;
  live?: boolean;
  /** OG image URL (preferred) or screenshot URL (fallback). Populated
   *  asynchronously after the site is added via the site-preview fetch. */
  preview?: string | null;
  /** Favicon / touch icon URL, used in the tab strip. */
  favicon?: string | null;
  /** Site <title> — used for tab label when available. */
  title?: string | null;
  /** True while the preview fetch is in flight; the frame shows a loading
   *  shimmer instead of the fallback letter mark. */
  loading?: boolean;
};

export type AboutEntry = {
  id: string;
  title: string;
  content: string;
};

/**
 * A link the brand has, beside its website.
 *
 * `kind` is `BusinessInfo.links`' own closed set; anything it does not name is
 * `other` and keeps its handle as the label.
 */
export type BrandLink = {
  id: string;
  kind: string;
  url: string;
  label?: string;
};

/**
 * What the brand SAYS about itself — the same eleven answers the onboarding
 * review collects, in the same order.
 *
 * They exist on the Setup model whether or not they were answered, for the
 * reason the review's own list is fixed: an empty field is a question waiting,
 * not a field that does not exist. Setup used to carry none of them, so a user
 * who filled in eleven answers during onboarding opened their brand and found
 * five free-form About cards, none of which held any of it.
 *
 * Choices are VOCABULARY IDS (`strategy.personality` etc. persist ids, not
 * labels); prose is the user's own wording.
 */
export type BrandStrategyFields = {
  summary: string;
  /** Business Info, not Core — a fact about the company. */
  industry: string;
  /** Business Info: `description`, which is products and services. */
  products: string;
  audience: string;
  positioning: string;
  mission: string;
  personality: string[];
  tone: string;
  /** `visualStyle.descriptors` — a CLOSED union; free words cannot go here. */
  style: string[];
  values: string[];
  /** Business Info: `tagline`. */
  slogan: string;
};

export const EMPTY_STRATEGY: BrandStrategyFields = {
  summary: '',
  industry: '',
  products: '',
  audience: '',
  positioning: '',
  mission: '',
  personality: [],
  tone: '',
  style: [],
  values: [],
  slogan: '',
};

export type MockBrand = {
  name: string;
  logos: BrandLogo[];
  colors: {
    core: BrandColor[];
    accent: BrandColor[];
    grey: BrandColor[];
  };
  fonts: BrandFont[];
  icons: string[];
  photos: BrandPhoto[];
  websites: BrandWebsite[];
  voice: {
    essay: string;
    pillars: string[];
  };
  /** Free-form sections — headings the fixed fields cannot represent. */
  about: AboutEntry[];
  /** The eleven structured answers. Always present; often partly empty. */
  strategy: BrandStrategyFields;
  /** Social and other addresses. The website itself stays in `websites`. */
  links: BrandLink[];
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
  fonts: [
    {
      id: 'f1',
      family: 'Instrument Serif',
      role: 'Display',
      weights: 'Regular · Italic',
      fallback: 'Playfair Display, serif',
    },
    {
      id: 'f2',
      family: 'Inter',
      role: 'Text',
      weights: '400 · 500 · 600 · 700',
      fallback: 'system-ui, -apple-system, sans-serif',
    },
  ],
  // Bare names — the Setup board renders these via its hand-built
  // ICON_MAP (camera, sparkle, image, …). The cosmos brand-kit
  // renderer also accepts Flaticon UICONS class names (`fi-rr-*`)
  // that the picker adds.
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
    { id: 'p1', src: '/setup/photos/style-nuworld.jpg', slot: 'A' },
    { id: 'p2', src: '/setup/photos/style-spectrum.jpg', slot: 'B' },
    { id: 'p3', src: '/setup/photos/style-amber.jpg', slot: 'C' },
    { id: 'p4', src: '/setup/photos/style-crater.jpg', slot: 'D' },
    { id: 'p5', src: '/setup/photos/style-mindshift.jpg', slot: 'E' },
    { id: 'p6', src: '/setup/photos/style-soan.jpg', slot: 'F' },
  ],
  websites: [{ id: 'w1', url: 'brand.dropbox.com', live: true }],
  voice: {
    essay:
      'We speak plainly. We make complex things feel simple. We respect our readers’ time — and their intelligence.',
    pillars: ['Clear', 'Warm', 'Precise', 'Confident'],
  },
  strategy: { ...EMPTY_STRATEGY },
  links: [],
  about: [
    { id: 'audience', title: 'Audience', content: '' },
    { id: 'messaging', title: 'Messaging', content: '' },
    { id: 'vision', title: 'Vision', content: '' },
    { id: 'mission', title: 'Mission', content: '' },
    {
      id: 'voice',
      title: 'Voice & Tone',
      content:
        'We speak plainly. We make complex things feel simple. We respect our readers’ time — and their intelligence.\n\nPillars: Clear, Warm, Precise, Confident.',
    },
  ],
};
