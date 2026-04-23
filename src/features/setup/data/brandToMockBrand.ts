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

function mapLogos(brand: Brand): BrandLogo[] {
  const logos: BrandLogo[] = [];

  const primaryUrl =
    brand.logoSystem?.primary?.url ?? brand.logoAssets?.full ?? brand.logo;
  const wordmarkUrl = brand.logoSystem?.wordmark?.url ?? brand.logoAssets?.wordmark;
  const iconUrl = brand.logoSystem?.iconmark?.url ?? brand.logoAssets?.icon;

  if (primaryUrl) {
    logos.push({
      id: 'primary',
      label: 'Primary',
      variant: 'light',
      svg: buildLogoSvg(primaryUrl, brand.name, brand.primaryColor, brand.secondaryColor),
    });
  }
  if (wordmarkUrl && wordmarkUrl !== primaryUrl) {
    logos.push({
      id: 'wordmark',
      label: 'Wordmark',
      variant: 'light',
      svg: buildLogoSvg(wordmarkUrl, brand.name, brand.secondaryColor ?? '#F1EEE4', brand.primaryColor),
    });
  }
  if (iconUrl && iconUrl !== primaryUrl) {
    logos.push({
      id: 'mark',
      label: 'Mark',
      variant: 'dark',
      svg: buildLogoSvg(iconUrl, brand.name.slice(0, 1), '#111113', '#F1EEE4'),
    });
  }

  if (logos.length === 0) {
    // No logo assets at all — render a text-based placeholder in the
    // brand's primary color so the section isn't empty.
    logos.push({
      id: 'placeholder',
      label: 'Primary',
      variant: 'light',
      svg: buildTextLogo(brand.name, brand.primaryColor, brand.secondaryColor ?? '#F1EEE4'),
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
  const core: BrandColor[] = [];
  const primary =
    brand.colorSystem?.primary?.hex ?? brand.primaryColor;
  const secondary =
    brand.colorSystem?.secondary?.hex ?? brand.secondaryColor ?? '#F1EEE4';
  const background =
    brand.colorSystem?.background?.hex ?? '#111113';

  if (primary) core.push({ hex: primary, name: 'Primary' });
  if (secondary) core.push({ hex: secondary, name: 'Secondary' });
  if (background) core.push({ hex: background, name: 'Background' });

  const accent: BrandColor[] = [];
  const accentHex = brand.accentColor ?? brand.colorSystem?.accents?.[0]?.hex;
  if (accentHex) accent.push({ hex: accentHex, name: 'Accent' });
  for (const a of brand.colorSystem?.accents ?? []) {
    if (a.hex && a.hex !== accentHex) {
      accent.push({ hex: a.hex, name: a.name ?? 'Accent' });
    }
  }

  const greys: BrandColor[] = (brand.neutrals ?? []).map((hex, index) => ({
    hex,
    name: `Neutral ${index + 1}`,
  }));

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
    });
  }
  if (secondary && secondary !== primary) {
    fonts.push({
      id: 'secondary',
      family: secondary,
      role: 'Text',
      weights: brand.typography?.secondary?.weights?.join(' · ') ?? 'Regular · Medium · SemiBold',
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
