/**
 * What the Brand Identity page knows, read once.
 *
 * ── Why a model rather than fifteen sections each reading the brand ───────
 *
 * The page has fifteen sections and every one of them must answer the same two
 * questions: what does this brand have, and does it have enough of it to be
 * worth a section? Answering those inside each section produces fifteen
 * slightly different opinions about emptiness — one checks `length`, another
 * checks a string, a third forgets — and a page that hides a section in one
 * place while the nav still lists it in another.
 *
 * So presence is computed HERE, once, and every section carries an explicit
 * `present` flag. A section that is not present is never CONSTRUCTED: it is
 * absent from the model, absent from the nav, and absent from the scroll
 * rhythm. Nothing is hidden with CSS, because hidden-with-CSS is how a page
 * ends up with a gap where a section used to be.
 *
 * ── The sentinel rule ────────────────────────────────────────────────────
 *
 * `brands.primary_color` is NOT NULL and the canonical schema demands a hex and
 * a non-empty font family, so a brand that has decided nothing still carries
 * `#8A877E` and `system-ui` — recorded as placeholders on the onboarding
 * marker. Nothing else in the product consults that marker, which is how a
 * mid-grey nobody chose ends up presented as "the brand colour".
 *
 * A placeholder is ABSENCE here. It is not a value with an asterisk; the
 * section simply does not exist, exactly as if the field were empty — because
 * for the purpose of showing someone a brand, it is.
 *
 * ── What it refuses to do ────────────────────────────────────────────────
 *
 * It never invents. No default palette, no sample copy, no "Your tagline
 * here". A thin brand produces a short page, and a short page that is honest
 * looks deliberate; a long page padded with placeholders looks broken.
 */
import type { Brand } from '@/shared/types/brand';
import type { CanonicalBrand } from '@/domain/brand';
import { fromLegacyBrand } from '@/domain/brand';
import type { ColorToken, FontToken, LogoRole, LogoUsageRule } from '@/shared/types/brandAssets';
import { placeholderPaths } from '@/shared/onboarding/onboardingState';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { LOGO_ROLE_DEFS, type LogoRoleDef } from '@/shared/brand/logoRoles';
import { VOCABULARIES, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';

/** The sections the page can contain, in narrative order. */
export const IDENTITY_SECTIONS = [
  'hero',
  'introduction',
  'purpose',
  'personality',
  'logo',
  'logoUsage',
  'colour',
  'typography',
  'voice',
  'photography',
  'assets',
  'social',
  'downloads',
  'closing',
] as const;

export type IdentitySectionId = (typeof IDENTITY_SECTIONS)[number];

/** The name each section wears in the nav and its own header. */
export const SECTION_LABEL: Record<IdentitySectionId, string> = {
  hero: 'Overview',
  introduction: 'Introduction',
  purpose: 'Purpose',
  personality: 'Personality',
  logo: 'Logo',
  logoUsage: 'Logo usage',
  colour: 'Colour',
  typography: 'Typography',
  voice: 'Tone of voice',
  photography: 'Photography',
  assets: 'Assets',
  social: 'Social',
  downloads: 'Downloads',
  closing: 'Closing',
};

// ── The shapes each section renders from ──────────────────────────────────

export interface IdentityLogo {
  def: LogoRoleDef;
  url: string;
  /** The Library id, when this came through a ref. Used for downloads. */
  assetId?: string;
  format: string;
}

export interface IdentityColour {
  hex: string;
  /** The role this colour plays, in the user's language. */
  role: string;
  rgb: string;
  cmyk: string;
  /** True for the one colour the brand leads with. */
  lead: boolean;
}

export interface IdentityFont {
  role: 'Primary' | 'Secondary' | 'Accent';
  token: FontToken;
  /** Uploaded binaries, when the brand brought its own. */
  files: NonNullable<FontToken['files']>;
}

export interface IdentityImage {
  id: string;
  url: string;
  name: string;
}

export interface IdentityModel {
  brand: Brand;
  canonical: CanonicalBrand;
  name: string;
  /** Present only when the brand actually has one. */
  tagline?: string;

  hero: { present: true; logo?: IdentityLogo };
  introduction: { present: boolean; summary?: string; industry?: string; descriptors: string[] };
  purpose: {
    present: boolean;
    mission?: string;
    vision?: string;
    positioning?: string;
    audience?: string;
  };
  personality: { present: boolean; traits: string[]; values: string[] };
  logo: { present: boolean; variants: IdentityLogo[] };
  logoUsage: { present: boolean; clearSpace?: string; minSize?: string; rules: LogoUsageRule[] };
  colour: { present: boolean; colours: IdentityColour[] };
  typography: { present: boolean; fonts: IdentityFont[] };
  voice: {
    present: boolean;
    tone?: string;
    traits: string[];
    doList: string[];
    dontList: string[];
    examples: Array<{ context: string; text: string }>;
  };
  photography: { present: boolean; images: IdentityImage[] };
  assets: { present: boolean; groups: Array<{ name: string; items: IdentityImage[] }> };
  social: { present: boolean };
  downloads: { present: true };
  closing: { present: true; statement?: string };
}

// ── Reading ───────────────────────────────────────────────────────────────

const nonEmpty = (v: string | undefined | null): string | undefined => {
  const t = (v ?? '').trim();
  return t ? t : undefined;
};

/** A stored vocabulary id, read back as a person's word. */
function label(vocab: VocabularyName, id: string): string {
  return VOCABULARIES[vocab].find((m) => m.id === id)?.label ?? id;
}

function rgbOf(hex: string): string {
  const v = hex.replace('#', '');
  if (v.length !== 6) return '';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `${r}, ${g}, ${b}`;
}

/**
 * CMYK, DERIVED from the hex — never stored beside it.
 *
 * The reference site hand-typed its swatch metadata and it drifted: a swatch
 * named "Water blue" rendering gold, another named "Orange" rendering
 * near-black, CMYK values that were simply invented. On a colour specification
 * page that destroys the document's authority in one glance. A value computed
 * from the colour cannot disagree with the colour.
 *
 * This is the naive conversion, which is the honest one without a colour
 * profile: print output depends on the profile, and pretending otherwise would
 * be inventing precision.
 */
function cmykOf(hex: string): string {
  const v = hex.replace('#', '');
  if (v.length !== 6) return '';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return '0, 0, 0, 100';
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c, m, y, k].map((n) => Math.round(n * 100)).join(', ');
}

function logoFor(brand: Brand, def: LogoRoleDef): IdentityLogo | undefined {
  const found = resolveBrandLogo(brand, def.role as LogoRole);
  if (!found?.url) return undefined;
  return { def, url: found.url, assetId: found.assetId, format: found.format };
}

export interface BuildIdentityInput {
  brand: Brand;
  /** Library images, when they have been loaded. Absent means "not yet". */
  images?: IdentityImage[];
  /** Library material grouped for the Assets section. */
  assetGroups?: Array<{ name: string; items: IdentityImage[] }>;
}

export function buildIdentityModel({
  brand,
  images = [],
  assetGroups = [],
}: BuildIdentityInput): IdentityModel {
  const canonical = fromLegacyBrand(brand);
  const identity = canonical.identity;
  const business = canonical.businessInfo ?? {};
  // A stand-in is not a decision. See the sentinel rule above.
  const sentinels = placeholderPaths(brand);
  const decided = (path: string) => !sentinels.includes(path);

  // ── Logos ───────────────────────────────────────────────────────────
  const variants = LOGO_ROLE_DEFS.map((def) => logoFor(brand, def)).filter(
    (v): v is IdentityLogo => Boolean(v),
  );
  const heroLogo =
    variants.find((v) => v.def.role === 'primary') ??
    variants.find((v) => v.def.role === 'iconmark') ??
    variants[0];

  // ── Colours ─────────────────────────────────────────────────────────
  const colours: IdentityColour[] = [];
  const pushColour = (token: ColorToken | undefined, role: string, lead = false) => {
    const hex = nonEmpty(token?.hex)?.toUpperCase();
    if (!hex) return;
    if (colours.some((c) => c.hex === hex)) return;
    colours.push({ hex, role, rgb: rgbOf(hex), cmyk: cmykOf(hex), lead });
  };
  if (decided('colors.primary')) pushColour(identity?.colors?.primary, 'Primary', true);
  pushColour(identity?.colors?.secondary, 'Secondary');
  pushColour(identity?.colors?.accent, 'Accent');
  for (const n of identity?.colors?.neutrals ?? []) pushColour(n, 'Neutral');

  // ── Typography ──────────────────────────────────────────────────────
  const fonts: IdentityFont[] = [];
  const pushFont = (token: FontToken | undefined, role: IdentityFont['role'], ok = true) => {
    const family = nonEmpty(token?.family);
    if (!family || !ok) return;
    fonts.push({ role, token: token!, files: token?.files ?? [] });
  };
  pushFont(identity?.typography?.primary, 'Primary', decided('typography.primary'));
  pushFont(identity?.typography?.secondary, 'Secondary');
  pushFont(identity?.typography?.accent, 'Accent');

  // ── Strategy + voice ────────────────────────────────────────────────
  const strategy = identity?.strategy;
  const voice = identity?.voice;
  const traits = (strategy?.personality ?? []).map((p) => label('personality', p));
  const values = (strategy?.values ?? []).map((v) => label('values', v));
  const descriptors = ((identity?.visualStyle?.descriptors ?? []) as string[]).map((d) =>
    label('style', d),
  );

  const summary = nonEmpty(strategy?.summary);
  const mission = nonEmpty(strategy?.mission);
  const vision = nonEmpty(strategy?.vision);
  const positioning = nonEmpty(strategy?.positioning);
  const audience = nonEmpty(strategy?.targetAudience) ?? nonEmpty(business.audienceSummary);
  const tagline = nonEmpty(business.tagline);
  const industry = business.industry ? label('industry', business.industry) : undefined;
  const tone = voice?.tone ? label('tone', voice.tone) : undefined;

  const usageRules = identity?.logos?.usage ?? [];
  const clearSpace = nonEmpty(identity?.logos?.clearSpace);
  const minSize = nonEmpty(identity?.logos?.minSize);

  return {
    brand,
    canonical,
    name: brand.name,
    ...(tagline ? { tagline } : {}),

    hero: { present: true, ...(heroLogo ? { logo: heroLogo } : {}) },

    introduction: {
      present: Boolean(summary || industry || descriptors.length),
      ...(summary ? { summary } : {}),
      ...(industry ? { industry } : {}),
      descriptors,
    },

    purpose: {
      present: Boolean(mission || vision || positioning || audience),
      ...(mission ? { mission } : {}),
      ...(vision ? { vision } : {}),
      ...(positioning ? { positioning } : {}),
      ...(audience ? { audience } : {}),
    },

    personality: { present: traits.length + values.length > 0, traits, values },

    logo: { present: variants.length > 0, variants },

    logoUsage: {
      present: Boolean(clearSpace || minSize || usageRules.length),
      ...(clearSpace ? { clearSpace } : {}),
      ...(minSize ? { minSize } : {}),
      rules: usageRules,
    },

    colour: { present: colours.length > 0, colours },

    typography: { present: fonts.length > 0, fonts },

    voice: {
      present: Boolean(
        tone || (voice?.doList?.length ?? 0) || (voice?.dontList?.length ?? 0) || (voice?.examples?.length ?? 0),
      ),
      ...(tone ? { tone } : {}),
      traits,
      doList: voice?.doList ?? [],
      dontList: voice?.dontList ?? [],
      examples: voice?.examples ?? [],
    },

    photography: { present: images.length > 0, images },

    assets: {
      present: assetGroups.some((g) => g.items.length > 0),
      groups: assetGroups.filter((g) => g.items.length > 0),
    },

    /*
     * Social designs render from the brand itself — there is nothing stored to
     * be present or absent. They need a logo or a decided colour to be worth
     * showing at all; without either they would be grey rectangles with a
     * letter in them, which is not an application of anything.
     */
    social: { present: variants.length > 0 || colours.length > 0 },

    downloads: { present: true },

    closing: {
      present: true,
      ...(tagline || summary ? { statement: tagline ?? summary } : {}),
    },
  };
}

/** The sections this brand actually has, in order. What the nav lists. */
export function presentSections(model: IdentityModel): IdentitySectionId[] {
  return IDENTITY_SECTIONS.filter((id) => {
    const section = model[id] as { present?: boolean } | undefined;
    return Boolean(section?.present);
  });
}
