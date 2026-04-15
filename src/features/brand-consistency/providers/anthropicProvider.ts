/**
 * Anthropic Claude provider for the Brand Consistency engine.
 * Reuses the same `VITE_ANTHROPIC_API_KEY` env contract as the rest of
 * the app (see `src/shared/services/aiService.ts`). When the key is
 * missing, `available === false` and the orchestrator routes to the
 * mock provider so the feature degrades cleanly.
 */

import type { IAiContentProvider, AiCopyRequest, AiCopyResponse, AiCopyContent } from './types';
import { composePrompt } from '../engine/promptComposer';
import { generateMockCopy } from './mockProvider';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

function extractJson(text: string): unknown {
  // Models occasionally wrap JSON in code fences despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  // Find first '{' and last '}' to be safe.
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON object found in response');
  const slice = raw.slice(first, last + 1);
  return JSON.parse(slice);
}

function normalizeContent(json: unknown, fallback: AiCopyContent): AiCopyContent {
  if (!json || typeof json !== 'object') return fallback;
  const j = json as Record<string, unknown>;
  return {
    headline: typeof j.headline === 'string' ? j.headline : fallback.headline,
    subheadline: typeof j.subheadline === 'string' ? j.subheadline : fallback.subheadline,
    body: typeof j.body === 'string' ? j.body : fallback.body,
    cta: typeof j.cta === 'string' ? j.cta : fallback.cta,
    slides: Array.isArray(j.slides) ? (j.slides as AiCopyContent['slides']) : fallback.slides,
    features: Array.isArray(j.features) ? (j.features as AiCopyContent['features']) : fallback.features,
    bullets: Array.isArray(j.bullets) ? (j.bullets as string[]) : fallback.bullets,
    hashtags: Array.isArray(j.hashtags) ? (j.hashtags as string[]) : fallback.hashtags,
    meta: (j.meta && typeof j.meta === 'object') ? (j.meta as AiCopyContent['meta']) : fallback.meta,
  };
}

export class AnthropicConsistencyProvider implements IAiContentProvider {
  readonly name = 'anthropic';

  get available(): boolean {
    return Boolean(getApiKey());
  }

  async generate(req: AiCopyRequest): Promise<AiCopyResponse> {
    const apiKey = getApiKey();
    const fallback = generateMockCopy(req).content;

    if (!apiKey) {
      return { content: fallback, isAI: false, provider: 'mock' };
    }

    const { system, user } = composePrompt(req);

    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn('[brand-consistency] anthropic non-OK:', res.status, err);
        return { content: fallback, isAI: false, provider: 'mock', debugPrompt: user };
      }

      const data = await res.json();
      const text: string | undefined = data?.content?.[0]?.text;
      if (!text) {
        return { content: fallback, isAI: false, provider: 'mock', debugPrompt: user };
      }

      try {
        const parsed = extractJson(text);
        const content = normalizeContent(parsed, fallback);
        return { content, isAI: true, provider: this.name, debugPrompt: user };
      } catch (err) {
        console.warn('[brand-consistency] JSON parse failed, using fallback:', err);
        return { content: fallback, isAI: false, provider: 'mock', debugPrompt: user };
      }
    } catch (err) {
      console.warn('[brand-consistency] anthropic call failed:', err);
      return { content: fallback, isAI: false, provider: 'mock', debugPrompt: user };
    }
  }
}
