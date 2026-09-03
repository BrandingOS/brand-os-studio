import type { Brand } from '@/shared/types/brand';
import tokens from '@/shared/ds/tokens.json';

/**
 * The BrandingOS capture fixture — DEV ONLY, capture ONLY.
 *
 * The Figma artifact represents BrandingOS itself, so the screens must be
 * captured showing BrandingOS's own identity rather than a customer's. This is
 * that identity, assembled from real repository evidence:
 *
 *   colours     src/shared/ds/tokens.json  (the source tokens.css is generated from)
 *   typography  --ds-font / --ds-font-mono, same file
 *   logo        the 9-dot BrandMark, rendered as SVG below
 *   copy        the product's own strings
 *
 * Three rules keep it out of production, and the FIRST is the one that matters:
 *
 * 1. It is NEVER added to `SEED_BRANDS`. That array is what LocalBrandsService
 *    and SupabaseBrandsService merge into the authoritative brand list and what
 *    `SEED_BRAND_IDS` is derived from, so a brand absent from it cannot appear
 *    in anyone's list, cannot be persisted by `patchSeedOverride`, and cannot be
 *    deleted or edited through any service path.
 * 2. `getSeedBrandBySlug` returns it only under `import.meta.env.DEV`, so it is
 *    dead code in a production build.
 * 3. It is frozen.
 *
 * Nothing here writes to a store, to localStorage, or to Supabase.
 */

const light = tokens.modes.light as Record<string, string>;
const global = tokens.global as Record<string, string>;

/** The reserved slug. Not a customer name, so it can never collide with one. */
export const BRANDINGOS_FIXTURE_SLUG = 'brandingos';

const fontOf = (stack: string) => stack.split(',')[0].replace(/['"]/g, '').trim();

/**
 * The 9-dot BrandMark, drawn as SVG.
 *
 * Geometry matches `shared/ds/BrandMark.tsx` — eight ring nodes plus a core.
 * It is drawn in the IDLE state: a mark permanently wearing the loader would
 * say the product is permanently busy. And never a letter "B".
 */
const RING = [
  [12, 2], [19, 5], [22, 12], [19, 19],
  [12, 22], [5, 19], [2, 12], [5, 5],
];
const markSvg = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
  RING.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2" fill="${fill}"/>`).join('') +
  `<circle cx="12" cy="12" r="3" fill="${fill}"/></svg>`;

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const BRANDINGOS_MARK_URL = dataUri(markSvg(light['--ds-accent']));
export const BRANDINGOS_MARK_LIGHT_URL = dataUri(markSvg(light['--ds-bg']));

export const brandingosFixture: Brand = Object.freeze({
  id: 'brandingos-fixture',
  slug: BRANDINGOS_FIXTURE_SLUG,
  name: 'BrandingOS',
  logo: BRANDINGOS_MARK_URL,
  primaryColor: light['--ds-accent'],
  secondaryColor: light['--ds-success'],
  fonts: {
    primary: fontOf(global['--ds-font']),
    secondary: fontOf(global['--ds-font-mono']),
  },
  tone: 'Direct, precise and quietly confident',
  audience: 'Founders and small teams who need a complete brand system without a design department',
  strategy:
    'BrandingOS turns one brand setup into every branded artefact a company needs — '
    + 'guidelines, kits, templates and designs — so a brand stays consistent without anyone policing it.',
  guidelines: {
    strategy: {
      mission: 'One setup. Infinite branded possibilities.',
      vision: 'Every company runs on a brand system it never has to maintain by hand.',
      values: ['Consistency', 'Clarity', 'Autonomy', 'Craft', 'Speed'],
      positioning: 'The operating system for a brand — setup once, generate everything.',
      personality: ['Precise', 'Calm', 'Systematic', 'Confident', 'Unfussy'],
      targetAudience:
        'Founders, brand owners and small marketing teams who need a complete, consistent '
        + 'brand system without hiring a design department.',
    },
    logoSystem: {
      primary: {
        url: BRANDINGOS_MARK_URL,
        description:
          'The nine-dot mark: eight ring nodes around a solid core. The ring reads as a system '
          + 'of parts and the core as the single setup they all derive from.',
        usage: 'Primary identifier. Drawn in the idle state — never wearing the loader.',
      },
      whiteVersion: {
        url: BRANDINGOS_MARK_LIGHT_URL,
        description: 'The same mark in the page colour, for dark grounds.',
        usage: 'Dark surfaces and photography overlays.',
      },
    },
    colors: {
      primary: light['--ds-accent'],
      secondary: light['--ds-success'],
      accent: light['--ds-warning'],
      neutrals: [light['--ds-bg'], light['--ds-surface'], light['--ds-border'], light['--ds-text']],
    },
    typography: {
      heading: fontOf(global['--ds-font']),
      body: fontOf(global['--ds-font']),
      mono: fontOf(global['--ds-font-mono']),
    },
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} as unknown as Brand);
