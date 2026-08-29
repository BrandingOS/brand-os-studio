/**
 * The onboarding brief must answer EVERY Brand Strategy card in Setup.
 *
 * The prompt asks, the parser recognises, `interpret` files each answer on the
 * Core path (or business fact) the Setup card reads. A card with no line in
 * the prompt is a card the user has to fill by hand after "Build with AI".
 */
import { describe, expect, it } from 'vitest';
import { BRIEF_LABELS, buildBriefPrompt } from '../prompt';
import { parseBrief } from '../parseBrief';
import { interpret } from '@/features/onboarding/understanding/interpret';
import { STRATEGY_CARDS } from '@/features/setup/data/strategyCards';

const REPLY = [
  'Brand summary: Kaafex roasts single-origin coffee for people who care where it came from.',
  'Industry: Food & Beverage',
  'Products / Services: whole-bean coffee, cold brew, brewing gear',
  'Audience: Young adults',
  'Positioning: Premium',
  'Mission: To make great coffee traceable to the farm.',
  'Slogan: Know your cup',
  'Personality: Warm, Confident',
  'Tone: Friendly',
  'Visual style: Minimal, Modern',
  'Core values: Transparency, Quality, Craftsmanship',
  'Colors: #1B4D3E, #E8DCC8',
  'Fonts: Fraunces, Inter',
].join('\n');

/** Where each Setup card reads from. */
const CARD_SOURCE: Record<string, { path?: string; business?: string }> = {
  summary: { path: 'strategy.summary' },
  industry: { business: 'industry' },
  products: { business: 'description' },
  audience: { path: 'strategy.targetAudience' },
  positioning: { path: 'strategy.positioning' },
  mission: { path: 'strategy.mission' },
  personality: { path: 'strategy.personality' },
  tone: { path: 'voice.tone' },
  style: { path: 'visualStyle.descriptors' },
  values: { path: 'strategy.values' },
  slogan: { business: 'tagline' },
};

describe('the brief covers Brand Strategy end to end', () => {
  it('the prompt has a line for every strategy card', () => {
    const prompt = buildBriefPrompt('Kaafex');
    expect(prompt).toContain('Mission:');
    expect(prompt).toContain('Audience: pick ONE from:');
    expect(prompt).toContain('Positioning: pick ONE from:');
    for (const label of BRIEF_LABELS) expect(prompt).toContain(`${label}:`);
    expect(Object.keys(CARD_SOURCE).sort()).toEqual(STRATEGY_CARDS.map((c) => c.key).sort());
  });

  it('the parser reads every one of them back', () => {
    const b = parseBrief(REPLY);
    expect(b.summary).toContain('Kaafex');
    expect(b.mission).toBe('To make great coffee traceable to the farm.');
    expect(b.audience).toBe('Young adults');
    expect(b.positioning).toBe('Premium');
    expect(b.slogan).toBe('Know your cup');
    expect(b.residualProse).toBe('');
  });

  it('interpret files each answer where the Setup card reads it', async () => {
    const out = await interpret({ description: REPLY, items: [] });
    const byPath = new Map<string, unknown>(out.proposals.map((p) => [p.corePath as string, p.value]));
    for (const [card, src] of Object.entries(CARD_SOURCE)) {
      if (src.path) expect(byPath.get(src.path), card).toBeTruthy();
      else expect((out.business as Record<string, unknown>)[src.business!], card).toBeTruthy();
    }
    // Vocabulary answers are stored as member ids, not display text.
    expect(byPath.get('strategy.targetAudience')).toBe('young-adults');
    expect(byPath.get('strategy.positioning')).toBe('premium');
    expect(byPath.get('strategy.mission')).toBe('To make great coffee traceable to the farm.');
  });

  it('an audience the vocabulary lacks keeps the wording as Other', async () => {
    const out = await interpret({ description: REPLY.replace('Audience: Young adults', 'Audience: Other: Beekeepers'), items: [] });
    const v = out.proposals.find((p) => p.corePath === 'strategy.targetAudience')?.value;
    expect(String(v)).toMatch(/Beekeepers/);
  });
});
