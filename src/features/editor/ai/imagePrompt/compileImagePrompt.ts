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
//
// What changed (2026-08-19), and why
// ──────────────────────────────────
// The model used to return a FINISHED PROMPT: one ≤120-word paragraph
// describing a picture, under a rule that forbade text-in-image. A design tool
// therefore asked for — and got — backgrounds.
//
// Now the model returns FIELDS (subject, composition, style, palette,
// placement) and `assembleBrief` in `artDirection.ts` builds the prompt around
// them. Everything that must not drift — the deliverable line, the exact copy,
// the logo instruction, the safe margin, the exclusions — is written in code
// and cannot be softened by a model having an opinion.
//
// Two engines behind one function, as before:
//   claude   — `anthropic-proxy` (sonnet), strict JSON, 25 s timeout
//   fallback — deterministic: a real brief, not a caption. Every invariant
//              still present; only the creative middle is thinner.

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
  assembleBrief,
  hasCopy,
  inferDeliverable,
  type CopyDeck,
  type DeliverableKind,
  type LayoutDirection,
  type LogoPlacement,
} from './artDirection';

export type { CopyDeck, DeliverableKind } from './artDirection';

export interface CompileInput {
  userPrompt: string;
  brand: Brand | null | undefined;
  /** Human label of the target format, e.g. "1:1 Square". */
  formatLabel?: string;
  /** Style preset label chosen in the panel, if any. */
  styleLabel?: string;
  modelCaps?: ImageModelCaps;
  /** Refine flow: the user is editing an existing image. */
  refineOf?: { previousPrompt: string };
  /** Exact words the user wants set. Never invented on their behalf. */
  copy?: CopyDeck;
  /** Explicit finished-design / plain-image choice; inferred when absent. */
  kind?: DeliverableKind;
  /** How many user reference images are attached. */
  userReferenceCount?: number;
}

export interface CompiledPrompt {
  prompt: string;
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

const DirectionSchema = z.object({
  subject: z.string().default(''),
  composition: z.string().default(''),
  style: z.string().default(''),
  paletteHexes: z.array(z.string()).default([]),
  logoPlacement: z.string().optional().nullable(),
  useLogo: z.boolean().default(false),
  negativePrompt: z.string().optional().nullable(),
  notes: z.string().default(''),
});

const LOGO_WORDS = /\b(logo|logomark|wordmark|brand ?mark|branding|branded|our brand|with the brand|monogram)\b/i;
const BRANDED_SUBJECTS = /\b(packaging|package|box|bottle|can|label|signage|sign|storefront|shopfront|billboard|poster|flyer|banner|ad|advert|advertisement|business card|letterhead|merch|merchandise|t-?shirt|hoodie|tote|mug|cap|uniform|van|truck|app screen|website|landing page|mockup|mock-up|stationery|invoice|menu|brochure|social post|instagram post|story|cover|thumbnail|badge|sticker|pin)\b/i;
const COLOR_OVERRIDE = /\b(black and white|monochrome|grayscale|greyscale|sepia|in (red|blue|green|yellow|orange|purple|pink|teal|gold|silver|pastel|neon)\b|only (red|blue|green|yellow|orange|purple|pink|teal|black|white)\b|no brand colou?rs?|without brand colou?rs?)\b/i;

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

// ─── Deterministic engine ────────────────────────────────────────────────────

export function deterministicCompile(input: CompileInput): CompiledPrompt {
  const original = input.userPrompt.trim();
  const ctx = buildBrandImageContext(input.brand);
  const inferred = inferDeliverable(original, input.copy, input.kind);
  const h = heuristics(original, ctx);

  // A finished design carries the brand mark by default; a plain image does not.
  const useLogo = !!ctx?.hasLogo
    && (inferred.kind === 'design' ? true : h.useLogo)
    && !/\bno logo\b|\bwithout (the )?logo\b/i.test(original);

  const paletteHexes = relevantHexes(ctx, h.colorOverride);
  const style = [
    ctx?.styleDescriptors.slice(0, 3).join(', '),
    input.styleLabel && input.styleLabel !== 'No style' ? input.styleLabel.toLowerCase() : '',
    'sharp focus, considered lighting, no visual noise',
  ].filter(Boolean).join('; ');

  const direction: LayoutDirection = {
    subject: original,
    composition: inferred.kind === 'design'
      ? 'Build a deliberate layout: a dominant image area, type set at a clear size hierarchy, and generous breathing space — every element aligned to a simple grid.'
      : 'A single strong subject, framed with intent.',
    style,
    paletteHexes,
    logoPlacement: 'top-left',
    negativePrompt: undefined,
    notes: h.colorOverride
      ? 'Your colour direction kept; brand colours not forced.'
      : paletteHexes.length ? `Brand colours used by role (${paletteHexes.length}).` : 'No brand colours applied.',
  };

  const { prompt, negativePrompt } = assembleBrief({
    kind: inferred.kind,
    userPrompt: original,
    copy: input.copy,
    brand: ctx,
    formatLabel: input.formatLabel ?? 'square',
    deliverableNoun: inferred.noun,
    logoAttached: useLogo,
    userReferenceCount: input.userReferenceCount,
    direction,
  });

  return {
    prompt,
    negativePrompt,
    useLogo,
    paletteHexes,
    notes: direction.notes,
    source: 'deterministic',
    original,
    kind: inferred.kind,
    deliverable: inferred.noun,
    kindReason: inferred.reason,
  };
}

// ─── Assisted engine ─────────────────────────────────────────────────────────

const SYSTEM = `You are an ART DIRECTOR briefing an image-generation model for a brand design tool. You do NOT write the final prompt — you return the creative middle of a brief, as JSON fields. Another system assembles the deliverable statement, the exact copy, the logo rule, the margins and the exclusions around your fields; do not restate them.

Return ONLY this JSON object:
{"subject": string, "composition": string, "style": string, "paletteHexes": string[], "logoPlacement": string|null, "useLogo": boolean, "negativePrompt": string|null, "notes": string}

Field contracts:
• subject — 1–2 sentences. The scene, product or concept, ENRICHED with concrete visual specifics (materials, surfaces, lighting, era, setting, mood). Preserve the user's idea exactly; add craft, never a different idea. If the user named a product, keep that product.
• composition — 1–2 sentences of LAYOUT direction for a designer: where the focal point sits, how the type is arranged and at what relative scale, where negative space falls, the grid or alignment logic, camera angle/crop. For a finished design, say where the headline and any call to action sit. Never reserve empty space for text: if copy is listed, it is being SET in this image; if no copy is listed, the composition must be complete and balanced with no blank placeholder area. "Generous negative space for a headline" is always wrong.
• style — 1 sentence of treatment: medium (photography / 3D / vector / collage / risograph…), lighting, texture, finish, colour grading. Be specific enough that two designers would produce the same look.
• paletteHexes — 0–3 hexes CHOSEN FROM the brand palette you were given, in order of dominance. Pick only what genuinely serves this image. If the user gave a colour direction ("black and white", "in red"), return [].
• useLogo — true if the brand's real logo should appear in frame. For a finished branded deliverable (post, ad, poster, packaging, signage, merch, cover) that is normally true. For a plain photograph, illustration, texture or pattern it is false. If the user said "no logo", false.
• logoPlacement — one of: top-left, top-right, top-centre, bottom-left, bottom-right, bottom-centre, centre. Null if useLogo is false.
• negativePrompt — a short comma list of pitfalls SPECIFIC to this request (e.g. "extra fingers, plastic-looking skin"). General rules are already handled; do not repeat them. Null if nothing specific.
• notes — one short sentence for the user: what brand context you used and what you deliberately left out.

Binding rules:
1. The user's explicit instructions outrank every brand default and every rule below.
2. Enrich, never replace. Do not substitute a different subject because it would photograph better.
3. Do not force every brand attribute in. Choose what serves THIS image.
4. NEVER invent marketing copy, slogans, prices, discounts or offers. You are not writing words for the image; another system controls the text exactly.
5. Write for a designer, not a search engine. No keyword soup, no "8k, masterpiece, trending on artstation".
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

export async function compileImagePrompt(
  input: CompileInput,
  opts: CompileOptions = {},
): Promise<CompiledPrompt> {
  const original = input.userPrompt.trim();
  const fallback = deterministicCompile(input);
  if (opts.deterministicOnly || !original) return fallback;
  const ctx = buildBrandImageContext(input.brand);

  const call = opts.call ?? callAnthropic;
  // A full art-direction JSON from sonnet lands in 10–14 s. The first cut of
  // this used 12 s and quietly fell back to the deterministic brief on most
  // real requests — the expensive failure mode, because the user pays for the
  // image either way. Budget generously: the compile costs a fraction of a cent.
  const timeoutMs = opts.timeoutMs ?? 25000;
  const h = heuristics(original, ctx);
  const inferred = inferDeliverable(original, input.copy, input.kind);

  const copyLines = hasCopy(input.copy)
    ? [
      'EXACT COPY THE USER SUPPLIED (another system sets these words; compose around them):',
      input.copy?.headline ? `  headline: "${input.copy.headline}"` : '',
      input.copy?.subhead ? `  subhead: "${input.copy.subhead}"` : '',
      input.copy?.cta ? `  cta: "${input.copy.cta}"` : '',
    ].filter(Boolean).join('\n')
    : 'NO COPY SUPPLIED — nothing further will be added to this image afterwards. The composition must be COMPLETE and finished on its own; do not reserve or leave a blank area for a headline. It may carry the brand name/tagline only.';

  const userMsg = [
    `USER REQUEST: ${original}`,
    `DELIVERABLE: ${inferred.kind === 'design' ? `a finished ${inferred.noun}` : 'a wordless image'} at ${input.formatLabel ?? 'square'}`,
    copyLines,
    input.refineOf ? `REFINEMENT of an earlier image whose brief was: "${input.refineOf.previousPrompt.slice(0, 400)}". Keep everything the user did not ask to change.` : '',
    ctx ? `BRAND: ${describeBrandForPrompt(ctx)}` : 'BRAND: none supplied.',
    input.styleLabel && input.styleLabel !== 'No style' ? `STYLE PRESET CHOSEN BY USER: ${input.styleLabel}` : '',
    input.modelCaps ? `MODEL: text rendering ${input.modelCaps.textRendering}; accepts ${input.modelCaps.maxReferenceImages} reference images.` : '',
    `HINTS: explicit logo words=${h.wantsLogoExplicit}; branded subject=${h.brandedSubject}; user colour direction=${h.colorOverride}; logo file available=${!!ctx?.hasLogo}.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await Promise.race([
      // Sonnet, not haiku: this is a craft judgement, and the cost is a
      // rounding error beside a paid image that misses.
      call({ model: 'sonnet', max_tokens: 1100, system: SYSTEM, messages: [{ role: 'user', content: userMsg }] }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('compile timeout')), timeoutMs)),
    ]);
    const text = firstText(res);
    if (!text) return fallback; // proxy mock (no key) answers empty
    const parsed = DirectionSchema.parse(extractJson(text));

    // Guard rails the model may not cross.
    const known = new Set((ctx?.palette ?? []).map((p) => p.hex.toUpperCase()));
    const paletteHexes = h.colorOverride
      ? []
      : Array.from(new Set(parsed.paletteHexes.map((x) => x.toUpperCase())))
        .filter((x) => known.has(x)).slice(0, 3);
    const saidNoLogo = /\bno logo\b|\bwithout (the )?logo\b/i.test(original);
    const useLogo = !!ctx?.hasLogo && parsed.useLogo && !saidNoLogo;

    const direction: LayoutDirection = {
      subject: parsed.subject,
      composition: parsed.composition,
      style: parsed.style,
      paletteHexes,
      logoPlacement: asPlacement(parsed.logoPlacement),
      negativePrompt: parsed.negativePrompt ?? undefined,
      notes: parsed.notes.trim() || fallback.notes,
    };

    const { prompt, negativePrompt } = assembleBrief({
      kind: inferred.kind,
      userPrompt: original,
      copy: input.copy,
      brand: ctx,
      formatLabel: input.formatLabel ?? 'square',
      deliverableNoun: inferred.noun,
      logoAttached: useLogo,
      userReferenceCount: input.userReferenceCount,
      direction,
    });

    return {
      prompt,
      negativePrompt,
      useLogo,
      paletteHexes,
      notes: direction.notes,
      source: 'claude',
      original,
      kind: inferred.kind,
      deliverable: inferred.noun,
      kindReason: inferred.reason,
    };
  } catch {
    return fallback;
  }
}
