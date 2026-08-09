/**
 * Anthropic Claude provider for the Brand Consistency engine.
 * Calls Anthropic through the server-side `anthropic-proxy` Edge Function — the
 * API key never enters the browser bundle. When the proxy/server key is missing,
 * the proxy returns empty content and this provider degrades to the mock copy.
 */

import type { IAiContentProvider, AiCopyRequest, AiCopyResponse, AiCopyContent } from './types';
import { composePrompt } from '../engine/promptComposer';
import { generateMockCopy } from './mockProvider';
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';

const MODEL = 'sonnet' as const; // tier — server proxy resolves the concrete model id

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
    // The server proxy holds the key; assume available and let it degrade to
    // mock server-side if the key is unset.
    return true;
  }

  async generate(req: AiCopyRequest): Promise<AiCopyResponse> {
    const fallback = generateMockCopy(req).content;
    const { system, user } = composePrompt(req);

    try {
      const res = await callAnthropic({
        model: MODEL,
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: user }],
      });

      const text = firstText(res);
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
