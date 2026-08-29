// artDirection — turn a request into an ART DIRECTION BRIEF, not a photo caption.
//
// Why this exists
// ───────────────
// The first compiler asked a language model to write one ≤120-word paragraph
// describing a *picture*, and explicitly forbade text-in-image. Everything that
// makes a design a design — the copy, the type hierarchy, the logo, the margins,
// the reading order — was therefore absent by construction, and the models
// answered the only way they could: with a handsome empty backdrop.
//
// The 2026-08-19 rewrite fixed the FRAMING ("a finished post", not "a
// background") and left the BRIEFING untouched. Measured on real requests, an
// Instagram post and a printed poster came out 92.5% character-identical: the
// format contributed one noun and one ratio, colour arrived as a flat hex list
// wearing three fixed role labels, typography was one sentence naming only the
// heading family, and roughly 40% of the text was prohibition. It was a
// compliance document, not an art direction.
//
// So the division of labour is now three-way.
//
//   CODE owns what must never drift, and what is not a creative question at all:
//     • the deliverable line and the format's own CONVENTIONS (formatBriefs.ts)
//     • the exact copy contract — set these words, add no others
//     • the logo fidelity paragraph, tied to a real attached reference
//     • the safe margin, and which colour ROLE SLOTS exist
//     • the batch plan, so four candidates are four ideas (variants.ts)
//     • the exclusions
//
//   THE MODEL owns the creative middle, returned as FIELDS, never as a prompt:
//     concept, subject, the layout archetype chosen from the format's allowed
//     set, light and finish, which brand colour fills which slot, type treatment.
//
//   THE USER owns everything above both: their words, their copy, and which
//   parts of the brand may enter the frame at all (BrandInclusions).
//
// The owner's original rules still bind and are unchanged: preserve the user's
// intent, enrich rather than replace, only relevant brand information, never
// force every colour, explicit instructions beat brand defaults, and never
// invent a FACT — a price, a percentage, a date or a claim — that the user did
// not supply.

import type { BrandImageContext } from './brandImageContext';
import { contractFor, type FormatContract } from './formatBriefs';
import { variantSection, type VariantDirective } from './variants';

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

/**
 * Which parts of the brand may enter this frame.
 *
 * This replaces the old binary On-brand / Raw switch, which asked the wrong
 * question: Raw meant "forget the brand entirely", so wanting your own colours
 * on one poster also cost you the logo, the typography and the visual language.
 * These are four independent decisions and they are now four.
 *
 * An exclusion is enforced in three places, because one is not enough: the
 * brief drops the section, the compiler is told not to produce it, and the hook
 * refuses to BUILD the matching reference image — an attached picture is the
 * one instruction a model cannot politely ignore.
 */
export interface BrandInclusions {
  /** The real logo, attached as a reference and reproduced faithfully. */
  logo: boolean;
  /** Any words at all in the frame. Off ⇒ a wordless piece. */
  text: boolean;
  /** The brand palette. Off ⇒ the piece finds its own colour. */
  colours: boolean;
  /** Typography, visual language, industry cues — the brand's manner. */
  identity: boolean;
}

export const ALL_BRAND_INCLUDED: BrandInclusions = {
  logo: true, text: true, colours: true, identity: true,
};

/**
 * A reference the user attached, and what it is FOR.
 *
 * The distinction is the whole point and it did not exist: both kinds received
 * the sentence "attached for style and subject guidance", which invites a model
 * to reproduce the subject of a mood board and to restyle the actual product.
 */
export type UserReferenceUse = 'style' | 'subject';

export interface UserReferenceCounts {
  style: number;
  subject: number;
}

/** Which brand colour plays which part. Chosen per piece, not by palette order. */
export interface ColourRoles {
  /** Fills the ground / the largest surface. */
  ground?: string;
  /** Carries the type. */
  type?: string;
  /** One element only — never a whole surface. */
  accent?: string;
  /** One sentence relating the photographic colour to these. */
  note?: string;
}

/** How the type is actually set. A font name alone directs nothing. */
export interface TypeSpec {
  weight?: string;
  letterCase?: string;
  tracking?: string;
  /** Headline width as a share of the frame. */
  headlineWidthPct?: number;
  headlinePosition?: string;
  /** Subhead cap height as a fraction of the headline's. */
  subheadRatio?: number;
  ctaTreatment?: string;
}

export interface LayoutDirection {
  /** One sentence: the idea, and what it makes the viewer feel or do. */
  concept: string;
  /** One or two sentences of scene/subject direction. */
  subject: string;
  /** Layout direction — what is dominant, reading order, grid, negative space. */
  layout: string;
  /** Medium, lighting, texture, grade, finish. */
  lightFinish: string;
  /** Brand hexes the writer judged relevant (already validated against the kit). */
  paletteHexes: string[];
  colourRoles?: ColourRoles;
  typeSpec?: TypeSpec;
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
  /** e.g. "social post", "poster". Drives the deliverable sentence + contract. */
  deliverableNoun: string;
  /** True only when a logo reference image is actually attached. */
  logoAttached: boolean;
  /** The user's own references, by purpose. */
  userReferences?: UserReferenceCounts;
  /** Which parts of the brand are permitted. Defaults to everything. */
  include?: BrandInclusions;
  direction: LayoutDirection;
  /** This candidate's place in the batch. Omit for a single image. */
  variant?: VariantDirective;
  variantTotal?: number;
}

// ─── Exclusions ──────────────────────────────────────────────────────────────

/**
 * The four objective hard failures. Short, because this list is the loudest
 * thing in any brief and attention spent NOT drawing something is attention not
 * spent drawing. Everything else moved to the negative prompt, which every
 * production model supports and which the providers already forward — the full
 * list used to be sent TWICE, once in-prompt and once re-appended by the vendor.
 */
export const HARD_EXCLUSIONS: string[] = [
  'invented prices, percentages, dates or claims that were not supplied',
  'misspelled, garbled, doubled or nonsensical lettering',
  'any second logo, wordmark, watermark or signature',
  'important content touching or crossing the frame edge',
];

/** The long tail. Negative-prompt only — never in the brief body. */
export const NEGATIVE_ONLY: string[] = [
  'discount badges, sale stickers, percentage offers, price tags, "limited time" devices',
  'lorem ipsum, placeholder text, greeked type',
  'QR codes, barcodes, app-store badges, social-media icon rows',
  'device bezels, browser chrome, phone mockups, screen frames',
  'collage, contact-sheet, grid-of-thumbnails layouts',
  'colour swatch cards, palette chips, hex codes visible in the artwork',
  'watermarks, stock-photo marks, signatures',
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

/** "a instagram post" read badly in the panel; deliverables are user-visible. */
export function article(noun: string): string {
  return /^[aeiou]/i.test(noun.trim()) ? 'an' : 'a';
}

/**
 * The TEXT section — the single most important block, and the one that decides
 * whether the result is a finished design or a backdrop.
 *
 * Four honest cases, and no fifth:
 *   text excluded   → no words at all, by the user's own choice
 *   copy given      → render exactly these words and nothing else
 *   design, no copy → the only words we OWN are the brand name and a real
 *                     tagline; anything more would be invention
 *   image           → no words at all
 */
export function textSection(
  kind: DeliverableKind,
  copy: CopyDeck | undefined,
  brand: BrandImageContext | null,
  include: BrandInclusions = ALL_BRAND_INCLUDED,
  spec?: TypeSpec,
  fonts?: { heading?: string; body?: string },
): string {
  if (kind === 'image' || !include.text) {
    return 'TEXT — none. This is a wordless piece: no lettering, no numerals, no signage, no captions.';
  }

  const lines: string[] = [];
  const setIn = (family: string | undefined, fallback: string) =>
    family ? `set in the character of ${family}` : fallback;

  if (copy?.headline?.trim()) {
    const bits = [
      `  • Headline ${quoted(copy.headline)} — the dominant element`,
      include.identity ? setIn(fonts?.heading, 'set in a confident display face') : 'set in a confident display face',
      spec?.weight, spec?.letterCase, spec?.tracking,
      spec?.headlineWidthPct ? `occupying about ${spec.headlineWidthPct}% of the frame width` : '',
      spec?.headlinePosition,
    ].filter(Boolean).join(', ');
    lines.push(`${bits}.`);
  }
  if (copy?.subhead?.trim()) {
    const bits = [
      `  • Supporting line ${quoted(copy.subhead)}`,
      include.identity ? setIn(fonts?.body, 'set in a clean text face') : 'set in a clean text face',
      `at roughly ${spec?.subheadRatio ?? 0.35} of the headline's cap height`,
    ].filter(Boolean).join(', ');
    lines.push(`${bits}.`);
  }
  if (copy?.cta?.trim()) {
    lines.push(`  • Call to action ${quoted(copy.cta)} — ${spec?.ctaTreatment ?? 'a button or a clearly separated line, visually distinct from the supporting text'}.`);
  }

  if (lines.length) {
    return [
      'TEXT — set ONLY the following words, spelled exactly as written, with correct',
      'letterforms and spacing. Do not add, translate, shorten, rephrase or duplicate them,',
      'and set no other word anywhere in the frame:',
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
  contract: FormatContract,
  refIndex?: number,
): string {
  if (kind === 'image' || !logoAttached) {
    return 'LOGO — none. Do not draw, invent or imply a logo, wordmark or watermark.';
  }
  const where = placement ? placement.replace('-', ' ') : contract.logoEdge;
  const [lo, hi] = contract.logoScalePct;
  const which = refIndex != null ? `Reference image ${refIndex}` : 'The supplied reference image';
  return [
    `LOGO — ${which} is ${brandName ? `${brandName}'s` : 'the'} real logo. Reproduce it EXACTLY:`,
    'same shapes, proportions and colours; unrotated, unstretched, no restyle or added effect.',
    `Place it ${where}, at roughly ${lo}–${hi}% of the frame width, clear space ≥ its own cap`,
    'height. If it cannot be reproduced faithfully, leave it out rather than approximate it.',
  ].join('\n');
}

/**
 * Colour as ROLE SLOTS, not a list.
 *
 * A hex list tells a model nothing about weight, and the old three fixed labels
 * came from palette ORDER, so the same colour was "Dominant" on a poster, a
 * post, a billboard and a bottle shot alike. The slots are fixed by code; which
 * colour fills each is a per-piece judgement.
 */
export function colourSection(
  brand: BrandImageContext | null,
  hexes: string[],
  roles: ColourRoles | undefined,
  include: BrandInclusions,
): string {
  if (!include.colours) {
    return [
      'COLOUR — the brand palette is deliberately NOT being used here. Choose colour',
      'that serves the request on its own terms; do not reach for the brand’s colours.',
    ].join('\n');
  }
  if (!brand || (!hexes.length && !roles?.ground && !roles?.type)) return '';

  const named = (hex?: string) => {
    if (!hex) return undefined;
    const p = brand.palette.find((c) => c.hex.toUpperCase() === hex.toUpperCase());
    return p?.name ? `${hex} (${p.name})` : hex;
  };

  const lines: string[] = [];
  const ground = named(roles?.ground) ?? named(hexes[0]);
  const type = named(roles?.type) ?? named(hexes[1]) ?? named(hexes[0]);
  const accent = named(roles?.accent) ?? named(hexes[2]);

  if (ground) lines.push(`  • Ground — the largest surface: ${ground}`);
  if (type && type !== ground) lines.push(`  • Type and primary marks: ${type}`);
  if (accent && accent !== ground && accent !== type) {
    lines.push(`  • Accent — ONE element only, never a whole surface: ${accent}`);
  }
  if (roles?.note?.trim()) lines.push(`  • ${roles.note.trim()}`);
  if (!lines.length) return '';
  return ['COLOUR —', ...lines].join('\n');
}

/** Who the brand is. Identity only — colour and type have their own blocks. */
export function brandSection(brand: BrandImageContext | null, include: BrandInclusions): string {
  if (!brand || !include.identity) return '';
  const head = [brand.name, brand.industry ? `(${brand.industry})` : ''].filter(Boolean).join(' ');
  const parts = [`BRAND — ${head}.`];
  if (brand.styleDescriptors.length) {
    parts.push(`  • Visual language: ${brand.styleDescriptors.slice(0, 4).join(', ')}.`);
  }
  if (brand.audience) parts.push(`  • Speaking to: ${brand.audience}.`);
  return parts.join('\n');
}

/** References, named by PURPOSE. The distinction a designer makes in one clause. */
export function referenceSection(
  refs: UserReferenceCounts | undefined,
  logoAttached: boolean,
  paletteAttached: boolean,
): string {
  const lines: string[] = [];
  let n = 0;
  if (logoAttached) lines.push(`  ${++n}) the brand's real logo — a brand asset, not scene content`);
  if (paletteAttached) {
    lines.push(`  ${++n}) the brand palette as a swatch card — colour guidance ONLY; the card itself must never appear in the artwork`);
  }
  for (let i = 0; i < (refs?.subject ?? 0); i++) {
    lines.push(
      `  ${++n}) SUBJECT reference — the actual subject. Reproduce it faithfully: same object,`,
      '     proportions, markings and finish. You may relight it and place it in a new',
      '     setting; you may not substitute a lookalike, redesign it or restyle it.',
    );
  }
  for (let i = 0; i < (refs?.style ?? 0); i++) {
    lines.push(
      `  ${++n}) STYLE reference — visual language ONLY: light, colour relationships, grain,`,
      '     contrast, type feel. Do NOT reproduce its subject, its text or its layout.',
    );
  }
  if (!lines.length) return '';
  return ['REFERENCE IMAGES — attached in this order:', ...lines].join('\n');
}

/**
 * Assemble the final brief. Pure, synchronous, and the ONLY place a prompt is
 * built — the language model never returns a finished prompt, so no rule here
 * can be dropped by a model that decided it knew better.
 */
export function assembleBrief(input: AssembleInput): { prompt: string; negativePrompt: string } {
  const { kind, direction, brand } = input;
  const include = input.include ?? ALL_BRAND_INCLUDED;
  const contract = contractFor(input.deliverableNoun);
  const logoAttached = input.logoAttached && include.logo;
  const paletteAttached = include.colours && direction.paletteHexes.length > 0;
  const blocks: string[] = [];

  // 1. What is being delivered, and how it will actually be encountered. The
  //    format's own conventions land here, not as an afterthought.
  if (kind === 'design') {
    blocks.push([
      `${input.deliverableNoun.toUpperCase()}, ${input.formatLabel} — ${contract.readAs}.`,
      'A finished, publication-ready composition: image, type and mark art-directed as ONE',
      'piece. NOT an empty background, a plate with space left for text, or a mockup.',
    ].join('\n'));
  } else {
    blocks.push([
      `PHOTOGRAPH OR ILLUSTRATION, ${input.formatLabel}.`,
      'A single finished image. No text, no logo, no layout.',
    ].join('\n'));
  }

  // 2. The user's intent, preserved verbatim, then the idea.
  blocks.push(`REQUEST (the user's own words, which must be honoured): ${input.userPrompt.trim()}`);
  if (direction.concept.trim()) blocks.push(`CONCEPT — ${direction.concept.trim()}`);
  const subj = direction.subject.trim();
  const echoes = subj.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    === input.userPrompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (subj && !echoes) blocks.push(`SUBJECT — ${subj}`);

  // 3. References — named by purpose, before the blocks that depend on them.
  const rs = referenceSection(input.userReferences, logoAttached, paletteAttached);
  if (rs) blocks.push(rs);

  // 4. Copy. The block that decides finished-design vs backdrop.
  blocks.push(textSection(
    kind, input.copy, brand, include, direction.typeSpec,
    { heading: brand?.headingFont, body: brand?.bodyFont },
  ));

  // 5. Who the brand is.
  const bs = brandSection(brand, include);
  if (bs) blocks.push(bs);

  // 6. Colour, as role slots.
  const cs = colourSection(brand, direction.paletteHexes, direction.colourRoles, include);
  if (cs) blocks.push(cs);

  // 7. Logo.
  blocks.push(logoSection(kind, logoAttached, direction.logoPlacement, brand?.name, contract, logoAttached ? 1 : undefined));

  // 8. Layout — the model's direction plus the rules the format imposes.
  const layout: string[] = [];
  if (direction.layout.trim()) layout.push(direction.layout.trim());
  layout.push('One clear focal point and one obvious reading order.');
  if (kind === 'design' && !subj) {
    // No enriched subject was supplied, so the brief must still insist there IS
    // one. Without this line a type-led layout returns a flat colour field with
    // the headline on it — which is the backdrop failure wearing a new hat.
    layout.push(
      'The frame must contain real subject matter — photography, illustration or a',
      'built scene that carries the idea. A plain colour field with type on it is NOT',
      'a finished design.',
    );
  }
  if (kind === 'design') {
    layout.push(`Set nothing smaller than ${contract.typeFloorPct}% of the frame height.`);
    if (contract.wordBudget && include.text) {
      layout.push(`At most ${contract.wordBudget} words may appear in the entire frame.`);
    }
    if (contract.conventions.length) layout.push(`${contract.conventions.join('; ')}.`);
  }
  if (contract.safeAreas) {
    layout.push(`${contract.safeAreas.charAt(0).toUpperCase()}${contract.safeAreas.slice(1)}.`);
  }
  layout.push(`Keep a ${SAFE_MARGIN_PCT}% safe margin on every edge; nothing important may touch or cross it.`);
  if (kind === 'design' && !hasCopy(input.copy) && include.text) {
    // Told only that no copy exists, a writer reserves a blank quadrant "for
    // the headline" — and the result is the backdrop we are trying to stop
    // shipping. Nobody is going to fill that space, so forbid it outright.
    layout.push(
      'No further copy is being set, so do NOT reserve, mask or flatten any area as a',
      'placeholder for text — negative space must read as a deliberate choice, not an empty slot.',
    );
  }
  blocks.push(`${kind === 'design' ? 'LAYOUT' : 'FRAME'} — ${layout.join(' ')}`);

  // 9. Light and finish.
  const lf = [direction.lightFinish.trim().replace(/[.;]\s*$/, ''), contract.finish]
    .filter(Boolean).join('. ');
  if (lf) blocks.push(`LIGHT & FINISH — ${lf}`);

  // 10. This candidate's place in the batch.
  if (input.variant && (input.variantTotal ?? 1) > 1) {
    const vs = variantSection(input.variant, input.variantTotal ?? 1);
    if (vs) blocks.push(vs);
  }

  // 11. The four objective failures. Short by design — see HARD_EXCLUSIONS.
  const excl = kind === 'image' ? [...IMAGE_ONLY_EXCLUSIONS, ...HARD_EXCLUSIONS.slice(1)] : HARD_EXCLUSIONS;
  blocks.push(`AVOID — ${excl.join('; ')}.`);

  // The long tail rides on the negative prompt, which every production model
  // supports and the providers already forward. Sending it in both places was
  // 84 words of prohibition twice over.
  const negative = [
    direction.negativePrompt?.trim(),
    ...excl,
    ...NEGATIVE_ONLY,
    ...(kind === 'design' && !include.text ? ['any text or lettering'] : []),
  ].filter(Boolean).join(', ');

  return { prompt: blocks.join('\n\n'), negativePrompt: negative };
}

// ─── Deliverable inference ───────────────────────────────────────────────────

/**
 * Nouns that name a DESIGN. Ordered longest-first so "instagram story" wins
 * over "story". The matched noun also names the deliverable in the brief and
 * selects its format contract.
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
  /\b(photo|photograph|photography|picture|shot of|illustration|drawing|painting|render of|texture|pattern|wallpaper|background(?!\s+for\s+a)|backdrop)\b/i;

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
    return { kind: 'design', noun, reason: `You asked for ${article(noun)} ${noun}.` };
  }
  if (IMAGE_WORDS.test(userPrompt)) {
    return { kind: 'image', noun: 'image', reason: 'You asked for a picture, not a layout.' };
  }
  return matched
    ? { kind: 'design', noun, reason: `You asked for ${article(noun)} ${noun}.` }
    : { kind: 'image', noun: 'image', reason: 'No deliverable named — treated as a plain image.' };
}
