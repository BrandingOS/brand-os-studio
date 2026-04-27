/**
 * Deck OS v2 — script-to-deck AI pipeline.
 *
 * One-shot Claude call that takes a free-form script (paragraph-form
 * pitch / launch / case-study text) plus a Brand and returns a fully-
 * structured `Deck` ready to drop into the v2 engine. The model picks
 * which of the 15 v2 layouts to use, fills the slots with copy that
 * matches the script and the brand voice, and emits image-search hints
 * (no URLs — the picker fills those later).
 *
 * Why one prompt instead of two? Splitting outline → layouts adds a
 * full round-trip (~5–8s on Sonnet) and a second tokenization cost
 * for ~no quality lift in our tests. The single prompt forces the
 * model to keep the outline in mind while picking layouts, which
 * actually produces tighter pacing.
 *
 * Layout coverage rules and the full slot manifest are baked into the
 * system prompt below — when adding a layout to `LAYOUT_CATALOG`, the
 * prompt picks it up automatically.
 */

import { LAYOUT_CATALOG, getLayoutMeta, type LayoutMeta, type SlotDef } from '../layouts/catalog';
import { EMPTY_THEME } from '@/shared/presentation/theme/types';
import type { Brand } from '@/shared/types/brand';
import type { Block, Deck, LayoutId, Slide, SlotId, TextBlock } from '../types';

/* ─── Public API ──────────────────────────────────────────────────── */

export type ScriptTemplateHint = 'pitch' | 'review' | 'launch' | 'case-study' | 'brand-identity';

export interface GenerateDeckInput {
  brand: Brand;
  /** 50–2000 chars. Caller validates length. */
  script: string;
  /** Bias the layout choice toward a presentation type. Optional. */
  templateHint?: ScriptTemplateHint;
  /** Optional title — defaults to a line generated from the script. */
  title?: string;
}

export interface GenerateDeckResult {
  deck: Deck;
  diagnostics: {
    durationMs: number;
    promptVersion: string;
    /** Slides skipped or coerced due to mapping problems (rare; surfaces as a small warning). */
    warnings: string[];
    /** True iff the result was served from the local cache. */
    cached: boolean;
  };
}

/** Bumped any time the prompt or schema changes. Used as a cache-key salt. */
export const PROMPT_VERSION = 'v1';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ─── Main entry point ────────────────────────────────────────────── */

export async function generateDeckFromScript(input: GenerateDeckInput): Promise<GenerateDeckResult> {
  const start = Date.now();
  const warnings: string[] = [];

  // 1. Cache check — short-circuit on repeat calls.
  const cacheKey = await hashCacheKey(input);
  const cached = readCache(cacheKey);
  if (cached) {
    return {
      deck: rehydrateDeckDates(cached),
      diagnostics: {
        durationMs: Date.now() - start,
        promptVersion: PROMPT_VERSION,
        warnings: [],
        cached: true,
      },
    };
  }

  // 2. Live API call.
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to .env.');
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const rawText = await callClaude({ systemPrompt, userPrompt, apiKey });

  // 3. Parse + validate.
  const parsed = parseAndValidate(rawText, warnings);

  // 4. Build the Deck.
  const now = new Date();
  const deck: Deck = {
    id: `deck-${input.brand.id}-ai-${Date.now()}`,
    brandId: input.brand.id,
    title: input.title ?? parsed.title ?? deriveTitle(input.script),
    slides: parsed.slides,
    theme: { ...EMPTY_THEME },
    origin: 'ai-script',
    scriptSource: { script: input.script, promptVersion: PROMPT_VERSION },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  // 5. Persist to cache.
  writeCache(cacheKey, deck);

  return {
    deck,
    diagnostics: {
      durationMs: Date.now() - start,
      promptVersion: PROMPT_VERSION,
      warnings,
      cached: false,
    },
  };
}

/* ─── Prompt construction ─────────────────────────────────────────── */

function buildSystemPrompt(): string {
  const layoutBlock = LAYOUT_CATALOG.map(formatLayoutForPrompt).join('\n');

  return `You are a senior presentation designer. You convert a paragraph-form script into a structured deck of typed slides.

You MUST respond with a single JSON object — no prose, no markdown fences, no commentary. The object MUST match this TypeScript-shape:

{
  "title": string,                       // short deck title (≤ 6 words)
  "slides": [
    {
      "section": string,                 // chapter label shown in chrome (e.g. "Introduction")
      "layout": string,                  // one of the layout ids listed below
      "blocks": {
        "<slotId>": {                    // slot ids are layout-specific (see manifest)
          "kind": "text" | "list" | "image" | "stat" | "quote" | "logo",
          // text:
          "text"?: string,
          "role"?: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label",
          // list:
          "items"?: string[],
          "marker"?: "dot" | "check" | "arrow" | "number",
          // image:
          "hint"?: string,               // 2–4 word search query — DO NOT include a url
          // stat:
          "value"?: string,              // e.g. "+8,000", "60%"
          "label"?: string,              // e.g. "users", "growth YoY"
          "trend"?: "up" | "down" | "flat",
          "caption"?: string,
          // quote:
          "author"?: string,
          // logo: no extra fields needed
        }
      }
    }
  ]
}

LAYOUT LIBRARY (id → description → required slots):

${layoutBlock}

RULES — failure to follow any rule yields a malformed deck:

1. Output 8 to 15 slides total. Aim for the lower end on short scripts.
2. The FIRST slide MUST be a "cover" layout.
3. The LAST slide MUST be a "cta" layout.
4. Use a varied mix of layouts — never use the same layout for more than 3 slides in a row.
5. Headlines (display, h1) ≤ 6 words. Bullets ≤ 7 words each. Body text 2–3 short lines max.
6. For every "image" slot, output { "kind": "image", "hint": "<2-4 word search query>" } — DO NOT invent URLs.
7. For every "logo" slot, output { "kind": "logo" } — no other fields.
8. For text blocks, ALWAYS include the "role" field. Use the role hinted by the layout's slot manifest (see above).
9. Detect the script's language. If the script is in Arabic, write the deck in Arabic. If English, write in English. If mixed, follow the dominant language.
10. Match the brand's voice and tone (provided in the user message). Write AS the brand, not ABOUT it.
11. Stat blocks: extract real numbers from the script when present. If the script has no numbers, use "stats-3" sparingly.
12. Section labels: pick concise chapter names (e.g. "Problem", "Solution", "Traction", "Team", "Ask"). Reuse the same section across consecutive slides on the same theme.
13. Use ONLY the layout ids listed above. Any other id is invalid.

REMINDER: respond with the JSON object ONLY. No backticks, no preamble.`;
}

function formatLayoutForPrompt(meta: LayoutMeta): string {
  const slots = Object.entries(meta.defaultBlocks)
    .map(([slotId, def]) => `${slotId}:${formatSlotDef(def)}`)
    .join(', ');
  return `- "${meta.id}" — ${meta.description}\n    slots: { ${slots} }`;
}

function formatSlotDef(def: SlotDef): string {
  const parts: string[] = [def.kind];
  if (def.role) parts.push(`role=${def.role}`);
  if (def.marker) parts.push(`marker=${def.marker}`);
  return parts.join(' ');
}

function buildUserPrompt(input: GenerateDeckInput): string {
  const { brand, script, templateHint, title } = input;
  const voice = brand.guidelines?.voiceAndTone?.brandVoice;
  const lines: string[] = [];

  lines.push(`BRAND: "${brand.name}"`);
  if (brand.tone) lines.push(`TONE: ${brand.tone}`);
  if (brand.audience) lines.push(`AUDIENCE: ${brand.audience}`);
  if (voice) lines.push(`BRAND VOICE: ${voice}`);
  if (brand.guidelines?.voiceAndTone?.toneAttributes?.length) {
    lines.push(`TONE ATTRIBUTES: ${brand.guidelines.voiceAndTone.toneAttributes.join(', ')}`);
  }
  if (brand.guidelines?.strategy?.mission) {
    lines.push(`MISSION: ${brand.guidelines.strategy.mission}`);
  }
  if (templateHint) {
    lines.push(`PRESENTATION TYPE HINT: ${describeHint(templateHint)} — bias slide pacing accordingly.`);
  }
  if (title) {
    lines.push(`TITLE OVERRIDE: ${title}`);
  }
  lines.push('');
  lines.push('SCRIPT:');
  lines.push(script.trim());
  lines.push('');
  lines.push('Now produce the JSON deck. Remember: JSON only, no prose.');

  return lines.join('\n');
}

function describeHint(hint: ScriptTemplateHint): string {
  switch (hint) {
    case 'pitch':         return 'investor pitch (problem → solution → traction → ask)';
    case 'review':        return 'quarterly review (highlights → metrics → wins → next quarter)';
    case 'launch':        return 'product launch (teaser → reveal → features → availability)';
    case 'case-study':    return 'case study (context → challenge → approach → results)';
    case 'brand-identity':return 'brand identity walkthrough (mission → voice → visual → application)';
  }
}

/* ─── HTTP call ───────────────────────────────────────────────────── */

interface CallArgs {
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
}

async function callClaude({ systemPrompt, userPrompt, apiKey }: CallArgs): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Claude API request failed: ${response.status} ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Claude returned an empty response');
  }
  return text;
}

/* ─── Parse + validate ────────────────────────────────────────────── */

interface ParsedResponse {
  title?: string;
  slides: Slide[];
}

interface RawSlide {
  section?: string;
  layout?: string;
  blocks?: Record<string, unknown>;
}

function parseAndValidate(rawText: string, warnings: string[]): ParsedResponse {
  // Strip code-fence wrappers if the model added them despite the rule.
  const cleaned = rawText
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${rawText.slice(0, 500)}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Claude returned non-object JSON: ${rawText.slice(0, 500)}`);
  }

  const root = parsed as { title?: unknown; slides?: unknown };
  const slidesArr = Array.isArray(root.slides) ? (root.slides as RawSlide[]) : null;
  if (!slidesArr) {
    throw new Error(`Claude response is missing a "slides" array: ${rawText.slice(0, 500)}`);
  }

  const validSlides: Slide[] = [];
  let counter = 0;

  for (const [i, raw] of slidesArr.entries()) {
    const slide = coerceSlide(raw, i, counter, warnings);
    if (slide) {
      validSlides.push(slide);
      counter += 1;
    }
  }

  if (validSlides.length === 0) {
    throw new Error(`Claude response yielded zero valid slides: ${rawText.slice(0, 500)}`);
  }

  return {
    title: typeof root.title === 'string' ? root.title : undefined,
    slides: validSlides,
  };
}

function coerceSlide(raw: RawSlide, index: number, counter: number, warnings: string[]): Slide | null {
  const layoutId = raw.layout as LayoutId | undefined;
  const meta = layoutId ? getLayoutMeta(layoutId) : undefined;

  if (!meta) {
    warnings.push(`Slide ${index + 1}: unknown layout "${raw.layout}" — skipped.`);
    return null;
  }

  const blocks: Record<SlotId, Block> = {};
  const rawBlocks = (raw.blocks ?? {}) as Record<string, unknown>;

  // Coerce every slot the model returned that's known to this layout.
  for (const [slotId, def] of Object.entries(meta.defaultBlocks)) {
    const fromAi = rawBlocks[slotId];
    const block = coerceBlock(fromAi, def, slotId, layoutId!, warnings);
    if (block) {
      blocks[slotId] = block;
    }
  }

  // Warn (but don't drop) when a required title / cover slot is missing.
  const requiredSlots = meta.id === 'quote' ? ['quote'] : ['title', 'metric', 'quote', 'label'];
  const hasAnyHeading = requiredSlots.some((s) => blocks[s]);
  if (!hasAnyHeading && layoutId !== 'gallery') {
    warnings.push(`Slide ${index + 1} (${layoutId}): no title/heading slot was filled.`);
  }

  return {
    id: `slide-ai-${counter}-${Date.now().toString(36)}`,
    layout: layoutId!,
    section: typeof raw.section === 'string' ? raw.section : undefined,
    blocks,
  };
}

interface RawBlock {
  kind?: string;
  text?: unknown;
  role?: unknown;
  items?: unknown;
  marker?: unknown;
  hint?: unknown;
  value?: unknown;
  label?: unknown;
  trend?: unknown;
  caption?: unknown;
  author?: unknown;
}

function coerceBlock(
  raw: unknown,
  def: SlotDef,
  slotId: string,
  layoutId: LayoutId,
  warnings: string[],
): Block | null {
  const r = (raw ?? {}) as RawBlock;
  const kind = r.kind ?? def.kind;

  switch (kind) {
    case 'text': {
      const text = typeof r.text === 'string' ? r.text : '';
      const role = isValidRole(r.role) ? (r.role as TextBlock['role']) : (def.role ?? 'body');
      if (!text && def.role === 'display') {
        warnings.push(`Slide layout=${layoutId} slot=${slotId}: empty display text.`);
      }
      return { kind: 'text', text, role };
    }
    case 'list': {
      const items = Array.isArray(r.items) ? r.items.filter((it) => typeof it === 'string') as string[] : [];
      const role = isValidRole(r.role) ? (r.role as TextBlock['role']) : (def.role ?? 'body');
      const marker = isValidMarker(r.marker) ? r.marker as 'dot' | 'check' | 'arrow' | 'number' | 'none' : (def.marker ?? 'dot');
      return { kind: 'list', items, role, marker };
    }
    case 'image': {
      return { kind: 'image', hint: typeof r.hint === 'string' ? r.hint : undefined };
    }
    case 'logo': {
      return { kind: 'logo', variant: 'auto' };
    }
    case 'stat': {
      return {
        kind: 'stat',
        value: typeof r.value === 'string' ? r.value : '',
        label: typeof r.label === 'string' ? r.label : '',
        trend: r.trend === 'up' || r.trend === 'down' || r.trend === 'flat' ? r.trend : undefined,
        caption: typeof r.caption === 'string' ? r.caption : undefined,
      };
    }
    case 'quote': {
      return {
        kind: 'quote',
        text: typeof r.text === 'string' ? r.text : '',
        author: typeof r.author === 'string' ? r.author : undefined,
      };
    }
    default:
      return null;
  }
}

function isValidRole(v: unknown): boolean {
  return typeof v === 'string' &&
    ['display', 'h1', 'h2', 'h3', 'h4', 'body', 'caption', 'label'].includes(v);
}

function isValidMarker(v: unknown): boolean {
  return typeof v === 'string' && ['dot', 'check', 'arrow', 'number', 'none'].includes(v);
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function deriveTitle(script: string): string {
  // First sentence, capped at ~50 chars.
  const first = script.trim().split(/[.!?\n]/)[0] ?? '';
  return first.length > 60 ? `${first.slice(0, 57)}…` : (first || 'Untitled deck');
}

function readApiKey(): string | undefined {
  try {
    return import.meta.env?.VITE_ANTHROPIC_API_KEY;
  } catch {
    return undefined;
  }
}

/* ─── Cache ───────────────────────────────────────────────────────── */

interface CacheEntry {
  deck: Deck;
  expiresAt: number;
}

function cacheKeyFor(hash: string): string {
  return `brandos:deck-ai-cache:${hash}`;
}

async function hashCacheKey(input: GenerateDeckInput): Promise<string> {
  const fingerprint = JSON.stringify({
    b: input.brand.id,
    s: input.script,
    h: input.templateHint ?? null,
    t: input.title ?? null,
    v: PROMPT_VERSION,
  });
  // Prefer Web Crypto when available; fall back to a cheap djb2 hash so
  // tests in jsdom don't fail when crypto.subtle is missing.
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const buf = new TextEncoder().encode(fingerprint);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    } catch {
      /* fall through */
    }
  }
  return djb2(fingerprint);
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function readCache(hash: string): Deck | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(hash));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || typeof entry.expiresAt !== 'number') return null;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(cacheKeyFor(hash));
      return null;
    }
    return entry.deck;
  } catch {
    return null;
  }
}

function writeCache(hash: string, deck: Deck): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const entry: CacheEntry = { deck, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(cacheKeyFor(hash), JSON.stringify(entry));
  } catch {
    // Quota or serialization — non-fatal.
  }
}

function rehydrateDeckDates(deck: Deck): Deck {
  return {
    ...deck,
    createdAt: new Date(deck.createdAt),
    updatedAt: new Date(deck.updatedAt),
  };
}
