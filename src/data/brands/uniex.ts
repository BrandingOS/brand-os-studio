import type { Brand } from '@/shared/types/brand';

/**
 * Uniex — Educational platform connecting students to universities & programs
 * worldwide. Brand colors: Navy (#001563) + Vivid Green (#68be69).
 *
 * The product wing «أثر» (Athar) helps high-school students measure their
 * career interests (Holland test) and pick a university major through
 * real-world experience with university ambassadors.
 */
const LOGO_BASE = '/brands/uniex/logos';

export const UNIEX_LOGO_FULL = `${LOGO_BASE}/FullLogo.svg`;
export const UNIEX_LOGO_NAVY = `${LOGO_BASE}/Logo.svg`;
export const UNIEX_LOGO_WHITE = `${LOGO_BASE}/LogoWhite.svg`;
export const UNIEX_LOGO_BLACK = `${LOGO_BASE}/LogoBlack.svg`;
export const UNIEX_ICON_NAVY = `${LOGO_BASE}/iconBlue.svg`;
export const UNIEX_ICON_GREEN = `${LOGO_BASE}/iconGreen.svg`;
export const UNIEX_ICON_WHITE = `${LOGO_BASE}/iconWhite.svg`;
export const UNIEX_ICON_BLACK = `${LOGO_BASE}/iconBlack.svg`;
export const UNIEX_BACK_DARK = `${LOGO_BASE}/backDark.svg`;
export const UNIEX_BACK_NAVY_GREEN = `${LOGO_BASE}/backBlue-iconGreen.svg`;
export const UNIEX_BACK_NAVY_WHITE = `${LOGO_BASE}/backBlue-iconWhite.svg`;
export const UNIEX_BACK_GREEN_WHITE = `${LOGO_BASE}/backGreen-iWhite.svg`;
export const UNIEX_BACK_GREEN_LOGO = `${LOGO_BASE}/backGreen-Logo.svg`;

export const uniexBrand: Brand = {
  id: 'uniex-brand-001',
  slug: 'uniex',
  name: 'Uniex',
  logo: UNIEX_LOGO_FULL,
  primaryColor: '#001563',
  secondaryColor: '#68BE69',
  accentColor: '#68BE69',
  neutrals: ['#0A0F2E', '#1F2A56', '#94A3B8', '#F1F5F9', '#FFFFFF'],
  fonts: {
    primary: 'IBM Plex Sans Arabic',
    secondary: 'Cairo',
  },
  tone: 'Supportive, Empowering & Globally-minded',
  audience:
    'High-school students (and their schools) looking for academic guidance, career-interest measurement (Holland), and an honest look at university life through ambassadors who actually live it.',
  strategy:
    'Uniex is the bridge between curiosity and a confident academic decision. Through the «أثر» program, schools deliver a layered experience — a measured career-interests instrument, real-world university content, and one-on-one guidance — so students stop choosing majors from a marketing brochure.',
  guidelines: {
    strategy: {
      mission:
        'Empower students to make a confident, conscious academic decision — backed by real understanding of the major and the university, not a brochure.',
      vision:
        'A world where every high-school student steps into university having already lived the experience — not guessed at it.',
      values: [
        'Empowerment',
        'Honest Guidance',
        'Real Experience',
        'Global Reach',
        'Personalized Support',
      ],
      positioning:
        'Your passport to a world of education opportunities. One platform, all connected.',
      personality: ['Supportive', 'Empowering', 'Global', 'Educational', 'Optimistic'],
      targetAudience:
        'High-school students in the Gulf and MENA, plus the schools that serve them. Secondary: parents and university partners.',
    },
    logoSystem: {
      primary: {
        url: UNIEX_LOGO_FULL,
        description:
          'The full Uniex wordmark in navy + green. Used on light surfaces as the canonical mark.',
        usage:
          'Light backgrounds — paper, white cards, lightboxes. The default primary lockup.',
      },
      secondary: {
        url: UNIEX_LOGO_NAVY,
        description: 'Compact navy wordmark for tighter contexts.',
        usage: 'Footers, partner co-brand strips, social profile spaces.',
      },
      // `wordmark` intentionally unset — it pointed at the same NAVY
      // asset as `secondary`, which surfaced as a lookalike duplicate
      // in the editor's variant picker and the brand-board panel.
      // The colored wordmark IS the secondary variant; we don't need
      // a redundant role for it.
      iconmark: {
        url: UNIEX_ICON_NAVY,
        description: 'The standalone iconmark — derived from the «ui» letterforms.',
        usage: 'Favicon, app icon, social avatar, watermark, card backs.',
      },
      blackVersion: {
        url: UNIEX_LOGO_BLACK,
        description: 'Single-color black wordmark for monochrome printing.',
        usage: 'Black-and-white print, document headers, partner sheets.',
      },
      whiteVersion: {
        url: UNIEX_LOGO_WHITE,
        description: 'Reversed wordmark for dark or photographic backgrounds.',
        usage:
          'Hero sections on navy, photographic banners, colored backgrounds where the navy version would muddy.',
      },
      clearSpace: '1× the cap height of the wordmark on all sides',
      minSize: '60px width digital, 20mm print',
      usage: [
        {
          do: 'Pair the wordmark with breathable space — the brand is friendly, not crowded',
          dont: 'Surround the wordmark with competing graphics or shrink it below the minimum',
          example: 'Cover slide: full Uniex wordmark centered with 60–80px clear space all around',
        },
        {
          do: 'Use the navy version on light surfaces and the white version on color floods',
          dont: 'Use the navy wordmark on dark navy or the green wordmark on green',
          example: 'On a green flood card, switch to the white iconmark or the back-green-white logo',
        },
      ],
    },
    colorPalette: {
      primary: {
        hex: '#001563',
        rgb: 'rgb(0, 21, 99)',
        cmyk: 'C:100 M:90 Y:30 K:20',
        name: 'Uniex Navy',
        usage:
          'Primary brand color — used for text on light surfaces, backgrounds for hero moments, and the navy wordmark. Carries the institutional, trustworthy weight of the brand.',
      },
      secondary: {
        hex: '#68BE69',
        rgb: 'rgb(104, 190, 105)',
        cmyk: 'C:60 M:0 Y:80 K:0',
        name: 'Uniex Green',
        usage:
          'Energy and optimism — used for accents, highlights, the underline-style markers in headlines, and call-to-action buttons. Never as a body-text background.',
      },
      accent: {
        hex: '#68BE69',
        rgb: 'rgb(104, 190, 105)',
        name: 'Action Green',
        usage:
          'Interactive moments — buttons, links, key highlights. Same green, different role.',
      },
      neutral: [
        { hex: '#0A0F2E', rgb: 'rgb(10, 15, 46)', name: 'Deep Navy', usage: 'Backgrounds for ink-mode slides and footers.' },
        { hex: '#1F2A56', rgb: 'rgb(31, 42, 86)', name: 'Surface Navy', usage: 'Card surfaces on dark hero slides.' },
        { hex: '#94A3B8', rgb: 'rgb(148, 163, 184)', name: 'Cool Gray', usage: 'Secondary text and subtle borders on light surfaces.' },
        { hex: '#F1F5F9', rgb: 'rgb(241, 245, 249)', name: 'Paper', usage: 'Default light backgrounds, cards on dark, body for editorial slides.' },
        { hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)', name: 'White', usage: 'Pure white for text on navy and the cleanest card surfaces.' },
      ],
      semantic: {
        success: { hex: '#22C55E', rgb: 'rgb(34, 197, 94)', name: 'Success', usage: 'Confirmations.' },
        warning: { hex: '#F59E0B', rgb: 'rgb(245, 158, 11)', name: 'Warning', usage: 'Attention.' },
        error: { hex: '#EF4444', rgb: 'rgb(239, 68, 68)', name: 'Error', usage: 'Critical messages.' },
        info: { hex: '#3B82F6', rgb: 'rgb(59, 130, 246)', name: 'Info', usage: 'Neutral system messages.' },
      },
    },
    typography: {
      primary: {
        family: 'IBM Plex Sans Arabic',
        weights: [300, 400, 500, 600, 700],
        fallbacks: ['Inter', 'system-ui', 'sans-serif'],
        usage: 'Headlines, display, brand-forward Arabic moments. The friendly, modern Arabic counterpart to Inter.',
      },
      secondary: {
        family: 'Cairo',
        weights: [400, 500, 600, 700],
        fallbacks: ['IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        usage: 'Body text, paragraph copy, and longer-form Arabic reading. Cairo is the canonical Arabic body face.',
      },
      accent: {
        family: 'Inter',
        weights: [400, 500, 600, 700],
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        usage: 'English / Latin contexts inside otherwise Arabic decks (mixed content, numerics).',
      },
      scale: {
        h1: '4.5rem/1.05',
        h2: '3.5rem/1.1',
        h3: '2.25rem/1.2',
        h4: '1.5rem/1.3',
        h5: '1.25rem/1.4',
        h6: '1.125rem/1.4',
        body: '1rem/1.7',
        bodyLarge: '1.125rem/1.7',
        bodySmall: '0.875rem/1.5',
        caption: '0.75rem/1.4',
        overline: '0.6875rem/1.2',
      },
    },
  },
  // Copy of the Word doc strategy block — keeps About text accessible to UI.
  about: [
    'Uniex is more than a platform — a team of educators, advisors, and dream supporters whose job is to make a student\'s educational decision honest, considered, and global.',
    'Through 500+ partner universities across Turkey, the Gulf, Asia, and Europe, students can search programs, talk to ambassadors, and pick a path that matches who they actually are — not who a brochure says they should be.',
  ],
  brandAssets: [
    {
      id: 'uniex-logo-full',
      kind: 'image',
      name: 'Uniex Full Wordmark (Navy + Green)',
      tags: ['logo', 'primary', 'wordmark'],
      formats: { svg: { url: UNIEX_LOGO_FULL, width: 443, height: 91 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-logo-navy',
      kind: 'image',
      name: 'Uniex Wordmark (Navy)',
      tags: ['logo', 'wordmark', 'navy'],
      formats: { svg: { url: UNIEX_LOGO_NAVY, width: 200, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-logo-white',
      kind: 'image',
      name: 'Uniex Wordmark (White)',
      tags: ['logo', 'wordmark', 'white', 'reversed'],
      formats: { svg: { url: UNIEX_LOGO_WHITE, width: 200, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-logo-black',
      kind: 'image',
      name: 'Uniex Wordmark (Black)',
      tags: ['logo', 'wordmark', 'black', 'mono'],
      formats: { svg: { url: UNIEX_LOGO_BLACK, width: 200, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-icon-navy',
      kind: 'image',
      name: 'Uniex Iconmark (Navy)',
      tags: ['logo', 'iconmark', 'navy'],
      formats: { svg: { url: UNIEX_ICON_NAVY, width: 80, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-icon-green',
      kind: 'image',
      name: 'Uniex Iconmark (Green)',
      tags: ['logo', 'iconmark', 'green'],
      formats: { svg: { url: UNIEX_ICON_GREEN, width: 80, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-icon-white',
      kind: 'image',
      name: 'Uniex Iconmark (White)',
      tags: ['logo', 'iconmark', 'white'],
      formats: { svg: { url: UNIEX_ICON_WHITE, width: 80, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-icon-black',
      kind: 'image',
      name: 'Uniex Iconmark (Black)',
      tags: ['logo', 'iconmark', 'black'],
      formats: { svg: { url: UNIEX_ICON_BLACK, width: 80, height: 80 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-design-1',
      kind: 'image',
      name: 'One Place, All Connected',
      tags: ['scene', 'hero', 'illustration', 'green'],
      formats: { jpg: { url: '/brands/uniex/designs/1.jpg', width: 1080, height: 1080 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-design-2',
      kind: 'image',
      name: 'Pathway to Educational Success',
      tags: ['scene', 'hero', 'illustration', 'navy'],
      formats: { jpg: { url: '/brands/uniex/designs/2.jpg', width: 1080, height: 1080 } },
      createdAt: new Date('2024-07-04'),
    },
    {
      id: 'uniex-design-3',
      kind: 'image',
      name: 'Passport to Education Opportunities',
      tags: ['scene', 'hero', 'illustration'],
      formats: { jpg: { url: '/brands/uniex/designs/3.jpg', width: 1080, height: 1080 } },
      createdAt: new Date('2024-07-04'),
    },
  ],
  isPublic: false,
  createdAt: new Date('2024-07-04'),
  updatedAt: new Date('2026-04-26'),
};
