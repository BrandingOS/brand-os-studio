import { describe, it, expect } from 'vitest';
import { composePrompt } from './promptComposer';
import { resolveBrandTokens } from './brandTokens';
import { getOutputSpec } from '../registry/outputSpecs';
import type { Brand } from '@/shared/types/brand';

const brand: Brand = {
  id: 'b1', slug: 'acme', name: 'Acme', primaryColor: '#0055FF',
  fonts: { primary: 'Inter' }, tone: 'warm, premium',
  audience: 'design-led founders', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
};

describe('composePrompt', () => {
  it('embeds the brand contract in the system prompt', () => {
    const tokens = resolveBrandTokens(brand);
    const { system } = composePrompt({ spec: getOutputSpec('social_post_square'), tokens });
    expect(system).toContain('Acme');
    expect(system).toContain('warm, premium');
    expect(system).toContain('design-led founders');
    expect(system).toContain('NON-NEGOTIABLE');
    expect(system).toContain('JSON');
  });

  it('uses different schemas per output type', () => {
    const tokens = resolveBrandTokens(brand);
    const carousel = composePrompt({ spec: getOutputSpec('social_carousel_3'), tokens });
    const card = composePrompt({ spec: getOutputSpec('mockup_business_card'), tokens });
    expect(carousel.schemaHint).toContain('slides');
    expect(card.schemaHint).toContain('meta');
    expect(carousel.schemaHint).not.toBe(card.schemaHint);
  });

  it('forbids referencing colors and fonts in copy', () => {
    const tokens = resolveBrandTokens(brand);
    const { system } = composePrompt({ spec: getOutputSpec('website_hero'), tokens });
    expect(system.toLowerCase()).toContain('never reference colors');
  });

  it('includes the campaign brief when given', () => {
    const tokens = resolveBrandTokens(brand);
    const { user } = composePrompt({ spec: getOutputSpec('website_hero'), tokens, campaignBrief: 'Spring launch focused on speed' });
    expect(user).toContain('Spring launch focused on speed');
  });
});
