/**
 * Deterministic copy generator used as the fallback when no AI key is
 * configured (or when the AI call fails). It produces brand-coherent
 * placeholder copy by reading the brand tokens — so even the fallback
 * stays inside the brand system.
 */

import type { IAiContentProvider, AiCopyRequest, AiCopyResponse, AiCopyContent } from './types';
import type { BrandTokens } from '../engine/brandTokens';

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function descriptors(tokens: BrandTokens): string[] {
  return tokens.voice.descriptors.length ? tokens.voice.descriptors : ['modern', 'clear', 'confident'];
}

function moodAdjective(tokens: BrandTokens): string {
  return descriptors(tokens)[0] ?? 'modern';
}

function audienceLabel(tokens: BrandTokens): string {
  return tokens.voice.audience || 'people who care about quality';
}

function brandCopy(tokens: BrandTokens, brief?: string): AiCopyContent {
  const seed = hashSeed(`${tokens.brandId}:${brief ?? ''}`);
  const adj = moodAdjective(tokens);
  const audience = audienceLabel(tokens);
  const headlines = [
    `${tokens.brandName}, made ${adj}.`,
    `A ${adj} system for ${audience}.`,
    `Built for ${audience}.`,
    `Where ${adj} meets practical.`,
  ];
  const subheads = [
    `One brand. Many surfaces. Zero drift.`,
    `Designed end-to-end so every touchpoint feels like ${tokens.brandName}.`,
    `Crafted for ${audience} who expect more.`,
  ];
  const ctas = ['Get started', 'See it live', 'Explore', 'Begin'];
  return {
    headline: pick(headlines, seed),
    subheadline: pick(subheads, seed >> 3),
    cta: pick(ctas, seed >> 5),
    hashtags: [tokens.brandName.replace(/\s+/g, ''), 'brand', 'design', adj.replace(/\s+/g, '')].slice(0, 4),
  };
}

export function generateMockCopy(req: AiCopyRequest): AiCopyResponse {
  const { spec, tokens, campaignBrief } = req;
  const base = brandCopy(tokens, campaignBrief);
  const seed = hashSeed(`${tokens.brandId}:${spec.id}:${campaignBrief ?? ''}`);

  let content: AiCopyContent = base;

  switch (spec.promptKey) {
    case 'social_carousel':
      content = {
        slides: [
          { headline: base.headline ?? `Meet ${tokens.brandName}`, body: `Why ${audienceLabel(tokens)} are paying attention.` },
          { headline: 'How it works', body: `One brand system, applied across every surface — automatically.` },
          { headline: base.cta ?? 'Get started', body: `See it on your own brand in minutes.`, cta: base.cta ?? 'Try it' },
        ],
      };
      break;
    case 'web_features':
      content = {
        headline: `Built ${moodAdjective(tokens)}. End to end.`,
        subheadline: base.subheadline,
        features: [
          { title: 'Brand-locked', description: 'Every output renders inside your brand system. No drift.' },
          { title: 'AI-assisted', description: 'Copy and ideation generated against your tone, audience, and voice.' },
          { title: 'Production-ready', description: 'Export, share, and reuse without leaving the studio.' },
        ],
      };
      break;
    case 'business_card':
      content = {
        meta: {
          name: pick(['Sara Chen', 'Marcus Lee', 'Aïcha Bennani', 'Diego Rivera', 'Priya Shah'], seed),
          role: pick(['Brand Director', 'Head of Design', 'Founder', 'Creative Lead', 'Product Designer'], seed >> 2),
          email: `hello@${tokens.slug.toLowerCase()}.com`,
          phone: '+1 (555) 010-0420',
        },
      };
      break;
    case 'presentation':
      content = {
        headline: base.headline ?? `${tokens.brandName} system`,
        body: `One source of truth for every brand surface — from social posts to brand guidelines, all rendered inside the same token system.`,
        bullets: ['Brand-locked rendering', 'AI-assisted copy', 'Consistent across surfaces'],
      };
      break;
    case 'web_hero':
    case 'social_post':
    case 'guideline_intro':
    case 'digital_ad':
      content = base;
      break;
    case 'none':
    default:
      content = {};
  }

  return { content, isAI: false, provider: 'mock' };
}

export class MockConsistencyProvider implements IAiContentProvider {
  readonly name = 'mock';
  readonly available = true;
  async generate(req: AiCopyRequest): Promise<AiCopyResponse> {
    return generateMockCopy(req);
  }
}
