import { describe, it, expect } from 'vitest';
import { SEED_BRANDS, getSeedBrandBySlug } from './index';
import { brandingosFixture, BRANDINGOS_FIXTURE_SLUG } from './brandingos.fixture';
import tokens from '@/shared/ds/tokens.json';

/**
 * The fixture exists so the Figma artefact shows BrandingOS rather than a
 * customer brand. These tests pin the two claims that make it safe.
 */
describe('the BrandingOS capture fixture cannot reach production', () => {
  it('is NOT in SEED_BRANDS', () => {
    // SEED_BRANDS is what the brands services merge into the authoritative list
    // and what SEED_BRAND_IDS is derived from. Absence here is the whole
    // safety mechanism — it makes every persistence path unreachable.
    expect(SEED_BRANDS.map((b) => b.slug)).toEqual(['raqm', 'skam', 'vector', 'uniex']);
    expect(SEED_BRANDS).not.toContain(brandingosFixture);
  });

  it('leaves the real seed brands untouched', () => {
    expect(SEED_BRANDS).toHaveLength(4);
    for (const slug of ['raqm', 'skam', 'vector', 'uniex']) {
      expect(getSeedBrandBySlug(slug)?.slug).toBe(slug);
    }
  });

  it('is frozen, so nothing can mutate it in place', () => {
    expect(Object.isFrozen(brandingosFixture)).toBe(true);
  });

  it('uses a reserved slug that is not a customer name', () => {
    expect(BRANDINGOS_FIXTURE_SLUG).toBe('brandingos');
    expect(SEED_BRANDS.some((b) => b.slug === BRANDINGOS_FIXTURE_SLUG)).toBe(false);
  });
});

describe('the fixture is BrandingOS, read from the shipping tokens', () => {
  it('takes its colours from tokens.json rather than duplicating them', () => {
    expect(brandingosFixture.primaryColor).toBe(tokens.modes.light['--ds-accent']);
    expect(brandingosFixture.secondaryColor).toBe(tokens.modes.light['--ds-success']);
  });

  it('takes its typeface from the --ds-font stack', () => {
    const family = tokens.global['--ds-font'].split(',')[0].replace(/['"]/g, '').trim();
    expect(brandingosFixture.fonts.primary).toBe(family);
  });

  it('is named BrandingOS and carries the product mission', () => {
    expect(brandingosFixture.name).toBe('BrandingOS');
    expect(brandingosFixture.guidelines?.strategy?.mission)
      .toBe('One setup. Infinite branded possibilities.');
  });

  it('draws the nine-dot mark, never a letter B', () => {
    const svg = decodeURIComponent(brandingosFixture.logo.split(',')[1]);
    // eight ring nodes plus one core
    expect(svg.match(/<circle/g)).toHaveLength(9);
    expect(svg).not.toMatch(/<text|>B</);
  });
});
