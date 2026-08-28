import { describe, expect, it } from 'vitest';
import { pairingsToOffer, suggestFontsFor } from '../data/suggestedFonts';

describe('font pairings are offered, never imposed', () => {
  it('"digital", "app", "AI", "platform" and "data" no longer make every brand a tech brand', () => {
    const bakery = 'A neighbourhood bakery with a digital presence, an app for orders and an AI-driven loyalty platform. Data-led.';
    expect(suggestFontsFor(bakery)[0].id).not.toBe('tech');
  });
  it('a software brand still ranks tech first', () => {
    expect(suggestFontsFor('developer tooling — a SaaS for software teams')[0].id).toBe('tech');
  });
  it("the brief's own font directions come first", () => {
    const brief = [
      'Brand summary: Kaafex roasts coffee.',
      'Industry: Food & Beverage',
      'Tone: Warm',
      'Fonts: Directions:',
      'Fraunces + Work Sans',
      'Lora + Nunito',
    ].join('\n');
    const out = pairingsToOffer(brief, brief);
    expect(out[0]).toMatchObject({ heading: 'Fraunces', body: 'Work Sans', name: 'From your brand profile' });
    expect(out[1]).toMatchObject({ heading: 'Lora', body: 'Nunito' });
    expect(out.length).toBeGreaterThan(2);
  });
});
