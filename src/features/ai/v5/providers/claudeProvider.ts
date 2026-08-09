/**
 * Claude provider — real Anthropic integration via the server-side
 * `anthropic-proxy` Edge Function. The API key lives ONLY server-side; the
 * browser never holds it. If the proxy/server key is unavailable the call
 * throws and we fall back to the mock provider.
 *
 * v5 PRD Phase 13.
 */
import type { AssistantProvider, AssistantReply, AssistantSendInput } from '../types';
import type { Brand } from '@/shared/types/brand';
import { mockProvider } from './mockProvider';
import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';

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

async function callClaude(input: AssistantSendInput): Promise<AssistantReply> {
  const messages = [
    ...input.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: input.message },
  ];

  const response = await callAnthropic({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(input.brand),
    messages,
  });

  const text = firstText(response);
  return { content: text || 'I had nothing to say. Try rephrasing?' };
}

export const claudeProvider: AssistantProvider = {
  name: 'claude',
  send: async (input) => {
    try {
      return await callClaude(input);
    } catch (err) {
      console.warn('[BrandOS] Claude provider failed, falling back to mock', err);
      return mockProvider.send(input);
    }
  },
};

/**
 * Returns the active provider. The proxy is the boundary — always return the
 * Claude provider; it degrades to mock internally if the server key is unset.
 */
export function getProvider(): AssistantProvider {
  return claudeProvider;
}
