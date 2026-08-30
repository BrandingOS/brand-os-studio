import type { Brand } from '@/shared/types/brand';
import { fromLegacyBrand, type CanonicalBrand } from '@/domain/brand';
import type {
  AboutEntry,
  BrandColor,
  BrandFont,
  BrandLink,
  BrandLogo,
  BrandPhoto,
  BrandStrategyFields,
  BrandWebsite,
  MockBrand,
} from './mockBrand';
import { hexToName } from './colorNames';
import { NEUTRAL_RAMP } from './neutralRamp';
import { suggestIconsForBrand } from '@/features/brand-kit/data/suggestIcons';
import { detectIconWeight, type IconWeightId } from '@/features/brand-kit/data/iconWeights';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { logoRefByRole } from '@/shared/brand/logoRoles';
import type { LogoRole } from '@/shared/types/brandAssets';

/**
 * Best-effort mapper from the canonical `Brand` shape (store / Supabase)
 * into the richer `MockBrand` shape SetupPage renders.
 *
 * Setup's UI expects specific slices (core/accent/grey colors, multiple
 * logos, photo slots A-F, etc.) that don't map 1:1 to the canonical
 * Brand type. We fill in what we can and leave sensible empties for the
 * rest — so a freshly-loaded brand renders meaningfully without the
 * page crashing on missing fields.
 *
 * This is a READ-ONLY view. Mutations in Setup still live in local
 * component state; wiring writes back to the brand store is a
 * separate follow-up.
 */
export function brandToMockBrand(brand: Brand): MockBrand {
  /*
   * The CANONICAL brand, read once and shared by the mappers that need it.
   *
   * Setup used to read `guidelines.strategy` and `guidelines.aboutSections`
   * directly. Nothing writes those any more — the canonical ops write the
   * identity blob, and `toLegacyBrandPatch` deliberately skips the guidelines
   * mirror — so everything a user answered during onboarding was on the record
   * and invisible here. `fromLegacyBrand` is the one reader that resolves both
   * homes in the right order.
   */
  const canonical = fromLegacyBrand(brand);
  return {
    name: brand.name,
    logos: mapLogos(brand),
    // The brand's own policy about its logo system. Spread rather than set,
    // so a brand that has never expressed one carries no field at all and
    // every reader falls back to the derived answer.
    ...(brand.guidelines?.logoUsage?.grounds
      ? { logoGrounds: [...brand.guidelines.logoUsage.grounds] }
      : {}),
    ...(brand.guidelines?.logoUsage?.treatments
      ? { logoTreatments: [...brand.guidelines.logoUsage.treatments] }
      : {}),
    colors: mapColors(brand),
    fonts: mapFonts(brand),
    icons: mapIcons(brand),
    ...(brand.guidelines?.iconography?.pack
      ? { iconPack: brand.guidelines.iconography.pack }
      : {}),
    ...(brand.guidelines?.iconography?.tint
      ? { iconTint: brand.guidelines.iconography.tint }
      : {}),
    photos: mapPhotos(brand),
    websites: mapWebsites(brand, canonical),
    voice: mapVoice(brand),
    about: mapAbout(canonical),
    strategy: mapStrategy(canonical),
    links: mapLinks(canonical),
  };
}

/**
 * The eleven answers, read out of the canonical brand.
 *
 * Core values (summary, audience, positioning, mission, personality, tone,
 * style) come from the identity; the three that are FACTS about the business
 * (industry, products/services, slogan) come from Business Info — the same
 * split the review uses, and the same reason: an industry is not a brand
 * decision with an authority, it is a fact that saves on edit.
 */
function mapStrategy(c: CanonicalBrand): BrandStrategyFields {
  const s = c.identity?.strategy;
  const b = c.businessInfo ?? {};
  return {
    summary: s?.summary ?? '',
    industry: b.industry ?? '',
    products: b.description ?? '',
    audience: s?.targetAudience ?? '',
    positioning: s?.positioning ?? '',
    mission: s?.mission ?? '',
    personality: s?.personality ?? [],
    tone: c.identity?.voice?.tone ?? '',
    style: (c.identity?.visualStyle?.descriptors ?? []) as string[],
    values: s?.values ?? [],
    slogan: b.tagline ?? '',
  };
}

/** The brand's other addresses. The website itself lives in `websites`. */
function mapLinks(c: CanonicalBrand): BrandLink[] {
  const website = c.businessInfo?.contact?.website;
  return (c.businessInfo?.links ?? [])
    .filter((l) => l.url && l.url !== website)
    .map((l, i) => ({
      id: `link-${i}`,
      kind: l.kind,
      url: l.url,
      ...(l.label ? { label: l.label } : {}),
    }));
}

// Neutral surface tones used for logo tiles. We never pull from the
// brand palette here — the tile is just a stage for the artwork.
const LIGHT_BG = '#F5F4EF';
const DARK_BG = '#111113';

function mapLogos(brand: Brand): BrandLogo[] {
  const logos: BrandLogo[] = [];

  /*
   * A logo slot is a REFERENCE, so it has to be resolved.
   *
   * `logoSystem.primary.url` was read here as though a slot carried its own
   * url. It does not and never did — `LogoRef` is `{ assetId }` — so the whole
   * v3 path was dead and this fell through to the legacy scalars every time.
   * A brand whose logos went through the canonical upload (onboarding, the
   * Brand Kit, LogoUploader) had a complete logo system and Setup showed it a
   * lettermark placeholder.
   *
   * `resolveBrandLogo` is the one reader that knows how: ref → the Library
   * projection on `brandAssets` → the best file for that format. The legacy
   * scalars stay as the fallback for brands that predate the refs.
   */
  const bySlot = (role: LogoRole) => resolveBrandLogo(brand, role)?.url;
  // A name the user gave the variant. `LogoRef.description` is the one field
  // the model has for it; absent, the role's own name is the label.
  //
  // But a DESCRIPTION is not always a NAME. Onboarding writes a paragraph
  // there ("The RAQM wordmark features bold geometric letterforms…"), and
  // used verbatim it became the tile caption, the export filename and a
  // 600px-tall column in the logo picker. A name is short and has no
  // sentence punctuation; anything else keeps the role's own name.
  const nameOf = (role: LogoRole, fallback: string) => {
    const text = logoRefByRole(brand, role)?.description?.trim() ?? '';
    return looksLikeAName(text) ? text : fallback;
  };

  const primaryUrl = bySlot('primary') ?? brand.logoAssets?.full ?? brand.logo;
  const wordmarkUrl = bySlot('wordmark') ?? brand.logoAssets?.wordmark;
  const iconUrl = bySlot('iconmark') ?? brand.logoAssets?.icon;
  // `BrandLogoAssets.light` is the LIGHT-colored logo (for use ON a dark
  // surface), and `.dark` is the DARK-colored logo (for use ON a light
  // surface). The naming flipped between the legacy field and the
  // onboarding slot, so be careful here.
  const lightLogoUrl = bySlot('mono.white') ?? brand.logoAssets?.light; // for dark backgrounds
  const darkLogoUrl = bySlot('mono.black') ?? brand.logoAssets?.dark; // for light backgrounds
  const alternateUrl = bySlot('secondary') ?? brand.logoAssets?.alternate;
  // The two orientation lockups. Onboarding places both and Setup had no tile
  // for either, so a brand that arrived with a horizontal and a stacked lockup
  // showed neither and lost them on the next save.
  const horizontalUrl = bySlot('horizontal');
  const stackedUrl = bySlot('stacked');

  const seen = new Set<string>();
  const pushOnce = (url: string | undefined, entry: BrandLogo) => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    logos.push(entry);
  };

  // Default tile uses a safe neutral cream — it never matches the brand's
  // primary color, so a logo rendered in that color doesn't disappear
  // (e.g., a yellow KAAFEX logo on yellow). For light-colored logos that
  // would vanish on cream, the explicit "On dark" variant covers that
  // case. We deliberately do NOT pull the bg from `primaryColor` here —
  // that's where the "yellow on yellow" / "blue tinted" surprises came
  // from.
  if (primaryUrl) {
    pushOnce(primaryUrl, {
      id: 'primary',
      label: nameOf('primary', 'Primary'),
      variant: 'light',
      role: 'primary',
      svg: buildLogoSvg(primaryUrl, brand.name, LIGHT_BG, '#111113'),
    });
  }
  // Light-colored logo (designed to sit on a dark surface) — always dark bg.
  pushOnce(lightLogoUrl, {
    id: 'on-dark',
    label: nameOf('mono.white', 'On dark'),
    variant: 'dark',
    role: 'mono.white',
    svg: buildLogoSvg(lightLogoUrl!, brand.name, DARK_BG, '#F5F4EF'),
  });
  // Dark-colored logo (designed to sit on a light surface) — always light bg.
  pushOnce(darkLogoUrl, {
    id: 'on-light',
    label: nameOf('mono.black', 'On light'),
    variant: 'light',
    role: 'mono.black',
    svg: buildLogoSvg(darkLogoUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(iconUrl, {
    id: 'mark',
    label: nameOf('iconmark', 'Icon'),
    variant: 'light',
    role: 'iconmark',
    svg: buildLogoSvg(iconUrl!, brand.name.slice(0, 1), LIGHT_BG, '#111113'),
  });
  pushOnce(wordmarkUrl, {
    id: 'wordmark',
    label: nameOf('wordmark', 'Wordmark'),
    variant: 'light',
    role: 'wordmark',
    svg: buildLogoSvg(wordmarkUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(horizontalUrl, {
    id: 'horizontal',
    label: nameOf('horizontal', 'Horizontal'),
    variant: 'light',
    role: 'horizontal',
    svg: buildLogoSvg(horizontalUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(stackedUrl, {
    id: 'vertical',
    label: nameOf('stacked', 'Vertical'),
    variant: 'light',
    role: 'stacked',
    svg: buildLogoSvg(stackedUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(alternateUrl, {
    id: 'alternate',
    label: nameOf('secondary', 'Alternate'),
    variant: 'light',
    role: 'secondary',
    svg: buildLogoSvg(alternateUrl!, brand.name, LIGHT_BG, '#111113'),
  });

  if (logos.length === 0) {
    // No logo at all — render a text-based placeholder in the brand's
    // primary color on the neutral tile so the section isn't empty.
    logos.push({
      id: 'placeholder',
      label: 'Primary',
      variant: 'light',
      svg: buildTextLogo(brand.name, LIGHT_BG, brand.primaryColor),
    });
  }
  return logos;
}

/** Short, no sentence punctuation, fewer than seven words — a label, not prose. */
export function looksLikeAName(text: string): boolean {
  if (!text) return false;
  if (text.length > 40) return false;
  // Sentence punctuation, parentheses and a hex code are all prose tells.
  if (/[.!?;:()#]/.test(text)) return false;
  return text.split(/\s+/).length <= 6;
}

function buildLogoSvg(url: string, label: string, bg: string, fg: string): string {
  // Embed an <image> referencing the asset URL. Falls back to a text
  // mark if the image fails to load.
  const safeLabel = label.replace(/[<>&]/g, '');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="${bg}"/>
    <image href="${url}" x="20" y="20" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
    <text x="50%" y="95%" text-anchor="middle" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="10" opacity="0">${safeLabel}</text>
  </svg>`;
}

function buildTextLogo(name: string, bg: string, fg: string): string {
  const safeName = name.replace(/[<>&]/g, '');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="${bg}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="${fg}" font-family="Instrument Serif, serif" font-size="42" font-weight="400" letter-spacing="-1">${safeName}</text>
  </svg>`;
}

function mapColors(brand: Brand): MockBrand['colors'] {
  // Color names always come from the hex itself (`hexToName` →
  // "Rose", "Black", "White", …) rather than the usage role
  // ("Primary", "Background") OR the rich palette label ("SKAM Red",
  // "Pure White"). Setup and Brand Kit both render `color.name`, so
  // this keeps the displayed label consistent across both pages and
  // matches what `hexToName` already produces when the user adds a
  // new color in setup.
  //
  // We deliberately ignore `brand.colorSystem.*.name` here even though
  // it gets populated by `migrateBrandToCurrent` from
  // `guidelines.colorPalette` — keeping a single source of truth
  // (`hexToName(hex)`) avoids "SKAM Red" leaking into one page while
  // setup shows "Rose" for the same swatch. Duplicates inside a group
  // get suffixed ("Rose", "Rose 2"), matching setup's add-color flow.
  const core: BrandColor[] = [];
  const primary =
    brand.colorSystem?.primary?.hex ?? brand.primaryColor;
  const secondary =
    brand.colorSystem?.secondary?.hex ?? brand.secondaryColor ?? '#F1EEE4';
  // Only surface a background swatch the brand actually has — inventing a
  // default near-black here made onboarded brands show a core color the
  // user never picked.
  const background = brand.colorSystem?.background?.hex;
  // Every swatch the user picked beyond primary/secondary/accent. Stored on
  // `neutrals` locally and inside `guidelines.colorPalette.neutral` on
  // Supabase (no column for them) — `migrateBrandToCurrent` hydrates the
  // latter into `colorSystem.neutrals`.
  //
  // Capped hard: some brands carry a whole generated grey ramp in that field,
  // and dumping 30+ swatches into Core turns the brand's palette into a
  // gradient strip (and starves the Neutral ramp of hexes). A brand palette
  // is a handful of colors — anything past that is machine-generated filler.
  const EXTRA_CORE_LIMIT = 6;
  const isGreyscale = (hex: string): boolean => {
    const v = hex.replace('#', '');
    if (v.length !== 6) return false;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
    return Math.max(r, g, b) - Math.min(r, g, b) < 14;
  };
  /*
   * THE SAME COLOUR REACHES US TWICE, AND IT MUST ONLY BE COUNTED ONCE.
   *
   * `colorSystem.neutrals` is hydrated by `migrateBrandToCurrent` from
   * `guidelines.colorPalette.neutral`, and `brand.neutrals` is the scalar the
   * Setup chain writes — they are two views of ONE list, so the moment anything
   * saves the palette back the brand holds both copies. Concatenating them
   * doubled the count, which tripped the generated-ramp tell below, whose
   * greyscale filter then dropped every one of them: renaming a colour in the
   * Brand Kit's Colors panel deleted the brand's five neutrals and left a
   * three-colour palette (QA Q1). Dedupe on the hex, before anything measures
   * the length.
   */
  const seenStored = new Set<string>();
  const stored = [
    ...(brand.colorSystem?.neutrals ?? []).map((n) => n.hex),
    ...(brand.neutrals ?? []),
  ]
    .filter(Boolean)
    .filter((hex) => {
      const key = hex.toUpperCase().replace(/^#?/, '#');
      if (seenStored.has(key)) return false;
      seenStored.add(key);
      return true;
    });
  /*
   * A SHORT list is a palette; a long one is a generated ramp.
   *
   * Greys used to be filtered out of Core unconditionally, on the grounds that
   * they belong to the Neutral ladder. That is right for the 30-step ramps some
   * brands carry — and wrong for the third colour of a three-colour palette,
   * which is very often an off-white. A brand that chose #F5F5F0 saw it on the
   * onboarding review and then could not find it in Setup at all: too grey for
   * Core, not on the canonical ladder either.
   *
   * The length is the tell, and it is NOT the same number as the cap. A ramp is
   * thirty-odd steps; a hand-picked palette that runs one past the six Core can
   * show is still hand-picked, and answering "generated" there threw the whole
   * palette away rather than showing six of it.
   */
  const GENERATED_RAMP_MIN = 12;
  const looksGenerated = stored.length >= GENERATED_RAMP_MIN;
  const extraColors = (looksGenerated ? stored.filter((hex) => !isGreyscale(hex)) : stored).slice(
    0,
    EXTRA_CORE_LIMIT,
  );

  // Shared dedupe state across ALL color groups (core / accent / grey).
  // - usedNames keeps every label unique across the whole palette so
  //   "Black" can't appear twice between Core and Neutral.
  // - usedHexes drops the literal duplicate before we even try to name
  //   it, so the same swatch can't show up in two groups (or twice in
  //   one group from different sources).
  const usedNames = new Set<string>();
  const usedHexes = new Set<string>();
  const normHex = (hex: string) => hex.toUpperCase().replace(/^#?/, '#');

  /*
   * A NAME THE USER TYPED OUTRANKS THE ONE WE DERIVED.
   *
   * Everything else here names a swatch from the hex (`hexToName`) so Setup and
   * the Brand Kit never disagree about what a colour is called. That is the
   * right default and the wrong absolute: the Kit's Colors panel offers a name
   * field, and with nowhere to keep the answer a rename was accepted,
   * confirmed, and gone on the next read (QA Q1).
   *
   * `guidelines.colorNames` is that home — hex → the name its owner chose,
   * written only for names that differ from the derived one, so a brand nobody
   * has renamed carries no map and reads exactly as before.
   */
  const chosenNames = new Map<string, string>(
    Object.entries(brand.guidelines?.colorNames ?? {}).map(([hex, name]) => [
      normHex(hex),
      name,
    ]),
  );

  const pushUnique = (
    bucket: BrandColor[],
    hex: string,
    explicitName: string | undefined,
  ): boolean => {
    const norm = normHex(hex);
    if (usedHexes.has(norm)) return false;
    usedHexes.add(norm);
    const base = explicitName ?? chosenNames.get(norm) ?? hexToName(norm);
    let name = base;
    let n = 2;
    while (usedNames.has(name)) {
      name = `${base} ${n}`;
      n += 1;
    }
    usedNames.add(name);
    bucket.push({ hex: norm, name });
    return true;
  };

  if (primary) pushUnique(core, primary, undefined);
  if (secondary) pushUnique(core, secondary, undefined);
  if (background) pushUnique(core, background, undefined);
  // The rest of the uploaded palette belongs with the brand's colors, NOT in
  // Accent — a swatch only becomes an accent when the user puts it there.
  for (const hex of extraColors) {
    pushUnique(core, hex, undefined);
  }

  const accent: BrandColor[] = [];
  // NOTE: the canonical field is `colorSystem.accent` (singular). This used
  // to read `colorSystem.accents[0]` — a field that doesn't exist — so an
  // accent the user DID assign silently never rendered here.
  const accentHex = brand.accentColor ?? brand.colorSystem?.accent?.hex;
  if (accentHex) {
    pushUnique(accent, accentHex, undefined);
  }

  // Neutral Colors: a fixed black→white grayscale ramp for every brand —
  // even ones that never uploaded colors and even ones whose stored
  // `neutrals[]` was auto-derived from a primary hue (which produced
  // tinted yellows/blues that didn't read as "neutral"). Any
  // user-stored `brand.neutrals` that's actually grayscale is merged
  // in so genuine custom neutrals still surface; tinted entries are
  // dropped so the section stays a true black-to-white spectrum.
  const greys: BrandColor[] = [];
  // The ramp is canonical and always renders in full. It deliberately does
  // NOT go through `pushUnique`'s shared hex set: a brand whose stored colors
  // happen to include ramp values (e.g. #000000 / #FFFFFF as brand colors)
  // would otherwise have those steps silently swallowed — and a brand storing
  // the whole ramp emptied this section completely.
  for (const { hex, name } of NEUTRAL_RAMP) {
    let label = name;
    let n = 2;
    while (usedNames.has(label)) {
      label = `${name} ${n}`;
      n += 1;
    }
    usedNames.add(label);
    greys.push({ hex: normHex(hex), name: label });
  }
  // Intentionally NOT merging `brand.neutrals` — even when filtered to
  // grayscale, they tend to land near (but not exactly on) the ramp
  // values, slip past the hex-dedupe, and then `hexToName` resolves
  // them to the same handful of words ("Black" / "Onyx" / "Slate"), so
  // every "almost-#080808" leak shows up as "Black 2 / Black 3". The
  // user wants this section to be the canonical black→white ladder
  // without per-brand drift.

  return { core, accent, grey: greys };
}

/**
 * The brand's icon set — WHAT IT OWNS FIRST, a suggestion only when it owns
 * nothing.
 *
 * Reading order matters here and it used to be missing entirely: `mapIcons`
 * re-ran the suggester on every read, so an icon the user added, removed,
 * recoloured or re-weighted was gone by the next paint (audit D11). A stored
 * set is the brand's own decision and outranks anything a heuristic would
 * propose.
 *
 * The suggestion path is now pack-based (`brand-kit/data/iconPacks`) and takes
 * the brand's RECORDED INDUSTRY as its strongest input, because the brand
 * answered that question on purpose.
 */
function mapIcons(brand: Brand): string[] {
  const stored = brand.guidelines?.iconography?.set;
  if (Array.isArray(stored) && stored.length > 0) return [...stored];
  return suggestedIconsFor(brand);
}

/**
 * What this brand would be OFFERED if it owned nothing.
 *
 * Exported because `mockBrandToPatch` needs the same answer: a set that still
 * equals the suggestion is a suggestion, and writing it on a save about
 * something else would commit a decision nobody made.
 */
export function suggestedIconsFor(brand: Brand): string[] {
  return suggestIconsForBrand(iconSourceText(brand), 50, {
    industry: brand.businessInfo?.industry,
    weight: iconWeightOf(brand),
  });
}

/** The brand's own words, in the order a suggester should weigh them. */
function iconSourceText(brand: Brand): string {
  const g = brand.guidelines;
  return [
    brand.name,
    brand.audience,
    brand.tone,
    g?.strategy?.positioning,
    g?.strategy?.vision,
    g?.strategy?.mission,
    ...(g?.aboutSections ?? []).map((s) => `${s.title} ${s.content}`),
  ]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(' ');
}

/** The weight a stored set is drawn at, read off its own class names. */
function iconWeightOf(brand: Brand): IconWeightId | undefined {
  const first = brand.guidelines?.iconography?.set?.[0];
  return first ? detectIconWeight(first) : undefined;
}

function mapFonts(brand: Brand): BrandFont[] {
  const fonts: BrandFont[] = [];
  const primary = brand.typography?.primary?.family ?? brand.fonts.primary;
  const secondary = brand.typography?.secondary?.family ?? brand.fonts.secondary;

  if (primary) {
    fonts.push({
      id: 'primary',
      family: primary,
      role: 'Display',
      weights: brand.typography?.primary?.weights?.join(' · ') ?? 'Regular',
      ...(brand.typography?.primary?.files
        ? { files: brand.typography.primary.files }
        : {}),
    });
  }
  if (secondary && secondary !== primary) {
    fonts.push({
      id: 'secondary',
      family: secondary,
      role: 'Text',
      weights: brand.typography?.secondary?.weights?.join(' · ') ?? 'Regular · Medium · SemiBold',
      ...(brand.typography?.secondary?.files
        ? { files: brand.typography.secondary.files }
        : {}),
    });
  }
  return fonts;
}

function mapPhotos(brand: Brand): BrandPhoto[] {
  // `brandAssets` entries are BrandAsset-shaped (kind + formats), NOT the
  // legacy Asset shape (type + url) — reading `.type`/`.url` here is why
  // onboarding-uploaded photos never showed in Photography.
  const images = (brand.brandAssets ?? [])
    .filter(
      (a) =>
        a.kind === 'image' &&
        // Links get migrated with the fallback kind 'image' — their role
        // ('reference') tells them apart from real photos.
        a.role !== 'reference' &&
        !String(a.role ?? '').startsWith('logo'),
    )
    .slice(0, 6);
  const slots: BrandPhoto['slot'][] = ['A', 'B', 'C', 'D', 'E', 'F'];
  return images
    .map((img, i) => ({
      id: img.id,
      src: Object.values(img.formats ?? {})[0]?.url ?? '',
      slot: slots[i] ?? 'F',
    }))
    .filter((p) => p.src);
}

function mapWebsites(brand: Brand, c: CanonicalBrand): BrandWebsite[] {
  const out: BrandWebsite[] = [];
  const seen = new Set<string>();
  const push = (id: string, url: string | undefined) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ id, url, live: true });
  };
  push('public', brand.publicUrl);
  // Business Info holds the address too, and it is the one onboarding's
  // review edits. A brand whose website was typed on the review and not at
  // create time had it here and nowhere Setup looked.
  push('business', c.businessInfo?.contact?.website);
  push('custom', brand.customDomain);
  return out;
}

function mapVoice(brand: Brand): MockBrand['voice'] {
  const pillars = brand.guidelines?.voice?.pillars ?? [];
  return {
    essay: brand.tone ?? '',
    pillars: Array.isArray(pillars) ? pillars : [],
  };
}

// Canonical ids for well-known About titles, so Setup's write-back
// (extractStrategyPatch keys on 'mission'/'vision'/'messaging') keeps
// working when sections come from the stored aboutSections list.
const ABOUT_CANONICAL_ID: Record<string, string> = {
  audience: 'audience',
  'target audience': 'audience',
  positioning: 'messaging',
  messaging: 'messaging',
  vision: 'vision',
  mission: 'mission',
  voice: 'voice',
  'voice & tone': 'voice',
  'tone of voice': 'voice',
};

/**
 * The FREE-FORM sections only — headings the eleven fixed fields cannot hold.
 *
 * Read from the canonical strategy rather than `guidelines.aboutSections`,
 * which nothing has written since the canonical ops took over: a section the
 * user wrote during onboarding lived in the identity blob and this looked in
 * the mirror. The fixed fields no longer come through here at all; they have
 * their own cards now, so a mission was appearing as a free-form section AND
 * as a strategy field, each editing a different place.
 */
function mapAbout(c: CanonicalBrand): AboutEntry[] {
  const stored = c.identity?.strategy?.aboutSections;
  if (stored && stored.length > 0) {
    const seen = new Set<string>();
    return stored.map((s, i) => {
      const base =
        ABOUT_CANONICAL_ID[s.title.trim().toLowerCase()] ??
        (s.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
          `section-${i}`);
      let id = base;
      let n = 2;
      while (seen.has(id)) id = `${base}-${n++}`;
      seen.add(id);
      return { id, title: s.title, content: s.content };
    });
  }

  // Vision has no card of its own in the eleven, so it is offered here — the
  // one fixed field that stays free-form. Everything else the old fallback
  // listed (audience, positioning, mission, tone) is a strategy card now.
  const vision = c.identity?.strategy?.vision;
  return vision ? [{ id: 'vision', title: 'Vision', content: vision }] : [];
}
