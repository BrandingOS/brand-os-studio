/**
 * AI Agent — client-side Anthropic caller for AI Design.
 *
 * Pattern mirrors `src/features/ai/v5/providers/claudeProvider.ts`:
 * - Dynamic SDK import to keep bundles lean.
 * - `dangerouslyAllowBrowser: true` for dev. Production deployments should
 *   move this behind an Edge Function (see CLAUDE.md security constraint).
 * - Mock fallback when `VITE_ANTHROPIC_API_KEY` is unset so the feature
 *   stays demo-able without a key.
 */
import type { Brand } from '@/shared/types/brand';
import type { AgentTurn, ChatMessage, DesignNode, SkillId } from '../types';
import { buildBrandCard } from './brandCard';
import { buildSystemPrompt, enhanceUserPrompt } from './promptEnhancer';

const MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 2048;

export interface AgentRequest {
  brand?: Brand;
  history: ChatMessage[];
  userMessage: string;
  skill?: SkillId;
}

function getApiKey(): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_ANTHROPIC_API_KEY;
}

function extractJson(text: string): unknown | null {
  // Strip markdown fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // Look for the first {...} block.
    const brace = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (brace >= 0 && end > brace) {
      try {
        return JSON.parse(raw.slice(brace, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeNodes(nodes: unknown): DesignNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.filter((n): n is DesignNode => {
    if (!n || typeof n !== 'object') return false;
    const kind = (n as { kind?: string }).kind;
    return (
      kind === 'text' ||
      kind === 'rect' ||
      kind === 'swatch' ||
      kind === 'logo' ||
      kind === 'frame'
    );
  });
}

async function callClaude(req: AgentRequest, apiKey: string): Promise<AgentTurn> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const { block, handles } = buildBrandCard(req.brand);
  const system = buildSystemPrompt(block);
  const enhanced = enhanceUserPrompt({
    raw: req.userMessage,
    skill: req.skill,
    brandHandle: handles.brand,
  });

  const messages = [
    ...req.history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: enhanced },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('\n');

  const parsed = extractJson(text) as Partial<AgentTurn> | null;
  if (!parsed) {
    return { message: text.slice(0, 400) || 'No response.', nodes: [] };
  }
  return {
    message: typeof parsed.message === 'string' ? parsed.message : 'Design ready.',
    nodes: normalizeNodes(parsed.nodes),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string').slice(0, 4)
      : undefined,
  };
}

/**
 * Deterministic mock — runs when no API key is configured. Produces a
 * recognizable, brand-themed layout so the feature is still usable in demos.
 */
function mockAgent(req: AgentRequest): AgentTurn {
  const primary = req.brand?.primaryColor ?? '#6B46FF';
  const secondary = req.brand?.secondaryColor ?? '#0B0B12';
  const name = req.brand?.name ?? 'Untitled Brand';
  const font = req.brand?.fonts?.primary ?? 'Inter';
  const hasLogo = Boolean(req.brand?.logoAssets?.full || req.brand?.logo);

  const headline = req.userMessage.slice(0, 60);
  const id = (n: number) => `mock-${Date.now().toString(36)}-${n}`;

  const nodes: DesignNode[] = [
    {
      id: id(0),
      kind: 'frame',
      x: 80,
      y: 80,
      width: 1080,
      height: 1080,
      label: req.skill === 'social-post' ? 'Instagram Post' : 'Design Frame',
      background: '#ffffff',
      children: [],
    },
    {
      id: id(1),
      kind: 'rect',
      x: 80,
      y: 80,
      width: 1080,
      height: 320,
      fill: primary,
    },
    ...(hasLogo
      ? [
          {
            id: id(2),
            kind: 'logo' as const,
            x: 128,
            y: 128,
            width: 180,
            height: 180,
            variant: 'full' as const,
          },
        ]
      : []),
    {
      id: id(3),
      kind: 'text',
      x: 128,
      y: 460,
      width: 920,
      text: headline || `Hello from ${name}`,
      fontSize: 88,
      fontWeight: 800,
      color: secondary,
      fontFamily: font,
    },
    {
      id: id(4),
      kind: 'text',
      x: 128,
      y: 640,
      width: 880,
      text: req.brand?.tone
        ? `Tone: ${req.brand.tone}.`
        : 'Designed with the BrandOS AI agent.',
      fontSize: 28,
      fontWeight: 400,
      color: '#4b5563',
      fontFamily: font,
    },
    {
      id: id(5),
      kind: 'swatch',
      x: 128,
      y: 980,
      colors: [primary, secondary, '#F3F4F6', '#111827'],
      label: 'Palette',
    },
  ];

  return {
    message: `(Mock mode — no API key configured.) Laid out a ${req.skill ?? 'design'} concept for "${headline || name}".`,
    nodes,
    suggestions: [
      'Make it darker',
      'Try a portrait social post',
      'Add a CTA button',
      'Show alt color',
    ],
  };
}

export async function runAgent(req: AgentRequest): Promise<AgentTurn> {
  const key = getApiKey();
  if (!key) return mockAgent(req);
  try {
    return await callClaude(req, key);
  } catch (err) {
    console.warn('[AI Design] Claude call failed, using mock output.', err);
    return mockAgent(req);
  }
}

export function isLiveMode(): boolean {
  return Boolean(getApiKey());
}
