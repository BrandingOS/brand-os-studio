/**
 * Prompt Enhancer — Lovart-style enrichment of raw user input.
 *
 * Users type terse prompts like "sale banner" or "instagram post for summer".
 * Before we call the model we enrich the prompt with explicit design
 * direction: style, composition, palette guidance (pulled from brand), and
 * intent. The enhanced prompt stays in the request only — the original
 * user-typed message is what appears in the chat transcript.
 *
 * This runs entirely client-side. It's deterministic string shaping, not an
 * extra model round-trip, so it costs zero tokens by itself.
 */
import type { SkillId } from '../types';

export interface EnhanceInput {
  raw: string;
  skill?: SkillId;
  brandHandle: string;
}

const SKILL_DIRECTIVES: Record<SkillId, string> = {
  design:
    'Produce a polished, on-brand design layout. Think composition, hierarchy, whitespace. Use a 12-col mental grid.',
  branding:
    'Explore brand system artifacts: logo applications, color usage, typography specimens, tonal range. Output as reference boards.',
  illustration:
    'Generate illustrative concept boards — shape-based compositions and motifs. Describe illustrations as primitives (rect / swatch / text labels) the canvas can render.',
  'social-post':
    'Design for social feeds (1080x1080 square or 1080x1350 portrait). Strong hook text, clear hierarchy, brand color block, max 2 fonts.',
  'ad-creative':
    'High-conversion ad: punchy headline, supporting subhead, CTA button, accent color block. Keep text short.',
  video:
    'Storyboard frames — 3 to 5 frame cards laid out horizontally describing beats of a short video.',
};

const FRAMEWORK = `
You are a branded-design agent. Your job is to turn a user request into a small
design spec that renders on an infinite canvas.

Rules:
- Stay strictly on-brand. Reference the <brand> block by handle. For brand
  colors, emit the handle (e.g. "@slug.colors.primary") OR the literal hex —
  both are accepted. For the logo, use a logo node with variant="full" | "icon".
- Compose with intent: strong hierarchy, generous whitespace, a single accent.
- Keep node counts reasonable (5 to 20 per turn). Do not overlap nodes
  randomly — lay them out in a legible arrangement.
- Coordinates are in canvas pixels. (0,0) is fine. Group related items as a
  frame when the user is asking for a concrete artifact (post, banner, card).
- Respond ONLY with a JSON object matching the schema. No prose outside JSON.

Schema:
{
  "message": "one short sentence to the user",
  "nodes": DesignNode[],
  "suggestions": string[]?   // 2-4 short follow-up ideas, optional
}

DesignNode (discriminated by "kind"):
  text:   { id, kind:"text",   x,y, width, text, fontSize, fontWeight, color, align?, fontFamily? }
  rect:   { id, kind:"rect",   x,y, width, height, fill, radius?, stroke?, strokeWidth? }
  swatch: { id, kind:"swatch", x,y, colors:string[], label? }
  logo:   { id, kind:"logo",   x,y, width, height, variant?:"full"|"icon"|"wordmark"|"dark"|"light" }
  frame:  { id, kind:"frame",  x,y, width, height, label, background?, children:DesignNode[] }

All ids must be unique short strings like "n1", "n2".
`.trim();

export function buildSystemPrompt(brandBlock: string): string {
  return [FRAMEWORK, '', 'Brand context:', brandBlock].join('\n');
}

/**
 * Shape the user's raw prompt into a richer directive the model sees.
 * The chat UI keeps the raw message; only the model sees this enhanced form.
 */
export function enhanceUserPrompt(input: EnhanceInput): string {
  const { raw, skill, brandHandle } = input;
  const directive = skill ? SKILL_DIRECTIVES[skill] : SKILL_DIRECTIVES.design;

  const lines = [
    `User request: "${raw.trim()}"`,
    `Target brand: ${brandHandle} (see <brand> block in system prompt).`,
    `Skill mode: ${skill ?? 'design'}.`,
    `Directive: ${directive}`,
    `Deliverable: a concrete design laid out on the canvas that the user can immediately react to. Prefer one clear artifact over many tentative options.`,
  ];

  return lines.join('\n');
}
