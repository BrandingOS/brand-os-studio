// compileImagePrompt — turn the user's words into a brand-aware ART DIRECTION
// BRIEF, without hijacking them.
//
// The owner's rules (2026-08-17), unchanged and still binding:
//   • preserve the user's original creative intent
//   • use brand context to ENRICH and CONSTRAIN, never to replace
//   • do not force every brand attribute into every generation
//   • no logo unless the user asks or the subject clearly requires branding
//   • do not force every brand colour into every image
//   • explicit user instructions win over brand defaults
//   • never invent a FACT — a price, a percentage, a date, a claim
//
// Two engines behind one function:
//   claude   — `anthropic-proxy` (sonnet), strict JSON, 25 s timeout
//   fallback — deterministic: a real brief, not a caption. Every invariant
//              still present; only the creative middle is thinner.
//
// The model returns FIELDS, never a finished prompt, and `assembleBrief` builds
// the brief around them — so nothing structural can be softened by a model
// having an opinion. What the model now decides that it did not before: the
// concept, which brand colour fills which ROLE SLOT, and how the type is set.
// What it still may not touch: the copy, the logo fidelity rule, the margins,
// the format's conventions, the exclusions.

import { z } from 'zod';
import type { Brand } from '@/shared/types/brand';
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';
import type { ImageModelCaps } from '@/features/image-generation';
import {
  buildBrandImageContext,
  describeBrandForPrompt,
  type BrandImageContext,
} from './brandImageContext';
import {
  article,
  assembleBrief,
  hasCopy,
  inferDeliverable,
  ALL_BRAND_INCLUDED,
  type BrandInclusions,
  type ColourRoles,
  type CopyDeck,
  type DeliverableKind,
  type LayoutDirection,
  type LogoPlacement,
  type TypeSpec,
  type UserReferenceCounts,
} from './artDirection';
import { contractFor } from './formatBriefs';
import { planVariants } from './variants';

export type { CopyDeck, DeliverableKind } from './artDirection';

export interface CompileInput {
  userPrompt: string;
  brand: Brand | null | undefined;
  /** Human label of the target format, e.g. "1:1 Square". */
  formatLabel?: string;
  modelCaps?: ImageModelCaps;
  /** Refine flow: the user is editing an existing image. */
  refineOf?: { previousPrompt: string };
  /** Exact words the user wants set. Never invented on their behalf. */
  copy?: CopyDeck;
  /** Explicit finished-design / plain-image choice; inferred when absent. */
  kind?: DeliverableKind;
  /** The user's own reference images, by purpose. */
  userReferences?: UserReferenceCounts;
  /** Which parts of the brand may enter the frame. Defaults to everything. */
  include?: BrandInclusions;
  /** How many candidates this batch will produce. Drives the variant plan. */
  count?: number;
}

export interface CompiledPrompt {
  /** The first candidate's brief. Kept as the headline value. */
  prompt: string;
  /**
   * One brief PER CANDIDATE, planned to explore different ideas.
   * `prompts[0] === prompt` always.
   */
  prompts: string[];
  negativePrompt?: string;
  /** The compiler judged the request wants the brand's logo in-frame. */
  useLogo: boolean;
  /** Brand hexes the compiler decided are relevant (may be empty). */
  paletteHexes: string[];
  /** One line the UI shows under the compiled prompt. */
  notes: string;
  source: 'claude' | 'deterministic';
  original: string;
  /** What was built, and why — surfaced in the panel. */
  kind: DeliverableKind;
  deliverable: string;
  kindReason: string;
}

export interface CompileOptions {
  /** Injected for tests. Defaults to `callAnthropic`. */
  call?: typeof callAnthropic;
  timeoutMs?: number;
  /** Force the deterministic engine. */
  deterministicOnly?: boolean;
}

const ColourRolesSchema = z.object({
  ground: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  accent: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const TypeSpecSchema = z.object({
  weight: z.string().optional().nullable(),
  letterCase: z.string().optional().nullable(),
  tracking: z.string().optional().nullable(),
  headlineWidthPct: z.number().optional().nullable(),
  headlinePosition: z.string().optional().nullable(),
  subheadRatio: z.number().optional().nullable(),
  ctaTreatment: z.string().optional().nullable(),
});

const DirectionSchema = z.object({
  concept: z.string().default(''),
  subject: z.string().default(''),
  layout: z.string().default(''),
  lightFinish: z.string().default(''),
  paletteHexes: z.array(z.string()).default([]),
  colourRoles: ColourRolesSchema.optional().nullable(),
  typeSpec: TypeSpecSchema.optional().nullable(),
  logoPlacement: z.string().optional().nullable(),
  useLogo: z.boolean().default(false),
  negativePrompt: z.string().optional().nullable(),
  notes: z.string().default(''),
});

const LOGO_WORDS = /\b(logo|logomark|wordmark|brand ?mark|branding|branded|our brand|with the brand|monogram)\b/i;
const BRANDED_SUBJECTS = /\b(packaging|package|box|bottle|can|label|signage|sign|storefront|shopfront|billboard|poster|flyer|banner|ad|advert|advertisement|business card|letterhead|merch|merchandise|t-?shirt|hoodie|tote|mug|cap|uniform|van|truck|app screen|website|landing page|mockup|mock-up|stationery|invoice|menu|brochure|social post|instagram post|story|cover|thumbnail|badge|sticker|pin)\b/i;
const COLOR_OVERRIDE = /\b(black and white|monochrome|grayscale|greyscale|sepia|in (red|blue|green|yellow|orange|purple|pink|teal|gold|silver|pastel|neon)\b|only (red|blue|green|yellow|orange|purple|pink|teal|black|white)\b|no brand colou?rs?|without brand colou?rs?)\b/i;
const NO_LOGO = /\bno logo\b|\bwithout (the )?logo\b/i;

const PLACEMENTS: LogoPlacement[] = [
  'top-left', 'top-right', 'top-centre', 'bottom-left', 'bottom-right', 'bottom-centre', 'centre',
];

function asPlacement(v: unknown): LogoPlacement | undefined {
  if (typeof v !== 'string') return undefined;
  const norm = v.toLowerCase().replace(/\s+/g, '-').replace('center', 'centre');
  return PLACEMENTS.find((p) => p === norm);
}

/** Pure heuristics — shared by the fallback and used to sanity-check the model. */
export function heuristics(userPrompt: string, ctx: BrandImageContext | null) {
  const wantsLogoExplicit = LOGO_WORDS.test(userPrompt);
  const brandedSubject = BRANDED_SUBJECTS.test(userPrompt);
  const colorOverride = COLOR_OVERRIDE.test(userPrompt);
  const useLogo = !!ctx?.hasLogo && (wantsLogoExplicit || brandedSubject);
  return { wantsLogoExplicit, brandedSubject, colorOverride, useLogo };
}

/**
 * Whether the logo belongs in THIS frame.
 *
 * The old rule attached the logo whenever a branded noun appeared, including on
 * a wordless photograph — so "product shot of our bottle" sent the logo PNG to
 * a model whose brief said "LOGO — none. Do not draw, invent or imply a logo."
 * A picture only carries a mark if the user actually asked for one.
 */
export function decideLogo(
  kind: DeliverableKind,
  userPrompt: string,
  ctx: BrandImageContext | null,
  include: BrandInclusions,
): boolean {
  if (!ctx?.hasLogo || !include.logo) return false;
  if (NO_LOGO.test(userPrompt)) return false;
  const h = heuristics(userPrompt, ctx);
  return kind === 'design' ? true : h.wantsLogoExplicit;
}

/** Core brand hexes worth using, respecting a user colour direction. */
function relevantHexes(ctx: BrandImageContext | null, colorOverride: boolean): string[] {
  if (!ctx || colorOverride) return [];
  const seen = new Set<string>();
  return ctx.palette
    .filter((p) => p.role === 'primary' || p.role === 'secondary' || p.role === 'accent')
    .map((p) => p.hex)
    // Uniex's secondary and accent are the same green; naming it twice reads as
    // emphasis to a model, and it doubled the accent across the composition.
    .filter((hex) => (seen.has(hex) ? false : (seen.add(hex), true)))
    .slice(0, 3);
}

/**
 * Default role slots when nobody has judged them.
 *
 * Deliberately NOT "primary is the ground". A brand's primary is usually its
 * darkest, most saturated colour; flooding every frame with it is exactly the
 * monotony the palette module was built to avoid. The lighter of the first two
 * takes the ground and the darker carries the type, which is the readable
 * arrangement far more often than not.
 */
export function defaultColourRoles(ctx: BrandImageContext | null, hexes: string[]): ColourRoles | undefined {
  if (!hexes.length) return undefined;
  const lum = (hex: string) => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return 0.5;
    const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  if (hexes.length === 1) {
    const neutral = ctx?.palette.find((p) => p.role === 'neutral-light')?.hex;
    return lum(hexes[0]) < 0.5
      ? { ground: neutral ?? '#FFFFFF', type: hexes[0] }
      : { ground: hexes[0], type: ctx?.palette.find((p) => p.role === 'neutral-dark')?.hex ?? '#111111' };
  }
  const [a, b] = hexes;
  const lighter = lum(a) >= lum(b) ? a : b;
  const darker = lighter === a ? b : a;
  return { ground: lighter, type: darker, accent: hexes[2] };
}

// ─── Deterministic engine ────────────────────────────────────────────────────

export function deterministicCompile(input: CompileInput): CompiledPrompt {
  const original = input.userPrompt.trim();
  const ctx = buildBrandImageContext(input.brand);
  const include = input.include ?? ALL_BRAND_INCLUDED;
  const inferred = inferDeliverable(original, input.copy, input.kind);
  const h = heuristics(original, ctx);
  const contract = contractFor(inferred.noun);

  const useLogo = decideLogo(inferred.kind, original, ctx, include);
  const paletteHexes = include.colours ? relevantHexes(ctx, h.colorOverride) : [];

  const lightFinish = [
    include.identity && ctx?.styleDescriptors.length ? ctx.styleDescriptors.slice(0, 3).join(', ') : '',
    'photographed with intent: a single dominant light source, real shadow, sharp focus, no visual noise',
  ].filter(Boolean).join('; ');

  const direction: LayoutDirection = {
    concept: inferred.kind === 'design'
      ? `Make ${article(inferred.noun)} ${inferred.noun} that says one thing clearly and looks deliberately art-directed.`
      : '',
    subject: original,
    layout: inferred.kind === 'design'
      ? `Take the ${contract.archetypes[0]} reading: a dominant element, type set at a clear size hierarchy, and negative space used deliberately rather than left over.`
      : 'A single strong subject, framed with intent.',
    lightFinish,
    paletteHexes,
    colourRoles: defaultColourRoles(ctx, paletteHexes),
    typeSpec: undefined,
    logoPlacement: undefined,
    negativePrompt: undefined,
    notes: h.colorOverride
      ? 'Your colour direction kept; brand colours not forced.'
      : !include.colours ? 'Brand colours left out by your choice.'
        : paletteHexes.length ? `Brand colours used by role (${paletteHexes.length}).` : 'No brand colours applied.',
  };

  return finish(input, ctx, inferred, direction, useLogo, paletteHexes, 'deterministic', include);
}

/** Assemble one brief per candidate and package the result. */
function finish(
  input: CompileInput,
  ctx: BrandImageContext | null,
  inferred: ReturnType<typeof inferDeliverable>,
  direction: LayoutDirection,
  useLogo: boolean,
  paletteHexes: string[],
  source: 'claude' | 'deterministic',
  include: BrandInclusions,
): CompiledPrompt {
  const original = input.userPrompt.trim();
  const count = Math.max(1, Math.min(4, Math.trunc(input.count ?? 1) || 1));
  const contract = contractFor(inferred.noun);
  const variants = planVariants(count, contract, `${original}::${inferred.noun}`, inferred.kind);

  const built = variants.map((variant) => assembleBrief({
    kind: inferred.kind,
    userPrompt: original,
    copy: input.copy,
    brand: ctx,
    formatLabel: input.formatLabel ?? 'square',
    deliverableNoun: inferred.noun,
    logoAttached: useLogo,
    userReferences: input.userReferences,
    include,
    direction,
    variant,
    variantTotal: count,
  }));

  return {
    prompt: built[0].prompt,
    prompts: built.map((b) => b.prompt),
    negativePrompt: built[0].negativePrompt,
    useLogo,
    paletteHexes,
    notes: direction.notes,
    source,
    original,
    kind: inferred.kind,
    deliverable: inferred.noun,
    kindReason: inferred.reason,
  };
}

// ─── Assisted engine ─────────────────────────────────────────────────────────

const SYSTEM = `You are an ART DIRECTOR briefing an image-generation model for a brand design tool. You do NOT write the final prompt — you return the creative middle of a brief, as JSON fields. Another system assembles the deliverable statement, the format's conventions, the exact copy, the logo rule, the margins and the exclusions around your fields; do not restate them.

Return ONLY this JSON object:
{"concept": string, "subject": string, "layout": string, "lightFinish": string, "paletteHexes": string[], "colourRoles": {"ground": string|null, "type": string|null, "accent": string|null, "note": string|null}|null, "typeSpec": {"weight": string|null, "letterCase": string|null, "tracking": string|null, "headlineWidthPct": number|null, "headlinePosition": string|null, "subheadRatio": number|null, "ctaTreatment": string|null}|null, "logoPlacement": string|null, "useLogo": boolean, "negativePrompt": string|null, "notes": string}

Field contracts:
• concept — ONE sentence: the idea, and what it should make the viewer feel or do. This is the line that stops the result being a nice picture of the subject. Never a restatement of the request.
• subject — 1–2 sentences. The scene, product or concept, ENRICHED with concrete visual specifics: materials, surfaces, casting, setting, era, weather, time of day. Preserve the user's idea exactly; add craft, never a different idea. If the user named a product, keep that product. Never merely echo the request back.
• layout — 2–3 sentences of LAYOUT direction for a designer: what is DOMINANT and at roughly what share of the frame, where the eye lands first, second and third, the grid or alignment logic, and where the negative space falls and what it is doing. Never reserve empty space for text: if copy is listed it is being SET in this image; if no copy is listed the composition must be complete with no blank placeholder area.
• lightFinish — 1–2 sentences: medium (photography / 3D / vector / collage / risograph…), the lighting plan, texture, grain, colour grade. Specific enough that two photographers would light it the same way. "Considered lighting" is not an answer.
• paletteHexes — 0–3 hexes CHOSEN FROM the brand palette you were given, in order of importance. Pick only what genuinely serves this piece. If the user gave a colour direction ("black and white", "in red"), return [].
• colourRoles — which of those hexes plays which part: "ground" is the largest surface, "type" carries the words, "accent" is ONE element only. "note" is one sentence relating the photographic colour to them. Do not put a dark saturated brand colour on the ground unless the piece genuinely wants to be dark.
• typeSpec — how the headline is actually set: weight, letterCase, tracking, headlineWidthPct (share of frame width), headlinePosition, subheadRatio (subhead cap height ÷ headline cap height, typically 0.25–0.45), ctaTreatment. Null when no copy was supplied.
• useLogo — true if the brand's real logo should appear in frame. For a finished branded deliverable (post, ad, poster, packaging, signage, merch, cover) that is normally true. For a plain photograph, illustration, texture or pattern it is FALSE unless the user explicitly asked for the logo. If the user said "no logo", false.
• logoPlacement — one of: top-left, top-right, top-centre, bottom-left, bottom-right, bottom-centre, centre. Null if useLogo is false.
• negativePrompt — a short comma list of pitfalls SPECIFIC to this request (e.g. "extra fingers, plastic-looking skin"). General rules are already handled; do not repeat them. Null if nothing specific.
• notes — one short sentence for the user: what brand context you used and what you deliberately left out.

Binding rules:
1. The user's explicit instructions outrank every brand default and every rule below.
2. Enrich, never replace. Do not substitute a different subject because it would photograph better.
3. Do not force every brand attribute in. Choose what serves THIS piece.
4. NEVER invent marketing copy, slogans, prices, discounts, dates or offers. You are not writing words for the image; another system controls the text exactly.
5. Write for a designer, not a search engine. No keyword soup, no "8k, masterpiece, trending on artstation".
6. When the request is thin ("poster for orientation week"), do NOT return something thin. Infer a concrete scene from the brand's industry, offering, audience and tone. A vague brief is a failed brief.
Return JSON only. No markdown fences.`;

function extractJson(text: string): unknown {
  const t = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const candidate = fenced ? fenced[1] : t;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no json');
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * True when the "enriched" subject is really just the request echoed back.
 *
 * A thin answer is the silent failure mode: it costs a full compile, passes
 * every schema check, and produces exactly the generic output this whole layer
 * exists to prevent.
 */
export function isThin(subject: string, original: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  const a = norm(subject);
  const b = norm(original);
  if (!a) return true;
  if (a === b) return true;
  // Adds fewer than four words of its own to what the user already wrote.
  const extra = a.split(' ').filter((w) => !b.includes(w));
  return extra.length < 4;
}

export async function compileImagePrompt(
  input: CompileInput,
  opts: CompileOptions = {},
): Promise<CompiledPrompt> {
  const original = input.userPrompt.trim();
  const fallback = deterministicCompile(input);
  if (opts.deterministicOnly || !original) return fallback;
  const ctx = buildBrandImageContext(input.brand);
  const include = input.include ?? ALL_BRAND_INCLUDED;

  const call = opts.call ?? callAnthropic;
  // A full art-direction JSON from sonnet lands in 10–14 s. The first cut of
  // this used 12 s and quietly fell back to the deterministic brief on most
  // real requests — the expensive failure mode, because the user pays for the
  // image either way. Budget generously: the compile costs a fraction of a cent.
  const timeoutMs = opts.timeoutMs ?? 25000;
  const h = heuristics(original, ctx);
  const inferred = inferDeliverable(original, input.copy, input.kind);
  const contract = contractFor(inferred.noun);

  const copyLines = !include.text
    ? 'NO TEXT AT ALL — the user excluded words from this piece. Compose something that carries the idea with image alone. typeSpec must be null.'
    : hasCopy(input.copy)
      ? [
        'EXACT COPY THE USER SUPPLIED (another system sets these words; compose around them):',
        input.copy?.headline ? `  headline: "${input.copy.headline}"` : '',
        input.copy?.subhead ? `  subhead: "${input.copy.subhead}"` : '',
        input.copy?.cta ? `  cta: "${input.copy.cta}"` : '',
      ].filter(Boolean).join('\n')
      : 'NO COPY SUPPLIED — nothing further will be added to this image afterwards. The composition must be COMPLETE and finished on its own; do not reserve or leave a blank area for a headline. It may carry the brand name/tagline only.';

  const excluded = [
    !include.logo ? 'the brand logo — no logo, wordmark or watermark of any kind' : '',
    !include.text ? 'all text — the piece must carry no words at all' : '',
    !include.colours ? 'the brand palette — return an empty paletteHexes array and a null colourRoles' : '',
    !include.identity ? "the brand's typography, visual language and industry cues" : '',
  ].filter(Boolean);

  const refs = input.userReferences;
  const referenceLines = refs && (refs.style || refs.subject)
    ? `USER REFERENCES: ${refs.subject} subject reference(s) (the actual subject — reproduce it faithfully) and ${refs.style} style reference(s) (visual language only — never copy their subject).`
    : '';

  const userMsg = [
    `USER REQUEST: ${original}`,
    `DELIVERABLE: ${inferred.kind === 'design' ? `a finished ${inferred.noun}` : 'a wordless image'} at ${input.formatLabel ?? 'square'}`,
    `HOW IT IS READ: ${contract.readAs}. Layout archetypes that suit it: ${contract.archetypes.join('; ')}.`,
    copyLines,
    excluded.length ? `THE USER EXCLUDED: ${excluded.join('; ')}.` : '',
    referenceLines,
    input.refineOf ? `REFINEMENT of an earlier image whose brief was: "${input.refineOf.previousPrompt.slice(0, 400)}". Keep everything the user did not ask to change.` : '',
    ctx ? `BRAND: ${describeBrandForPrompt(ctx)}` : 'BRAND: none supplied.',
    input.modelCaps ? `MODEL: text rendering ${input.modelCaps.textRendering}; accepts ${input.modelCaps.maxReferenceImages} reference images.` : '',
    `HINTS: explicit logo words=${h.wantsLogoExplicit}; branded subject=${h.brandedSubject}; user colour direction=${h.colorOverride}; logo file available=${!!ctx?.hasLogo}.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await Promise.race([
      // Sonnet, not haiku: this is a craft judgement, and the cost is a
      // rounding error beside a paid image that misses.
      call({ model: 'sonnet', max_tokens: 1400, system: SYSTEM, messages: [{ role: 'user', content: userMsg }] }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('compile timeout')), timeoutMs)),
    ]);
    const text = firstText(res);
    if (!text) return fallback; // proxy mock (no key) answers empty
    const parsed = DirectionSchema.parse(extractJson(text));

    // A thin answer is a failed compile even though it parsed. The
    // deterministic brief is not better, but it is honest about what it knows.
    if (isThin(parsed.subject, original) && !parsed.concept.trim()) return fallback;

    // Guard rails the model may not cross.
    const known = new Set((ctx?.palette ?? []).map((p) => p.hex.toUpperCase()));
    const paletteHexes = (h.colorOverride || !include.colours)
      ? []
      : Array.from(new Set(parsed.paletteHexes.map((x) => x.toUpperCase())))
        .filter((x) => known.has(x)).slice(0, 3);

    // The logo decision is OURS. The model advises; it does not get to attach
    // a mark to a wordless photograph or to a piece the user excluded it from.
    const useLogo = decideLogo(inferred.kind, original, ctx, include)
      && (inferred.kind === 'design' ? parsed.useLogo || h.wantsLogoExplicit : true);

    const onlyKnown = (hex: string | null | undefined): string | undefined =>
      hex && known.has(hex.toUpperCase()) ? hex.toUpperCase() : undefined;
    const colourRoles: ColourRoles | undefined = paletteHexes.length
      ? {
        ground: onlyKnown(parsed.colourRoles?.ground) ?? defaultColourRoles(ctx, paletteHexes)?.ground,
        type: onlyKnown(parsed.colourRoles?.type) ?? defaultColourRoles(ctx, paletteHexes)?.type,
        accent: onlyKnown(parsed.colourRoles?.accent) ?? defaultColourRoles(ctx, paletteHexes)?.accent,
        note: parsed.colourRoles?.note?.trim() || undefined,
      }
      : undefined;

    const typeSpec: TypeSpec | undefined = (include.text && hasCopy(input.copy) && parsed.typeSpec)
      ? {
        weight: parsed.typeSpec.weight ?? undefined,
        letterCase: parsed.typeSpec.letterCase ?? undefined,
        tracking: parsed.typeSpec.tracking ?? undefined,
        headlineWidthPct: parsed.typeSpec.headlineWidthPct ?? undefined,
        headlinePosition: parsed.typeSpec.headlinePosition ?? undefined,
        subheadRatio: parsed.typeSpec.subheadRatio ?? undefined,
        ctaTreatment: parsed.typeSpec.ctaTreatment ?? undefined,
      }
      : undefined;

    const direction: LayoutDirection = {
      concept: parsed.concept,
      subject: parsed.subject,
      layout: parsed.layout,
      lightFinish: parsed.lightFinish,
      paletteHexes,
      colourRoles,
      typeSpec,
      logoPlacement: asPlacement(parsed.logoPlacement),
      negativePrompt: parsed.negativePrompt ?? undefined,
      notes: parsed.notes.trim() || fallback.notes,
    };

    return finish(input, ctx, inferred, direction, useLogo, paletteHexes, 'claude', include);
  } catch {
    return fallback;
  }
}
