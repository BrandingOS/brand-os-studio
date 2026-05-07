import type { Brand } from '@/shared/types/brand';
import type {
  AboutEntry,
  BrandColor,
  BrandFont,
  BrandLogo,
  BrandPhoto,
  BrandWebsite,
  MockBrand,
} from './mockBrand';
import { hexToName } from './colorNames';

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
  return {
    name: brand.name,
    logos: mapLogos(brand),
    colors: mapColors(brand),
    fonts: mapFonts(brand),
    icons: [],
    photos: mapPhotos(brand),
    websites: mapWebsites(brand),
    voice: mapVoice(brand),
    about: mapAbout(brand),
  };
}

// Neutral surface tones used for logo tiles. We never pull from the
// brand palette here — the tile is just a stage for the artwork.
const LIGHT_BG = '#F5F4EF';
const DARK_BG = '#111113';

function mapLogos(brand: Brand): BrandLogo[] {
  const logos: BrandLogo[] = [];

  const primaryUrl =
    brand.logoSystem?.primary?.url ?? brand.logoAssets?.full ?? brand.logo;
  const wordmarkUrl = brand.logoSystem?.wordmark?.url ?? brand.logoAssets?.wordmark;
  const iconUrl = brand.logoSystem?.iconmark?.url ?? brand.logoAssets?.icon;
  // `BrandLogoAssets.light` is the LIGHT-colored logo (for use ON a dark
  // surface), and `.dark` is the DARK-colored logo (for use ON a light
  // surface). The naming flipped between the legacy field and the
  // onboarding slot, so be careful here.
  const lightLogoUrl = brand.logoAssets?.light; // for dark backgrounds
  const darkLogoUrl = brand.logoAssets?.dark; // for light backgrounds
  const alternateUrl = brand.logoAssets?.alternate;

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
      label: 'Primary',
      variant: 'light',
      svg: buildLogoSvg(primaryUrl, brand.name, LIGHT_BG, '#111113'),
    });
  }
  // Light-colored logo (designed to sit on a dark surface) — always dark bg.
  pushOnce(lightLogoUrl, {
    id: 'on-dark',
    label: 'On dark',
    variant: 'dark',
    svg: buildLogoSvg(lightLogoUrl!, brand.name, DARK_BG, '#F5F4EF'),
  });
  // Dark-colored logo (designed to sit on a light surface) — always light bg.
  pushOnce(darkLogoUrl, {
    id: 'on-light',
    label: 'On light',
    variant: 'light',
    svg: buildLogoSvg(darkLogoUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(iconUrl, {
    id: 'mark',
    label: 'Mark',
    variant: 'light',
    svg: buildLogoSvg(iconUrl!, brand.name.slice(0, 1), LIGHT_BG, '#111113'),
  });
  pushOnce(wordmarkUrl, {
    id: 'wordmark',
    label: 'Wordmark',
    variant: 'light',
    svg: buildLogoSvg(wordmarkUrl!, brand.name, LIGHT_BG, '#111113'),
  });
  pushOnce(alternateUrl, {
    id: 'alternate',
    label: 'Alternate',
    variant: 'light',
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
  const background =
    brand.colorSystem?.background?.hex ?? '#111113';

  // Shared dedupe state across ALL color groups (core / accent / grey).
  // - usedNames keeps every label unique across the whole palette so
  //   "Black" can't appear twice between Core and Neutral.
  // - usedHexes drops the literal duplicate before we even try to name
  //   it, so the same swatch can't show up in two groups (or twice in
  //   one group from different sources).
  const usedNames = new Set<string>();
  const usedHexes = new Set<string>();
  const normHex = (hex: string) => hex.toUpperCase().replace(/^#?/, '#');

  const pushUnique = (
    bucket: BrandColor[],
    hex: string,
    explicitName: string | undefined,
  ): boolean => {
    const norm = normHex(hex);
    if (usedHexes.has(norm)) return false;
    usedHexes.add(norm);
    const base = explicitName ?? hexToName(norm);
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

  const accent: BrandColor[] = [];
  const accentHex = brand.accentColor ?? brand.colorSystem?.accents?.[0]?.hex;
  if (accentHex) {
    pushUnique(accent, accentHex, undefined);
  }
  for (const a of brand.colorSystem?.accents ?? []) {
    if (a.hex && a.hex !== accentHex) {
      pushUnique(accent, a.hex, undefined);
    }
  }

  // Neutral Colors: a fixed black→white grayscale ramp for every brand —
  // even ones that never uploaded colors and even ones whose stored
  // `neutrals[]` was auto-derived from a primary hue (which produced
  // tinted yellows/blues that didn't read as "neutral"). Any
  // user-stored `brand.neutrals` that's actually grayscale is merged
  // in so genuine custom neutrals still surface; tinted entries are
  // dropped so the section stays a true black-to-white spectrum.
  // 32 distinct shade names for the 32-step ramp — `hexToName` would
  // only resolve a dozen grayscale words from its dictionary, so most
  // steps would collide and get suffixed "Black 2 / Black 3 / …" which
  // reads as duplicates. Hand-mapping gives each step its own word.
  const NEUTRAL_NAMES = [
    'Black',     'Jet',        'Onyx',     'Obsidian',
    'Coal',      'Charcoal',   'Iron',     'Graphite',
    'Anthracite','Slate',      'Lead',     'Pewter',
    'Steel',     'Storm',      'Smoke',    'Granite',
    'Stone',     'Ash',        'Dove',     'Silver',
    'Fog',       'Mist',       'Cloud',    'Platinum',
    'Pearl',     'Linen',      'Bone',     'Ivory',
    'Eggshell',  'Snow',       'Chalk',    'White',
  ];
  const greys: BrandColor[] = [];
  const ramp: Array<{ hex: string; name: string }> = (() => {
    const steps = NEUTRAL_NAMES.length;
    const out: Array<{ hex: string; name: string }> = [];
    for (let i = 0; i < steps; i++) {
      const v = Math.round((i / (steps - 1)) * 255);
      const h = v.toString(16).padStart(2, '0').toUpperCase();
      out.push({ hex: `#${h}${h}${h}`, name: NEUTRAL_NAMES[i] });
    }
    return out;
  })();
  for (const { hex, name } of ramp) {
    pushUnique(greys, hex, name);
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
  const images = (brand.brandAssets ?? [])
    .filter((a) => a.type === 'image')
    .slice(0, 6);
  const slots: BrandPhoto['slot'][] = ['A', 'B', 'C', 'D', 'E', 'F'];
  return images.map((img, i) => ({
    id: img.id,
    src: img.url ?? '',
    slot: slots[i] ?? 'F',
  }));
}

function mapWebsites(brand: Brand): BrandWebsite[] {
  const out: BrandWebsite[] = [];
  if (brand.publicUrl) {
    out.push({ id: 'public', url: brand.publicUrl, live: true });
  }
  if (brand.customDomain && brand.customDomain !== brand.publicUrl) {
    out.push({ id: 'custom', url: brand.customDomain, live: true });
  }
  return out;
}

function mapVoice(brand: Brand): MockBrand['voice'] {
  const pillars = brand.guidelines?.voice?.pillars ?? [];
  return {
    essay: brand.tone ?? '',
    pillars: Array.isArray(pillars) ? pillars : [],
  };
}

function mapAbout(brand: Brand): AboutEntry[] {
  const g = brand.guidelines?.strategy;
  return [
    { id: 'audience', title: 'Audience', content: brand.audience ?? '' },
    { id: 'messaging', title: 'Messaging', content: g?.positioning ?? '' },
    { id: 'vision', title: 'Vision', content: g?.vision ?? '' },
    { id: 'mission', title: 'Mission', content: g?.mission ?? '' },
    { id: 'voice', title: 'Voice & Tone', content: brand.tone ?? '' },
  ];
}
