/**
 * Gate 2 fixtures — one made-up brand, read from one made-up website.
 *
 * DISPOSABLE. Nothing here talks to a network, a store or a service. It is
 * the data a real scan would produce for "Northwind Studio", shaped exactly
 * the way the review panel already consumes it (`Projection` + onboarding
 * items), so the visual proof runs on the real review, not a mock of it.
 */
import type { Projection } from '@/features/onboarding/bridge/v4Bridge';
import type { Finding } from '@/features/onboarding/understanding/stages';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';

export const SITE = {
  url: 'https://northwind.studio',
  host: 'northwind.studio',
  name: 'Northwind Studio',
} as const;

/** A second address, so pill-vs-description precedence has something to show. */
export const OLD_SITE_HOST = 'northwind-arch.com';

const svg = (markup: string) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;

const MARK = `
  <circle cx="60" cy="60" r="46" fill="none" stroke="#1F3A2E" stroke-width="7"/>
  <path d="M38 84 V36 L82 84 V36" fill="none" stroke="#1F3A2E" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M22 60 H98" fill="none" stroke="#C8553D" stroke-width="5" stroke-linecap="round"/>`;

export const LOGO_PRIMARY = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120">${MARK}
   <text x="140" y="74" font-family="Georgia, 'Times New Roman', serif" font-size="58" letter-spacing="1" fill="#1F3A2E">Northwind</text>
   <text x="142" y="102" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="7" fill="#C8553D">STUDIO</text>
  </svg>`,
);

export const LOGO_MARK = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${MARK}</svg>`,
);

export const ORIGIN_SITE = 'From your website';
export const ORIGIN_ABOUT = `From ${SITE.host}/about`;
export const ORIGIN_HOME = `From ${SITE.host}`;
export const ORIGIN_READ = 'Read from your website';
export const ORIGIN_BRIEF = 'From your brand profile';

const done = { uploadStatus: 'done' as const, uploadProgress: 1, previewUrl: null };

export function websiteLogos(): OnboardingAsset[] {
  return [
    {
      id: 'wi-logo-primary',
      name: 'northwind-logo.svg',
      sub: ORIGIN_SITE,
      kind: 'image',
      ...done,
      previewUrl: LOGO_PRIMARY,
      sourceUrl: `${SITE.url}/assets/logo.svg`,
      isLogo: true,
      logoSlot: 'primary',
      hasTransparency: true,
    },
    {
      id: 'wi-logo-mark',
      name: 'apple-touch-icon.svg',
      sub: ORIGIN_SITE,
      kind: 'image',
      ...done,
      previewUrl: LOGO_MARK,
      sourceUrl: `${SITE.url}/apple-touch-icon.png`,
      isLogo: true,
      logoSlot: 'mark',
      hasTransparency: true,
    },
  ];
}

export function linkItem(url: string, platform: OnboardingAsset['socialPlatform'], sub = ORIGIN_SITE, handle?: string): OnboardingAsset {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return {
    id: `wi-link-${platform}-${host}`,
    name: platform === 'website' ? host : handle ?? host,
    sub,
    kind: 'link',
    ...done,
    sourceUrl: url,
    socialPlatform: platform,
    ...(handle ? { handle } : {}),
  };
}

/** Colour swatches as the panel's projection effect creates them, seeded early so the panel's own logo extraction sees colours already present. */
export function websiteColors(): OnboardingAsset[] {
  return COLORS.map((c, i) => ({
    id: 'wi-color-' + String(i),
    name: c.hex,
    sub: i === 0 ? 'Primary' : 'Brand color',
    kind: 'color',
    value: c.hex,
    ...done,
  }));
}

export function websiteLinks(): OnboardingAsset[] {
  return [
    linkItem(SITE.url, 'website', 'The link you added'),
    linkItem('https://www.instagram.com/northwind.studio', 'instagram', ORIGIN_SITE, '@northwind.studio'),
    linkItem('https://www.linkedin.com/company/northwind-studio', 'linkedin', ORIGIN_SITE, 'northwind-studio'),
    linkItem('https://www.pinterest.com/northwindstudio', 'pinterest', ORIGIN_SITE, 'northwindstudio'),
  ];
}

const COLORS: Projection['colors'] = [
  { hex: '#1F3A2E', primary: true },
  { hex: '#E4D9C3', primary: false },
  { hex: '#C8553D', primary: false },
];

const FONTS: Projection['fonts'] = [
  { family: 'Playfair Display', origin: 'website' },
  { family: 'Inter', origin: 'website' },
];

const LOGO_SLOTS: Projection['logoSlots'] = [
  { assetId: 'wi-logo-primary', slot: 'primary' },
  { assetId: 'wi-logo-mark', slot: 'mark' },
];

const BUSINESS = {
  industry: 'professional-services',
  tagline: 'Spaces that feel like they were always there.',
  description: 'Residential architecture, Interior design, Renovation consulting',
};

const BUSINESS_ORIGINS = {
  industry: ORIGIN_READ,
  tagline: ORIGIN_HOME,
  description: `From ${SITE.host}/services`,
};

const SUMMARY =
  'Northwind Studio is a Copenhagen architecture and interiors practice that designs calm, durable homes — new builds, renovations and the interiors that finish them.';

const MISSION =
  'To make homes that age well: built from honest materials, planned around daylight, and finished so nothing needs replacing in a decade.';

/** The full read: every section answered from the site, in the review's shape. */
export function projectionComplete(): Projection {
  return {
    colors: COLORS,
    colorOrigin: 'website',
    fonts: FONTS,
    logoSlots: LOGO_SLOTS,
    duplicateIds: [],
    slogan: BUSINESS.tagline,
    industryLabel: 'Professional Services',
    styleLabels: ['Minimal', 'Elegant', 'Organic'],
    business: BUSINESS,
    businessOrigins: BUSINESS_ORIGINS,
    profile: [
      { path: 'strategy.summary', value: SUMMARY, origin: ORIGIN_HOME },
      { path: 'visualStyle.descriptors', vocab: 'style', value: ['minimal', 'elegant', 'organic'], origin: ORIGIN_READ },
      { path: 'strategy.personality', vocab: 'personality', value: ['confident', 'sophisticated', 'warm'], origin: ORIGIN_READ },
      { path: 'voice.tone', vocab: 'tone', value: 'calm', origin: ORIGIN_READ },
      { path: 'strategy.values', vocab: 'values', value: ['craftsmanship', 'sustainability', 'care'], origin: ORIGIN_ABOUT },
      { path: 'strategy.mission', value: MISSION, origin: ORIGIN_ABOUT },
      { path: 'strategy.targetAudience', value: 'Luxury buyers', origin: ORIGIN_READ },
      { path: 'strategy.positioning', value: 'Boutique specialist', origin: ORIGIN_READ },
    ],
  };
}

/** The About page did not load: no mission, no values from it; everything else stands. */
export function projectionPartial(): Projection {
  const full = projectionComplete();
  return {
    ...full,
    profile: full.profile.filter((r) => r.origin !== ORIGIN_ABOUT),
  };
}

/** The site was read but never interpreted: facts and material only, no strategy. */
export function projectionExtractedOnly(): Projection {
  const full = projectionComplete();
  return {
    ...full,
    styleLabels: [],
    profile: [],
  };
}

/** No site at all: the brand as the pasted brief and nothing else left it. */
export function projectionBriefOnly(): Projection {
  return {
    colors: [],
    fonts: [],
    logoSlots: [],
    duplicateIds: [],
    slogan: '',
    industryLabel: 'Professional Services',
    styleLabels: [],
    business: { industry: 'professional-services' },
    businessOrigins: { industry: ORIGIN_BRIEF },
    profile: [
      {
        path: 'strategy.summary',
        value: 'An architecture and interiors studio in Copenhagen designing calm, long-lasting homes.',
        origin: ORIGIN_BRIEF,
      },
      { path: 'voice.tone', vocab: 'tone', value: 'calm', origin: ORIGIN_BRIEF },
      { path: 'strategy.values', vocab: 'values', value: ['craftsmanship', 'sustainability'], origin: ORIGIN_BRIEF },
    ],
  };
}

// ── The scan, scripted ────────────────────────────────────────────────────

export type ScanStageId =
  | 'opening'
  | 'signals'
  | 'identity'
  | 'pages'
  | 'voice'
  | 'visual'
  | 'profile'
  | 'saving';

/** Every stage of a website scan, in order. The index IS the ring node. */
export const SCAN_STAGES: ReadonlyArray<{ id: ScanStageId; label: string }> = [
  { id: 'opening', label: `Opening ${SITE.host}` },
  { id: 'signals', label: 'Reading brand signals' },
  { id: 'identity', label: 'Finding your identity' },
  { id: 'pages', label: 'Exploring key pages' },
  { id: 'voice', label: 'Understanding your voice' },
  { id: 'visual', label: 'Analysing visual language' },
  { id: 'profile', label: 'Building your brand profile' },
  { id: 'saving', label: 'Saving your brand' },
];

export interface ScanEvent {
  /** ms after the scan starts. */
  at: number;
  stage: ScanStageId;
  /** A real observation, or nothing to say. */
  finding?: Finding | null;
}

export type Scenario = 'complete' | 'partial' | 'unavailable' | 'extracted';

export interface ScanScript {
  scenario: Scenario;
  /** Stages this run performs. A stage not listed is unrepresentable. */
  stages: ScanStageId[];
  events: ScanEvent[];
  /** When the work resolves. */
  endAt: number;
}

const ALL = SCAN_STAGES.map((s) => s.id);

export const SCRIPTS: Record<Scenario, ScanScript> = {
  complete: {
    scenario: 'complete',
    stages: ALL,
    events: [
      { at: 450, stage: 'opening', finding: null },
      { at: 1150, stage: 'signals', finding: { label: 'Socials', value: 'Instagram · LinkedIn · Pinterest' } },
      { at: 2100, stage: 'identity', finding: { label: 'Logo', value: 'found' } },
      { at: 2700, stage: 'pages', finding: { label: 'Pages', value: '4 read' } },
      { at: 3400, stage: 'visual', finding: { label: 'Colours', value: '3 found · Playfair + Inter' } },
      { at: 5300, stage: 'voice', finding: { label: 'Tone', value: 'Calm' } },
      { at: 5750, stage: 'profile', finding: { label: 'Profile', value: '9 of 11 answered' } },
      { at: 6250, stage: 'saving', finding: null },
    ],
    endAt: 6350,
  },
  partial: {
    scenario: 'partial',
    stages: ALL,
    events: [
      { at: 450, stage: 'opening', finding: null },
      { at: 1150, stage: 'signals', finding: { label: 'Socials', value: 'Instagram · LinkedIn · Pinterest' } },
      { at: 2100, stage: 'identity', finding: { label: 'Logo', value: 'found' } },
      { at: 4300, stage: 'pages', finding: { label: 'Pages', value: '3 of 4 read' } },
      { at: 3400, stage: 'visual', finding: { label: 'Colours', value: '3 found · Playfair + Inter' } },
      { at: 5600, stage: 'voice', finding: { label: 'Tone', value: 'Calm' } },
      { at: 6000, stage: 'profile', finding: { label: 'Profile', value: '7 of 11 answered' } },
      { at: 6400, stage: 'saving', finding: null },
    ],
    endAt: 6500,
  },
  unavailable: {
    scenario: 'unavailable',
    stages: ['opening'],
    events: [{ at: 2600, stage: 'opening', finding: null }],
    endAt: 2700,
  },
  extracted: {
    scenario: 'extracted',
    stages: ALL,
    events: [
      { at: 450, stage: 'opening', finding: null },
      { at: 1150, stage: 'signals', finding: { label: 'Socials', value: 'Instagram · LinkedIn · Pinterest' } },
      { at: 2100, stage: 'identity', finding: { label: 'Logo', value: 'found' } },
      { at: 2700, stage: 'pages', finding: { label: 'Pages', value: '4 read' } },
      { at: 3400, stage: 'visual', finding: { label: 'Colours', value: '3 found · Playfair + Inter' } },
      { at: 3900, stage: 'voice', finding: null },
      { at: 4400, stage: 'profile', finding: { label: 'Facts', value: '3 saved' } },
      { at: 4900, stage: 'saving', finding: null },
    ],
    endAt: 5000,
  },
};

/** Text for the setup screen, per entry variant. */
export const DESCRIPTIONS = {
  empty: '',
  detected: `We're an architecture and interiors studio in Copenhagen. Everything about us is on ${SITE.host} — the projects, the team, how we work.`,
  pill: 'Architecture and interiors studio in Copenhagen. Calm, durable homes; renovations and new builds.',
  both: `Architecture and interiors studio in Copenhagen. Our old site ${OLD_SITE_HOST} still has the early projects.`,
} as const;

export type EntryVariant = keyof typeof DESCRIPTIONS;
