import { describe, expect, it } from 'vitest';
import {
  buildBrandingPrompt,
  BRANDING_LABELS,
  BRANDING_PROMPT_SENTINELS,
  IDENTITY_ASKS,
} from '../brandingPrompt';
import { ASKS } from '../strategyPrompt';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

const CTX = {
  strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.', tone: 'direct' },
  colors: {
    core: [
      { hex: '#1B4D3E', name: 'Deep Green' },
      { hex: '#E8DCC8', name: 'Cream' },
    ],
    accent: [{ hex: '#C05621', name: 'Rust' }],
  },
  fonts: [
    { id: 'f1', family: 'Instrument Serif', role: 'Display', weights: 'Regular' },
    { id: 'f2', family: 'Inter', role: 'Text', weights: '400' },
  ],
};

describe('the rebrand prompt contract', () => {
  it('emits every label the parser recognises when everything is asked', () => {
    const prompt = buildBrandingPrompt('Northwind', { ask: ['colors', 'fonts', 'strategy'] });
    for (const label of BRANDING_LABELS) expect(prompt).toContain(`${label}:`);
  });

  // The refusal guard is only as honest as this: every sentinel must really
  // be in the built prompt, or the guard silently stops firing.
  it('every sentinel is genuinely in the prompt', () => {
    const prompt = buildBrandingPrompt('Northwind');
    for (const sentinel of BRANDING_PROMPT_SENTINELS) expect(prompt).toContain(sentinel);
  });

  it('every identity ask is genuinely in the prompt', () => {
    const prompt = buildBrandingPrompt('Northwind');
    expect(prompt).toContain(IDENTITY_ASKS.colors);
    expect(prompt).toContain(IDENTITY_ASKS.fonts);
  });

  // The hard exclusion this whole feature is scoped around.
  it('forbids logo suggestions', () => {
    expect(buildBrandingPrompt('Northwind')).toContain('Never suggest a logo');
  });

  // If an example hex ever creeps into the instruction, an echoed instruction
  // parses as a palette and the prompt-paste bug returns.
  it('the colors instruction contains no hex codes', () => {
    expect(IDENTITY_ASKS.colors).not.toMatch(/#?[0-9a-fA-F]{6}\b/);
  });

  it('bakes the user direction in when given', () => {
    const prompt = buildBrandingPrompt('Northwind', { direction: 'make it feel premium' });
    expect(prompt).toContain('The change I want:');
    expect(prompt).toContain('make it feel premium');
  });

  it('omits the direction block when none is given', () => {
    expect(buildBrandingPrompt('Northwind')).not.toContain('The change I want:');
  });

  // Asked sections show today's values as a STARTING POINT to evolve…
  it('shows current identity as the starting point for asked sections', () => {
    const prompt = buildBrandingPrompt('Northwind', { ...CTX });
    expect(prompt).toContain('starting point');
    expect(prompt).toContain('#1B4D3E');
    expect(prompt).toContain('Instrument Serif + Inter');
    expect(prompt).toContain('Mission: Make shipping boring.');
  });

  // …while excluded sections become settled context the AI must not touch.
  it('hands excluded sections over as settled, not as questions', () => {
    const prompt = buildBrandingPrompt('Northwind', { ...CTX, ask: ['colors'] });
    expect(prompt).toContain('SETTLED');
    expect(prompt).toContain('Fonts: Instrument Serif + Inter');
    expect(prompt).toContain('Mission: Make shipping boring.');
    // Not asked, so no instruction lines for them.
    expect(prompt).not.toContain(IDENTITY_ASKS.fonts);
    expect(prompt).not.toContain(ASKS.mission);
  });

  it('icons never appear in the prompt — they are computed, not asked', () => {
    const prompt = buildBrandingPrompt('Northwind', {
      ask: ['colors', 'fonts', 'strategy', 'icons'],
    });
    expect(prompt).not.toMatch(/icon/i);
  });

  it('falls back to a placeholder rather than an empty name', () => {
    expect(buildBrandingPrompt('  ')).toContain('[BRAND NAME]');
  });
});
