/**
 * Prompt Composer
 * ─────────────────────────────────────────────────────────────────────────
 * Builds the system + user prompts for AI content generation. EVERY prompt
 * carries the same brand consistency instructions — palette, tone, voice
 * descriptors, things to avoid, and a strict JSON output shape. This is
 * what prevents style drift between outputs.
 */

import type { BrandTokens } from './brandTokens';
import type { OutputSpec, PromptKey } from '../registry/outputSpecs';

export interface ComposedPrompt {
  system: string;
  user: string;
  /** Stable JSON-shape contract the model must follow for parsing. */
  schemaHint: string;
}

interface ComposeArgs {
  spec: OutputSpec;
  tokens: BrandTokens;
  campaignBrief?: string;
  toneVariant?: string;
  slots?: number;
}

const BRAND_LOCK_PREAMBLE = `
You are the BrandingOS Brand Consistency Engine. You write copy that lives
inside a STRUCTURED, brand-locked rendering system. You DO NOT control
colors, fonts, layout, logo, or imagery — those are fixed by the brand
token system. Your only job is to write words that fit a fixed brand
system without drifting in style across outputs.

NON-NEGOTIABLE RULES:
1. Treat the brand system below as a hard contract. Do not invent new
   tone words, do not switch register mid-output, do not contradict the
   brand voice or audience.
2. Every output you produce in a session must feel like the same author
   wrote it. Same cadence, same voice, same vocabulary.
3. Never reference colors, fonts, or imagery in your copy.
4. Output VALID JSON only — no prose, no markdown fences, no comments.
5. Respect the schema below exactly. Unknown fields = schema violation.
`.trim();

function brandCard(tokens: BrandTokens): string {
  const lines = [
    `Brand: ${tokens.brandName}`,
    `Tone: ${tokens.voice.tone}`,
    `Audience: ${tokens.voice.audience}`,
    `Personality: ${tokens.voice.personality.join(', ') || 'modern, confident'}`,
    `Mood: ${tokens.voice.moodLine || tokens.voice.descriptors.join(', ')}`,
  ];
  if (tokens.strategy.mission) lines.push(`Mission: ${tokens.strategy.mission}`);
  if (tokens.strategy.positioning) lines.push(`Positioning: ${tokens.strategy.positioning}`);
  if (tokens.strategy.values?.length) lines.push(`Values: ${tokens.strategy.values.join(', ')}`);
  lines.push(`Avoid: ${tokens.voice.avoid.join('; ')}`);
  return lines.map((l) => `  • ${l}`).join('\n');
}

const SCHEMAS: Record<PromptKey, string> = {
  social_post: `{ "headline": string, "subheadline"?: string, "cta"?: string, "hashtags"?: string[] }`,
  social_carousel: `{ "slides": Array<{ "headline": string, "body"?: string, "cta"?: string }> }  // exactly 3 slides`,
  web_hero: `{ "headline": string, "subheadline": string, "cta": string }`,
  web_features: `{ "headline": string, "subheadline"?: string, "features": Array<{ "title": string, "description": string }> }  // 3 features`,
  guideline_intro: `{ "headline": string, "subheadline": string }`,
  business_card: `{ "meta": { "name": string, "role": string, "email"?: string, "phone"?: string } }`,
  presentation: `{ "headline": string, "body": string, "bullets"?: string[] }`,
  digital_ad: `{ "headline": string, "subheadline"?: string, "cta": string }`,
  none: `{}`,
};

const TASK_BLURBS: Record<PromptKey, (s: OutputSpec) => string> = {
  social_post: (s) => `Write ONE ${s.label.toLowerCase()}. Headline ≤ 8 words, scroll-stopping but on-brand. Optional subheadline ≤ 16 words. Optional CTA ≤ 3 words. Hashtags optional, 3–5 max, no spaces.`,
  social_carousel: () => `Write a 3-slide carousel: slide 1 hooks (problem/insight), slide 2 delivers value, slide 3 issues a CTA. Each headline ≤ 8 words. Bodies ≤ 22 words. Same voice across all 3.`,
  web_hero: () => `Write the hero block. Headline ≤ 9 words, declarative. Subheadline ≤ 22 words, explains the value. CTA ≤ 3 words, action-oriented.`,
  web_features: () => `Write the features section: 1 headline (≤ 8 words) + 3 features. Each feature has a 2–4 word title and a 12–18 word description. Parallel structure across all 3.`,
  guideline_intro: (s) => `Write the cover for ${s.label.toLowerCase()}: a confident headline (≤ 6 words) and a one-line subheadline (≤ 14 words) that frames the brand book.`,
  business_card: () => `Invent a believable cardholder for this brand: realistic name, plausible role aligned to the brand audience, and (optional) a fictional but plausible email + phone. Keep it tasteful — not a parody.`,
  presentation: () => `Write a single keynote-style slide: headline (≤ 7 words) and one body paragraph (≤ 36 words). Optionally 3 bullets (≤ 6 words each). All in the brand voice.`,
  digital_ad: () => `Write a tight 300x250 ad: headline ≤ 6 words, optional subheadline ≤ 12 words, CTA ≤ 3 words.`,
  none: () => `(no AI copy needed)`,
};

export function composePrompt({ spec, tokens, campaignBrief, toneVariant, slots }: ComposeArgs): ComposedPrompt {
  const schema = SCHEMAS[spec.promptKey] || SCHEMAS.none;
  const task = TASK_BLURBS[spec.promptKey] || TASK_BLURBS.none;

  const system = [
    BRAND_LOCK_PREAMBLE,
    '',
    'BRAND SYSTEM (the hard contract):',
    brandCard(tokens),
    '',
    `OUTPUT SCHEMA (return EXACTLY this shape, no extra keys):`,
    schema,
  ].join('\n');

  const briefBlock = campaignBrief
    ? `Campaign brief: ${campaignBrief}`
    : `Campaign brief: a general-purpose brand piece (no specific campaign).`;

  const toneBlock = toneVariant
    ? `Tone variant for THIS output: ${toneVariant}. Stay inside the brand voice; this is a flavor, not a pivot.`
    : '';

  const slotsBlock = slots ? `Slots: ${slots}` : '';

  const user = [
    `Output type: ${spec.label} — ${spec.description}`,
    task(spec),
    briefBlock,
    toneBlock,
    slotsBlock,
    '',
    'Return JSON only.',
  ].filter(Boolean).join('\n');

  return { system, user, schemaHint: schema };
}
