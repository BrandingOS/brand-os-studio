/**
 * The visual register a brand is played in.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The first version of this page kept a neutral shell and let the brand's
 * colour appear as a pointer — a dot, one word, two full-ground sections. That
 * is a defensible editorial position and it produced a page that looked the
 * same for every brand, which is the wrong outcome for a document whose entire
 * job is to make ONE brand unmistakable. So the position is reversed here: the
 * brand's colour is the page's material, not its highlight.
 *
 * ── Why it goes through `brandPalette` rather than the primary hex ────────
 *
 * "Use the brand colour everywhere" is one edit away from a page where a red
 * brand is red text on red panels beside red cards. What prevents that is
 * role-based tokens: `buildBrandPalette` returns a full surface ramp whose
 * neutrals are TINTED with the brand's hue and whose foregrounds are picked off
 * that ramp by contrast, never hand-paired. So the page ground, the panels, the
 * hairlines and the deep sections all carry the brand's hue at strengths that
 * still read — and a pale-yellow brand and a near-black brand both come out
 * legible with no per-brand fussing.
 *
 * ── The sentinel rule still holds ────────────────────────────────────────
 *
 * `brands.primary_color` is NOT NULL, so a brand that has decided nothing still
 * carries `#8A877E`. `identityModel` already treats that as absence, and this
 * module reads the MODEL's colours rather than the brand record — a brand with
 * no decided colour gets the neutral register and the page stays monochrome.
 * Painting a whole page in a placeholder grey is the loudest possible way to
 * present a value nobody chose.
 */
import type { Brand } from '@/shared/types/brand';
import { buildBrandPalette, type BrandPalette } from '@/shared/brand/brandPalette';
import { pickFgOnBackground, pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import { hexToHsl, hslToHex } from '@/shared/color/colorEngine';
import { generateShades, suggestNeutralScale, type ColorScale } from '@/lib/color-engine';
import { visuallyClose } from '@/features/brand-kit/data/recolorLogo';
import type { IdentityModel, IdentitySectionId } from './identityModel';

/**
 * What a section stands on.
 *
 * Five grounds, and the page moves through them. `page` and `tint` are the
 * brand-tinted neutrals, `brand` and `brand-2` are the brand's own colours at
 * full strength, `deep` is the brand's hue driven almost to black — the ground
 * that makes colour swatches and screen mockups read.
 */
export type Ground = 'page' | 'tint' | 'brand' | 'brand-2' | 'deep';

export interface IdentityRegister {
  /** Custom properties for the page root. */
  tokens: React.CSSProperties;
  /** What each present section stands on. */
  grounds: Record<string, Ground>;
  /** The colours for the hero strip, lead first. */
  chips: Array<{ hex: string; role: string; lead: boolean }>;
  /**
   * The colours the hero's field is lit with.
   *
   * Only the ones that can carry light. A palette's white and black are real
   * brand colours and belong in the swatch grid, but a white bloom over a
   * near-black ground is a grey smear — which is exactly how the first version
   * of this hero rendered for a brand whose palette is red, white and black.
   */
  blooms: string[];
  /** The grounds the logo wall places the mark on, with the mark to use. */
  wall: Array<{ hex: string; url: string; label: string }>;
  /**
   * The brand's colour as a full 50–950 ramp, plus a neutral ramp carrying its
   * hue.
   *
   * The applied mockups need far more than three colours: a card wants a 100
   * for its ground and a 700 for its ink, a chart wants five steps that read as
   * one family. `generateShades` is the product's own ramp generator — the same
   * one the UI colour system tool builds its showcases from — so a mockup here
   * and a mockup there are the same colours.
   */
  scale: ColorScale;
  neutral: ColorScale;
  /** Present only when the brand owns a real second colour. */
  secondScale?: ColorScale;
  /** Set when the brand has decided a colour. False keeps the page monochrome. */
  branded: boolean;
  palette: BrandPalette;
}

/**
 * What each section would LIKE to stand on, best first.
 *
 * Statements take the brand's own colour; specifications take a ground that
 * flatters a specimen. The list is a preference rather than an assignment
 * because which sections exist depends on the brand — see `rhythm`.
 */
const PREFERENCE: Record<IdentitySectionId, Ground[]> = {
  hero: ['deep'],
  introduction: ['page', 'tint'],
  purpose: ['tint', 'page'],
  personality: ['brand', 'deep', 'tint'],
  logo: ['page', 'tint'],
  logoUsage: ['tint', 'page'],
  colour: ['deep', 'page'],
  typography: ['page', 'tint'],
  voice: ['brand-2', 'brand', 'deep'],
  photography: ['tint', 'page'],
  assets: ['page', 'tint'],
  social: ['deep', 'tint'],
  downloads: ['tint', 'page'],
  closing: ['brand', 'deep'],
};

/**
 * Assign grounds so no two neighbours are the same.
 *
 * A fixed section→ground table breaks the moment a brand is missing a section:
 * hero (deep) followed by colour (deep) is one flat black column with a
 * hairline in it, and the reader loses the sense of moving through anything.
 * Walking the sections that are ACTUALLY present, and stepping to the next
 * preference whenever the first repeats, keeps the rhythm intact for a brand
 * with four sections and a brand with fourteen.
 */
export function rhythm(present: IdentitySectionId[]): Record<string, Ground> {
  const out: Record<string, Ground> = {};
  let previous: Ground | undefined;
  for (const id of present) {
    const wants = PREFERENCE[id] ?? ['page'];
    const pick =
      wants.find((g) => g !== previous) ??
      // Every preference repeats the neighbour — take anything that does not.
      (previous === 'page' ? 'tint' : 'page');
    out[id] = pick;
    previous = pick;
  }
  return out;
}

/**
 * Is this a colour a page can STAND on, or is it ink?
 *
 * A brand's palette routinely records white and black under the roles
 * "Secondary" and "Accent" — they are real brand colours and they belong in the
 * swatch grid. They are not grounds. Taking the second entry of the palette as
 * the second brand ground is how the tone-of-voice section came out plain white
 * for a brand whose secondary is `#FFFFFF`, losing the whole crescendo.
 *
 * So a ground colour must carry some chroma and sit away from both ends of the
 * lightness range. Nothing here judges taste — only whether a section painted
 * in it would read as a colour or as a blank page.
 */
function isExpressive(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s >= 12 && l >= 8 && l <= 92;
}

/**
 * The brand's hue laid over white at a given strength.
 *
 * `brandPalette`'s tinted neutrals are built for chrome, where a wash has to be
 * almost undetectable — at L98 the tint rounds away and the page comes out
 * `#FAFAFA`, indistinguishable from any other brand's. This page wants the hue
 * to be FELT on every surface, so the two neutral grounds are mixed here at
 * strengths chosen for a document rather than for an app shell.
 */
function overWhite(hex: string, amount: number): string {
  const v = hex.replace('#', '');
  if (v.length !== 6) return '#FFFFFF';
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount));
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** The same hue, lighter or darker. Keeps a derived ground in the family. */
function shade(hex: string, byL: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(6, Math.min(94, l + byL)));
}

/** A colour driven towards black while keeping its hue. The `deep` ground. */
function deepen(hex: string): string {
  const v = hex.replace('#', '');
  if (v.length !== 6) return '#0B0B0C';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  // 8% of the colour over near-black: enough hue to be felt, never enough to
  // read as "a dark version of the brand colour", which looks like a mistake.
  const mix = (c: number) => Math.round(c * 0.08 + 9 * 0.92);
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The grounds to place the mark on, and which mark reads on each.
 *
 * This is the one section that proves a logo system rather than listing it, and
 * it is only honest if the variant shown on each ground is the variant that
 * BELONGS there. `pickLogoOnBackground` is the single place that decision is
 * made in this codebase — it scores every variant by WCAG contrast using
 * labelled tones, and returns nothing when even the best candidate is
 * unreadable. A ground with no readable mark is dropped rather than filled with
 * an invisible one.
 */
function logoWall(
  brand: Brand,
  palette: BrandPalette,
  chips: IdentityRegister['chips'],
  deep: string,
): IdentityRegister['wall'] {
  const grounds: Array<{ hex: string; label: string }> = [
    { hex: palette.bg.surface, label: 'White' },
    { hex: deep, label: 'Deep' },
    ...chips.map((c) => ({ hex: c.hex, label: c.role })),
  ];
  const wall: IdentityRegister['wall'] = [];
  for (const g of grounds) {
    /*
     * Two grounds a viewer cannot tell apart are one cell shown twice.
     *
     * `visuallyClose` is the same RGB-distance rule the Brand Kit uses to
     * collapse its logo wall from 93 tiles to a curated set — a black at
     * `#000000` and a near-black at `#222222` both carry the white mark and
     * add nothing standing beside each other.
     */
    if (wall.some((w) => visuallyClose(w.hex, g.hex))) continue;
    /*
     * A stricter floor than the helper's default 1.8.
     *
     * 1.8 is the point below which artwork stops being visible; it is well
     * below the point at which a placement is one you would publish. At the
     * default, a grey mark on a light-grey ground qualified and the wall ended
     * on a cell that read as a rendering failure.
     */
    const logo = pickLogoOnBackground(brand, g.hex, { minContrast: 3 });
    if (!logo?.url) continue;
    wall.push({ hex: g.hex, url: logo.url, label: g.label });
  }
  // Six is a field; nine is a swatch book. White and deep come first, so a
  // truncated wall keeps the two placements every brand actually needs.
  return wall.slice(0, 6);
}

export function buildRegister(model: IdentityModel, present: IdentitySectionId[]): IdentityRegister {
  const chips = model.colour.colours.map((c) => ({ hex: c.hex, role: c.role, lead: c.lead }));

  /*
   * The colour the page is played in has to be one a page can be played in.
   *
   * Taking the first chip is wrong twice over. A brand whose primary is a
   * placeholder leads with whatever came next — routinely `#FFFFFF`, filed
   * under "Secondary" — and the whole page then paints itself white: white
   * eyebrow dots on a white ground, white pills, a white brand section. And a
   * genuinely black-and-white brand is not a brand with a colour; it is a brand
   * whose swatch grid says black and white, on a monochrome page, correctly.
   */
  const lead =
    [chips.find((c) => c.lead)?.hex, ...chips.map((c) => c.hex)]
      .filter((hex): hex is string => Boolean(hex))
      .find(isExpressive) ?? undefined;

  /*
   * The palette is built from the model's LEAD colour, not the brand record.
   *
   * They are usually the same value, and when they are not it is because the
   * record holds a placeholder the model rejected — in which case building from
   * the record would tint the entire page with a grey nobody chose.
   */
  const source: Brand = lead
    ? ({
        ...model.brand,
        primaryColor: lead,
        colorSystem: { ...model.brand.colorSystem, primary: { hex: lead } },
      } as Brand)
    : model.brand;
  const palette = buildBrandPalette(source, 'light');
  const branded = Boolean(lead);

  const deep = branded ? deepen(palette.brand.primary) : '#0B0B0C';

  /*
   * The second brand ground.
   *
   * Prefer another colour the brand actually owns; fall back to the palette's
   * derived secondary; and if neither can hold a section — the common case,
   * because most brands' second colour is white or black — deepen the primary
   * instead. A slightly darker, richer version of the lead colour beside the
   * lead colour reads as one family, which is what a second ground is for.
   */
  const expressive = chips.map((c) => c.hex).filter(isExpressive);
  const second =
    expressive.find((hex) => !visuallyClose(hex, palette.brand.primary)) ??
    (isExpressive(palette.brand.secondary) ? palette.brand.secondary : undefined) ??
    shade(palette.brand.primary, -16);

  const tokens = {
    // Unbranded stays monochrome: near-black is the "accent", so dots, pills
    // and rules are still visible and the page simply reads as unpainted.
    '--bi-brand': branded ? palette.brand.primary : '#111113',
    '--bi-brand-2': branded ? second : '#3A3A3E',
    '--bi-brand-3': palette.brand.accent,
    '--bi-on-brand': branded ? palette.text.onBrand : '#FFFFFF',
    // Computed for the ground we actually chose. `palette.text.onBrandSecondary`
    // answers for the palette's secondary, which is frequently not `second`.
    '--bi-on-brand-2': branded ? pickFgOnBackground(second, ['#FFFFFF', '#0B0B0C']) : '#FFFFFF',
    '--bi-deep': deep,
    '--bi-on-deep': '#FFFFFF',
    '--bi-page': branded ? overWhite(palette.brand.primary, 0.03) : '#FFFFFF',
    '--bi-surface': '#FFFFFF',
    '--bi-panel': branded ? overWhite(palette.brand.primary, 0.09) : '#F7F7F7',
    '--bi-ink': palette.text.heading,
    '--bi-ink-2': palette.text.body,
    '--bi-ink-3': palette.text.muted,
    // The accent alias every older rule reads. Kept so a rule that wants "the
    // brand's colour" does not have to know which token spelling it predates.
    '--bi-accent': branded ? palette.brand.primary : '#111113',
  } as React.CSSProperties;

  /*
   * The brand's own typefaces run the page.
   *
   * Colour alone gets a page 70% of the way to looking like one brand; the
   * typeface carries the rest, and a guideline set in someone else's face while
   * telling you which face to use undercuts itself. Body copy stays on the
   * secondary when the brand has one — a display cut set at 16px is unreadable,
   * and most brands' primary is a display cut.
   */
  const display = model.typography.fonts[0]?.token.family;
  const text = model.typography.fonts[1]?.token.family ?? display;
  const stack = (family: string | undefined) =>
    family ? `'${family}', 'Inter Display', Inter, system-ui, sans-serif` : undefined;

  if (display) (tokens as Record<string, string>)['--bi-font-display'] = stack(display)!;
  if (text) (tokens as Record<string, string>)['--bi-font-text'] = stack(text)!;

  /*
   * Three lights, always distinct, never a neutral.
   *
   * A brand with one colour still gets a field, lit by that colour, a deeper
   * shade of it and a lighter one — which reads as depth in one hue rather than
   * as two colours the brand does not have.
   */
  const blooms = [
    palette.brand.primary,
    second,
    expressive.find((h) => !visuallyClose(h, palette.brand.primary) && !visuallyClose(h, second)) ??
      shade(palette.brand.primary, 18),
  ];

  /*
   * The ramps. Built from the ground the page is actually played in, so a
   * mockup's card ground and the section behind it come from one hue.
   */
  const seed = branded ? palette.brand.primary : '#111113';
  const scale = generateShades(seed);
  const neutral = suggestNeutralScale(seed);
  const realSecond = expressive.find((hex) => !visuallyClose(hex, palette.brand.primary));

  return {
    tokens,
    grounds: rhythm(present),
    chips,
    scale,
    neutral,
    ...(realSecond ? { secondScale: generateShades(realSecond) } : {}),
    blooms: branded ? blooms : [],
    wall: branded ? logoWall(model.brand, palette, chips, deep) : [],
    branded,
    palette,
  };
}
