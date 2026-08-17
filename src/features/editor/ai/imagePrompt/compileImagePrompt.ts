// compileImagePrompt — turn the user's words into a brand-aware image
// prompt WITHOUT hijacking them.
//
// The owner's rules (2026-08-17), which the system prompt below encodes
// verbatim and the deterministic fallback obeys by construction:
//   • preserve the user's original creative intent
//   • use brand context to ENRICH and CONSTRAIN, never to replace
//   • do not force every brand attribute into every generation — only
//     the relevant brand information
//   • do NOT add logo placement unless the user asks for a logo or the
//     request clearly requires branding (packaging, signage, ad, business
//     card, merch, storefront, app screen with the brand…)
//   • do not force every brand color into every image
//   • explicit user instructions win over brand defaults
//   • the compiled prompt is shown, editable, before generation (UI)
//
// Two engines behind one function:
//   claude   — `anthropic-proxy` (haiku), strict JSON, 8 s timeout
//   fallback — deterministic: appends a short style clause + the
//              relevant colors; never adds the logo on its own.

import { z } from 'zod';
import type { Brand } from '@/shared/types/brand';
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';
import type { ImageModelCaps } from '@/features/editor/ai/imageModels';
import {
  buildBrandImageContext,
  describeBrandForPrompt,
  type BrandImageContext,
} from './brandImageContext';

export interface CompileInput {
  userPrompt: string;
  brand: Brand | null | undefined;
  /** Human label of the target format, e.g. "1:1 square social post". */
  formatLabel?: string;
  /** Style preset label chosen in the panel, if any. */
  styleLabel?: string;
  modelCaps?: ImageModelCaps;
  /** Refine flow: the user is editing an existing image. */
  refineOf?: { previousPrompt: string };
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
}

export interface CompileOptions {
  /** Injected for tests. Defaults to `callAnthropic`. */
  call?: typeof callAnthropic;
  timeoutMs?: number;
  /** Force the deterministic engine (Raw+brand clause). */
  deterministicOnly?: boolean;
}

const CompiledSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional().nullable(),
  useLogo: z.boolean(),
  paletteHexes: z.array(z.string()).default([]),
  notes: z.string().default(''),
});

const LOGO_WORDS = /\b(logo|logomark|wordmark|brand ?mark|branding|branded|our brand|with the brand|monogram)\b/i;
const BRANDED_SUBJECTS = /\b(packaging|package|box|bottle|can|label|signage|sign|storefront|shopfront|billboard|poster|flyer|banner|ad|advert|advertisement|business card|letterhead|merch|merchandise|t-?shirt|hoodie|tote|mug|cap|uniform|van|truck|app screen|website|landing page|mockup|mock-up|stationery|invoice|menu|brochure|social post|instagram post|story|cover|thumbnail|badge|sticker|pin)\b/i;
const COLOR_OVERRIDE = /\b(black and white|monochrome|grayscale|greyscale|sepia|in (red|blue|green|yellow|orange|purple|pink|teal|gold|silver|pastel|neon)\b|only (red|blue|green|yellow|orange|purple|pink|teal|black|white)\b|no brand colou?rs?|without brand colou?rs?)\b/i;

/** Pure heuristics — shared by the fallback and used to sanity-check Claude. */
export function heuristics(userPrompt: string, ctx: BrandImageContext | null) {
  const wantsLogoExplicit = LOGO_WORDS.test(userPrompt);
  const brandedSubject = BRANDED_SUBJECTS.test(userPrompt);
  const colorOverride = COLOR_OVERRIDE.test(userPrompt);
  const useLogo = !!ctx?.hasLogo && (wantsLogoExplicit || brandedSubject);
  return { wantsLogoExplicit, brandedSubject, colorOverride, useLogo };
}

export function deterministicCompile(input: CompileInput): CompiledPrompt {
  const original = input.userPrompt.trim();
  const ctx = buildBrandImageContext(input.brand);
  if (!ctx) {
    return { prompt: original, useLogo: false, paletteHexes: [], notes: 'No brand context.', source: 'deterministic', original };
  }
  const h = heuristics(original, ctx);
  const clauses: string[] = [];
  const paletteHexes: string[] = [];

  if (!h.colorOverride) {
    // Only the accent-worthy colors — never the whole ladder.
    const core = ctx.palette.filter((p) => p.role === 'primary' || p.role === 'secondary').slice(0, 2);
    if (core.length) {
      paletteHexes.push(...core.map((p) => p.hex));
      clauses.push(`subtle accents in ${core.map((p) => p.hex).join(' and ')}`);
    }
  }
  if (ctx.styleDescriptors.length) clauses.push(`${ctx.styleDescriptors.slice(0, 3).join(', ')} aesthetic`);
  if (h.useLogo) clauses.push(`the ${ctx.name} logo shown accurately from the reference, placed naturally`);
  if (h.brandedSubject && !h.useLogo && !ctx.hasLogo) clauses.push(`for the brand ${ctx.name}`);
  if (input.styleLabel && input.styleLabel !== 'No style') clauses.push(input.styleLabel.toLowerCase());
  clauses.push('high quality, coherent composition');

  const prompt = clauses.length ? `${original}. ${clauses.join(', ')}.` : original;
  const notes = [
    paletteHexes.length ? `Brand colors as accents (${paletteHexes.length}).` : (h.colorOverride ? 'Your color direction kept; brand colors not forced.' : 'No brand colors added.'),
    h.useLogo ? 'Logo included (you asked for branding).' : 'No logo — not requested.',
  ].join(' ');
  return { prompt, useLogo: h.useLogo, paletteHexes, notes, source: 'deterministic', original };
}

const SYSTEM = `You compile IMAGE-GENERATION prompts for a brand design tool. You receive the user's request and a brand summary. Return ONLY a JSON object: {"prompt": string, "negativePrompt": string|null, "useLogo": boolean, "paletteHexes": string[], "notes": string}.

Rules (binding):
1. Preserve the user's original creative intent. The subject, scene, mood and any explicit instruction they wrote stay exactly as meant. Rewrite for clarity and richness (composition, lighting, materials, camera/style words), never for a different idea.
2. Use brand context to ENRICH and CONSTRAIN — never to replace. Do not force every brand attribute into every image; pick only what serves THIS request.
3. LOGO: set useLogo=true ONLY if the user asks for the logo/branding, or the subject clearly requires branding (packaging, signage, ads, business cards, merch, storefronts, mockups, brand social posts). A cat on a sofa, a landscape, a portrait, abstract art → useLogo=false and NO logo language in the prompt. If useLogo=true and a logo file exists, describe it as "the brand logo exactly as in the reference image, undistorted, placed naturally" — never invent a logo shape.
4. COLORS: do not force every brand color. Choose 0–3 hexes that genuinely fit the scene as accents/backdrop and list them in paletteHexes; if the user gave a color direction (e.g. "black and white", "in red"), obey it and leave paletteHexes empty unless it agrees.
5. Explicit user instructions override brand defaults, always.
6. Keep the prompt one paragraph, ≤ 120 words, concrete, no marketing fluff, no hex codes spelled in the prompt unless the model benefits (you may say "deep navy (#0B1F3A)"). No text-in-image instructions unless the user asked for text.
7. negativePrompt: short comma list of things to avoid for this request (or null).
8. notes: one short sentence for the user explaining what brand context you used and what you deliberately left out.
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
  if (!ctx) return fallback;

  const call = opts.call ?? callAnthropic;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const h = heuristics(original, ctx);

  const userMsg = [
    `USER REQUEST: ${original}`,
    input.refineOf ? `This is a REFINEMENT of an earlier image whose prompt was: "${input.refineOf.previousPrompt}". Keep what the user did not ask to change.` : '',
    `BRAND: ${describeBrandForPrompt(ctx)}`,
    input.formatLabel ? `FORMAT: ${input.formatLabel}` : '',
    input.styleLabel && input.styleLabel !== 'No style' ? `STYLE PRESET CHOSEN BY USER: ${input.styleLabel}` : '',
    input.modelCaps ? `MODEL: text rendering ${input.modelCaps.text}; accepts ${input.modelCaps.maxRefs} reference images (a logo reference will be attached only if useLogo=true).` : '',
    `HINTS: explicit logo words=${h.wantsLogoExplicit}; branded subject=${h.brandedSubject}; user color direction=${h.colorOverride}.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await Promise.race([
      call({ model: 'haiku', max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content: userMsg }] }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('compile timeout')), timeoutMs)),
    ]);
    const text = firstText(res);
    if (!text) return fallback; // proxy mock (no key) answers empty
    const parsed = CompiledSchema.parse(extractJson(text));
    // Guard rails the model must not cross: a logo needs a logo file, and
    // a user color direction empties the brand palette. Claude's useLogo
    // judgement is otherwise trusted (it saw the rules + the hints); the
    // UI shows the Logo chip so the user can drop it in one click.
    const useLogo = parsed.useLogo && ctx.hasLogo;
    const known = new Set(ctx.palette.map((p) => p.hex.toUpperCase()));
    const paletteHexes = h.colorOverride
      ? []
      : parsed.paletteHexes.map((x) => x.toUpperCase()).filter((x) => known.has(x)).slice(0, 3);
    return {
      prompt: parsed.prompt.trim(),
      negativePrompt: parsed.negativePrompt?.trim() || undefined,
      useLogo,
      paletteHexes,
      notes: parsed.notes.trim() || fallback.notes,
      source: 'claude',
      original,
    };
  } catch {
    return fallback;
  }
}
