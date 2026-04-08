/**
 * Claude provider — real Anthropic API integration.
 *
 * Activated when `VITE_ANTHROPIC_API_KEY` is set in the environment. Falls
 * back to the mock provider otherwise. The factory in `getProvider()` does
 * the selection so callers don't need to know which one is active.
 *
 * IMPORTANT: shipping API keys to the browser is only acceptable for local
 * development. In production, route through a server-side proxy. This
 * implementation honors `dangerouslyAllowBrowser: true` for dev convenience
 * but the README will document the proxy pattern.
 *
 * v5 PRD Phase 13.
 */
import type { AssistantProvider, AssistantReply, AssistantSendInput } from '../types';
import type { Brand } from '@/shared/types/brand';
import { mockProvider } from './mockProvider';

const MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 1024;

function buildSystemPrompt(brand?: Brand): string {
  if (!brand) {
    return `You are the BrandOS Brand Assistant. The user has not selected a brand yet — guide them to open one before asking brand-specific questions.`;
  }
  const strategy = brand.guidelines?.strategy;
  const palette = `${brand.primaryColor}${brand.secondaryColor ? ` and ${brand.secondaryColor}` : ''}`;
  return [
    `You are the BrandOS Brand Assistant for the brand "${brand.name}".`,
    `Tone: ${brand.tone}.`,
    `Audience: ${brand.audience}.`,
    `Color palette: ${palette}.`,
    brand.fonts?.primary && `Primary font: ${brand.fonts.primary}.`,
    strategy?.mission && `Mission: ${strategy.mission}`,
    strategy?.vision && `Vision: ${strategy.vision}`,
    strategy?.positioning && `Positioning: ${strategy.positioning}`,
    strategy?.values?.length && `Values: ${strategy.values.join(', ')}`,
    ``,
    `Be concise and actionable. Always answer in the brand's voice. When you write copy, write it AS the brand, not about it. When you give advice, give it grounded in the brand's actual configuration above.`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function callClaude(input: AssistantSendInput, apiKey: string): Promise<AssistantReply> {
  // Dynamically import the SDK so the bundle stays small when the provider
  // isn't used.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const messages = [
    ...input.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: input.message },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(input.brand),
    messages,
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('\n');

  return { content: text || 'I had nothing to say. Try rephrasing?' };
}

export const claudeProvider: AssistantProvider = {
  name: 'claude',
  send: async (input) => {
    const key = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ANTHROPIC_API_KEY;
    if (!key) {
      // Defensive — should not happen if getProvider() chose us, but be
      // resilient.
      return mockProvider.send(input);
    }
    try {
      return await callClaude(input, key);
    } catch (err) {
      console.warn('[BrandOS] Claude provider failed, falling back to mock', err);
      return mockProvider.send(input);
    }
  },
};

/**
 * Returns the active provider based on environment configuration.
 * Use this from `BrandAssistantProvider` instead of importing a specific one.
 */
export function getProvider(): AssistantProvider {
  const key = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ANTHROPIC_API_KEY;
  return key ? claudeProvider : mockProvider;
}
