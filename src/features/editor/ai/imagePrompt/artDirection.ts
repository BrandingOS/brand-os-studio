// artDirection — turn a request into an ART DIRECTION BRIEF, not a photo caption.
//
// Why this exists
// ───────────────
// The first compiler asked a language model to write one ≤120-word paragraph
// describing a *picture*, and explicitly forbade text-in-image. Everything that
// makes a design a design — the copy, the type hierarchy, the logo, the margins,
// the reading order — was therefore absent by construction, and the models
// answered the only way they could: with a handsome empty backdrop. Worse, when
// a prompt did read as an advert, the models filled the silence with the
// internet's average advert — a "50% OFF" sticker nobody asked for.
//
// So the division of labour changed. The parts that must never drift are
// ASSEMBLED IN CODE and cannot be dropped, softened or hallucinated away:
//
//   • the deliverable line ("a finished post", not "a background")
//   • the exact copy, quoted verbatim, with an explicit ban on any other words
//   • the logo instruction, tied to the attached reference
//   • the safe margin
//   • the exclusions
//
// The language model writes only the creative middle — subject, composition,
// style — and returns it as fields, not as a finished prompt. It can enrich the
// brief; it cannot delete the parts that make the output usable.
//
// The owner's original rules still bind and are unchanged: preserve the user's
// intent, enrich rather than replace, only relevant brand information, never
// force every colour, explicit instructions beat brand defaults.

import type { BrandImageContext } from './brandImageContext';

// ─── Inputs ──────────────────────────────────────────────────────────────────

/**
 * What is being made.
 *
 * `design` is a finished, publication-ready composition — type, logo, layout.
 * `image`  is a photograph or illustration with no text and no logo, the right
 *          answer when someone asks for "a cat on a sofa" or a texture.
 */
export type DeliverableKind = 'design' | 'image';

/** Words the USER supplied. Never invented, never paraphrased. */
export interface CopyDeck {
  headline?: string;
  subhead?: string;
  cta?: string;
}

export interface LayoutDirection {
  /** One sentence of scene/subject direction. */
  subject: string;
  /** One sentence of layout direction — hierarchy, focal point, where copy sits. */
  composition: string;
  /** One sentence of treatment — medium, light, texture, finish. */
  style: string;
  /** Brand hexes the writer judged relevant (already validated against the kit). */
  paletteHexes: string[];
  logoPlacement?: LogoPlacement;
  negativePrompt?: string;
  notes: string;
}

export type LogoPlacement =
  | 'top-left' | 'top-right' | 'top-centre'
  | 'bottom-left' | 'bottom-right' | 'bottom-centre'
  | 'centre';

export interface AssembleInput {
  kind: DeliverableKind;
  /** What the user typed, verbatim. */
  userPrompt: string;
  copy?: CopyDeck;
  brand: BrandImageContext | null;
  /** e.g. "1:1 Square" — shown to the model as the delivered shape. */
  formatLabel: string;
  /** e.g. "social post", "poster". Drives the deliverable sentence. */
  deliverableNoun: string;
  /** True only when a logo reference image is actually attached. */
  logoAttached: boolean;
  /** True when a user reference image is attached. */
  userReferenceCount?: number;
  direction: LayoutDirection;
}

// ─── The constant that does the most work ────────────────────────────────────

/**
 * Exclusions. A hard constant, present on EVERY brief.
 *
 * Each clause is here because a model produced it unbidden, not because it
 * sounded prudent. The discount clause in particular: "an advertising still for
 * {brand}" reliably returned a percentage badge, because that is what most
 * advertising images on the internet look like.
 */
export const HARD_EXCLUSIONS: string[] = [
  'invented slogans, marketing copy, captions or any words not listed above',
  'discount badges, sale stickers, percentage offers, price tags or "limited time" devices',
  'lorem ipsum, placeholder text or greeked type',
  'misspelled, garbled, doubled or nonsensical lettering',
  'any logo, wordmark, watermark or signature other than the one supplied',
  'QR codes, barcodes, app-store badges or social-media icon rows',
  'device bezels, browser chrome, phone mockups or screen frames',
  'collage, contact-sheet or grid-of-thumbnails layouts',
  'text cropped by the edge of the frame',
];

/** Extra exclusions that only make sense for a wordless image. */
export const IMAGE_ONLY_EXCLUSIONS: string[] = [
  'any text, lettering, numerals or signage',
  'logos, watermarks or brand marks',
];

/** Safe margin, as a share of the short edge. */
const SAFE_MARGIN_PCT = 7;

// ─── Assembly ────────────────────────────────────────────────────────────────

function quoted(s: string): string {
  return `“${s.replace(/\s+/g, ' ').trim()}”`;
}

export function hasCopy(copy: CopyDeck | undefined): boolean {
  return !!(copy?.headline?.trim() || copy?.subhead?.trim() || copy?.cta?.trim());
}

/**
 * The TEXT section — the single most important block, and the one that decides
 * whether the result is a finished design or a backdrop.
 *
 * Three honest cases, and no fourth:
 *   copy given      → render exactly these words and nothing else
 *   design, no copy → the only words we OWN are the brand name and a real
 *                     tagline; anything more would be invention
 *   image           → no words at all
 */
export function textSection(kind: DeliverableKind, copy: CopyDeck | undefined, brand: BrandImageContext | null): string {
  if (kind === 'image') {
    return 'TEXT — none. This is a wordless image: no lettering, no numerals, no signage, no captions.';
  }

  const lines: string[] = [];
  if (copy?.headline?.trim()) lines.push(`  • Headline (largest, most prominent): ${quoted(copy.headline)}`);
  if (copy?.subhead?.trim()) lines.push(`  • Supporting line (smaller, secondary): ${quoted(copy.subhead)}`);
  if (copy?.cta?.trim()) lines.push(`  • Call to action (a button or a clearly separated line): ${quoted(copy.cta)}`);

  if (lines.length) {
    return [
      'TEXT — set ONLY the following words, spelled exactly as written, with correct',
      'letterforms and spacing. Do not add, translate, shorten, rephrase or duplicate them,',
      'and do not add any other word anywhere in the frame:',
      ...lines,
    ].join('\n');
  }

  // No copy was supplied. We may still place words we genuinely own.
  const own: string[] = [];
  if (brand?.name) own.push(`the brand name ${quoted(brand.name)}`);
  if (brand?.tagline) own.push(`its tagline ${quoted(brand.tagline)}`);
  if (!own.length) {
    return [
      'TEXT — none was supplied, so render NO words at all. Do not invent a headline,',
      'slogan, caption, price or label. Carry the idea with image and composition alone.',
    ].join('\n');
  }
  return [
    `TEXT — no copy was supplied. The ONLY words permitted are ${own.join(' and ')}.`,
    'Do not invent a headline, slogan, caption, price, percentage or label of any kind.',
  ].join('\n');
}

/** The logo instruction, tied to whether a reference is really attached. */
export function logoSection(
  kind: DeliverableKind,
  logoAttached: boolean,
  placement: LogoPlacement | undefined,
  brandName: string | undefined,
): string {
  if (kind === 'image' || !logoAttached) {
    return 'LOGO — none. Do not draw, invent or imply a logo, wordmark or watermark.';
  }
  const where = placement ?? 'top-left';
  return [
    `LOGO — the supplied reference image is ${brandName ? `${brandName}'s` : 'the'} real logo.`,
    'Reproduce it EXACTLY: same shapes, same proportions, same colours, unrotated,',
    'unstretched, no redraw, no restyle, no added glow, bevel or outline.',
    `Place it ${where.replace('-', ' ')}, at roughly 12–16% of the frame width, with clear`,
    'space around it of at least its own cap height. If it cannot be reproduced faithfully,',
    'leave it out rather than approximate it.',
  ].join('\n');
}

/** Brand colours as ROLES. A hex list alone tells a model nothing about weight. */
export function brandSection(brand: BrandImageContext | null, hexes: string[]): string {
  if (!brand) return '';
  const parts: string[] = [];
  const head = [brand.name, brand.industry ? `(${brand.industry})` : ''].filter(Boolean).join(' ');
  parts.push(`BRAND — ${head}.`);

  const seen = new Set<string>();
  const dedupe = (list: typeof brand.palette) =>
    list.filter((p) => (seen.has(p.hex) ? false : (seen.add(p.hex), true)));
  const chosen = dedupe(hexes.length
    ? hexes.map((h) => brand.palette.find((p) => p.hex === h)).filter((p): p is NonNullable<typeof p> => !!p)
    : []);
  const use = chosen.length ? chosen : dedupe(brand.palette.filter((p) => p.role === 'primary'));
  if (use.length) {
    const roleLine = use.map((p, i) => {
      const label = p.name ? `${p.name} ${p.hex}` : p.hex;
      if (i === 0) return `  • Dominant colour: ${label}`;
      if (p.role === 'accent') return `  • Accent — one element only, never a whole surface: ${label}`;
      return `  • Supporting colour: ${label}`;
    });
    parts.push(...roleLine);
  }
  if (brand.headingFont) {
    parts.push(`  • Typography: set real, legible type with a clear size hierarchy, in the character of ${brand.headingFont}.`);
  }
  if (brand.styleDescriptors.length) {
    parts.push(`  • Visual language: ${brand.styleDescriptors.slice(0, 4).join(', ')}.`);
  }
  return parts.join('\n');
}

/**
 * Assemble the final brief. Pure, synchronous, and the ONLY place a prompt is
 * built — the language model never returns a finished prompt, so no rule here
 * can be dropped by a model that decided it knew better.
 */
export function assembleBrief(input: AssembleInput): { prompt: string; negativePrompt: string } {
  const { kind, direction, brand } = input;
  const blocks: string[] = [];

  // 1. What is being delivered. First line, because it frames everything after.
  if (kind === 'design') {
    blocks.push([
      `FINISHED ${input.deliverableNoun.toUpperCase()} — ${input.formatLabel}.`,
      'Deliver a complete, publication-ready composition that could be posted as it is:',
      'artwork, typography and layout together in one finished piece.',
      'It must NOT be an empty background, a texture, a plate with space left for text',
      'to be added later, a template with placeholder boxes, or a mockup of a design.',
    ].join('\n'));
  } else {
    blocks.push([
      `IMAGE — ${input.formatLabel}.`,
      'A single finished photograph or illustration. No text, no logo, no layout.',
    ].join('\n'));
  }

  // 2. The user's intent, preserved verbatim alongside the enriched reading.
  blocks.push(`REQUEST (the user's own words, which must be honoured): ${input.userPrompt.trim()}`);
  if (direction.subject.trim()) blocks.push(`SUBJECT — ${direction.subject.trim()}`);

  // 3. Copy. The block that decides finished-design vs backdrop.
  blocks.push(textSection(kind, input.copy, brand));

  // 4. Brand.
  const bs = brandSection(brand, direction.paletteHexes);
  if (bs) blocks.push(bs);

  // 5. Logo.
  blocks.push(logoSection(kind, input.logoAttached, direction.logoPlacement, brand?.name));

  // 6. Composition — the model's layout direction plus the rules we enforce.
  const comp: string[] = [];
  if (direction.composition.trim()) comp.push(direction.composition.trim());
  comp.push(
    `Keep a ${SAFE_MARGIN_PCT}% safe margin on every edge; nothing important may touch or cross it.`,
    'One clear focal point and one obvious reading order.',
  );
  if (kind === 'design' && !hasCopy(input.copy)) {
    // Told only that no copy exists, a writer reserves a blank quadrant "for
    // the headline" — and the result is the backdrop we are trying to stop
    // shipping. Nobody is going to fill that space, so forbid it outright.
    comp.push(
      'No further copy is being set, so do NOT reserve, mask or flatten any area as a',
      'placeholder for text. Every part of the frame must be resolved and finished; any',
      'negative space must read as a deliberate compositional choice, not an empty slot.',
    );
  }
  blocks.push(`COMPOSITION — ${comp.join(' ')}`);

  // 7. Style.
  if (direction.style.trim()) blocks.push(`STYLE — ${direction.style.trim()}`);

  // 8. References the model was actually handed.
  if (input.userReferenceCount) {
    blocks.push(
      `REFERENCES — ${input.userReferenceCount} reference image(s) are attached for style and subject guidance. Follow them; do not copy them literally unless the request says so.`,
    );
  }

  // 9. Exclusions. Always last, always complete.
  const excl = kind === 'image'
    ? [...IMAGE_ONLY_EXCLUSIONS, ...HARD_EXCLUSIONS.filter((e) => !e.startsWith('invented slogans') && !e.startsWith('lorem'))]
    : HARD_EXCLUSIONS;
  blocks.push(`DO NOT INCLUDE — ${excl.join('; ')}.`);

  const negative = [direction.negativePrompt?.trim(), ...excl].filter(Boolean).join(', ');
  return { prompt: blocks.join('\n\n'), negativePrompt: negative };
}

// ─── Deliverable inference ───────────────────────────────────────────────────

/**
 * Nouns that name a DESIGN. Ordered longest-first so "instagram story" wins
 * over "story". The matched noun also names the deliverable in the brief.
 */
const DELIVERABLE_NOUNS: Array<[RegExp, string]> = [
  [/\bemail\s+signature\b/i, 'email signature'],
  [/\bbusiness\s+cards?\b/i, 'business card'],
  [/\blanding\s+page\b/i, 'landing page'],
  [/\binstagram\s+stor(y|ies)\b/i, 'instagram story'],
  [/\binstagram\s+posts?\b/i, 'instagram post'],
  [/\bsocial\s+(media\s+)?posts?\b/i, 'social post'],
  [/\bfacebook\s+covers?\b/i, 'cover'],
  [/\bmenu\b/i, 'menu'],
  [/\bpackaging\b|\bpackage\b|\blabels?\b/i, 'packaging design'],
  [/\bbillboards?\b/i, 'billboard'],
  [/\bbrochures?\b/i, 'brochure'],
  [/\bletterheads?\b/i, 'letterhead'],
  [/\bpresentations?\b|\bslides?\b|\bdecks?\b/i, 'presentation slide'],
  [/\bthumbnails?\b/i, 'thumbnail'],
  [/\bcertificates?\b/i, 'certificate'],
  [/\binvitations?\b|\binvites?\b/i, 'invitation'],
  [/\bposters?\b/i, 'poster'],
  [/\bflyers?\b|\bleaflets?\b/i, 'flyer'],
  [/\bbanners?\b/i, 'banner'],
  [/\bcovers?\b/i, 'cover'],
  [/\badvertisements?\b|\badverts?\b|\bads?\b/i, 'advert'],
  [/\bstor(y|ies)\b/i, 'story'],
  [/\bposts?\b/i, 'social post'],
  [/\bmerch\b|\bt-?shirts?\b|\bhoodies?\b|\btotes?\b|\bmugs?\b/i, 'merchandise design'],
  [/\bsignage\b|\bstorefronts?\b|\bshopfronts?\b/i, 'signage'],
];

/** Words that clearly ask for a plain picture, overriding a deliverable noun. */
const IMAGE_WORDS =
  /\b(photo|photograph|photography|picture|shot of|illustration|drawing|painting|render of|texture|pattern|wallpaper|background(?!\s+for\s+a)|backdrop|头)\b/i;

export interface InferredDeliverable {
  kind: DeliverableKind;
  noun: string;
  /** Why — surfaced in the UI so the choice is never mysterious. */
  reason: string;
}

/**
 * Decide what the user is asking for.
 *
 * An explicit choice always wins. Otherwise a deliverable noun ("post",
 * "poster", "ad") means a finished design, and a picture word ("a photo of…")
 * means a wordless image. Supplied copy is decisive: nobody writes a headline
 * for a texture.
 */
export function inferDeliverable(
  userPrompt: string,
  copy: CopyDeck | undefined,
  explicit?: DeliverableKind,
): InferredDeliverable {
  const matched = DELIVERABLE_NOUNS.find(([re]) => re.test(userPrompt));
  const noun = matched?.[1] ?? 'design';

  if (explicit) {
    return {
      kind: explicit,
      noun: explicit === 'design' ? noun : 'image',
      reason: 'You chose it.',
    };
  }
  if (hasCopy(copy)) {
    return { kind: 'design', noun, reason: 'You supplied copy, so this is a composed design.' };
  }
  if (matched && !IMAGE_WORDS.test(userPrompt)) {
    return { kind: 'design', noun, reason: `You asked for a ${noun}.` };
  }
  if (IMAGE_WORDS.test(userPrompt)) {
    return { kind: 'image', noun: 'image', reason: 'You asked for a picture, not a layout.' };
  }
  return matched
    ? { kind: 'design', noun, reason: `You asked for a ${noun}.` }
    : { kind: 'image', noun: 'image', reason: 'No deliverable named — treated as a plain image.' };
}
