/**
 * Pitch Deck template — sanity tests.
 *
 * These tests guard the SHAPE of the template, not the visual output:
 *   - 15 slides exactly (Cover → CTA, with 3 program-detail slides
 *     and the team-grid slide — mirrors UNIEX_SLIDES entry count).
 *   - Every `layout` is a known v2 LayoutId.
 *   - No required title slot is empty.
 *
 * The visual smoke test (rendering each slide through `<DeckRenderer>`)
 * is covered separately in the integration tests for the deck page.
 */

import { describe, expect, it } from 'vitest';
import { PITCH_DECK_TEMPLATE } from '../pitch-deck';
import type { LayoutId } from '../../types';

const KNOWN_LAYOUTS: ReadonlySet<LayoutId> = new Set<LayoutId>([
  'cover',
  'section-divider',
  'title-body',
  'bullets',
  'two-column',
  'image-text',
  'quote',
  'stats-3',
  'stats-grid',
  'team-grid',
  'process',
  'comparison',
  'gallery',
  'metrics-hero',
  'cta',
]);

describe('PITCH_DECK_TEMPLATE', () => {
  it('has the expected metadata', () => {
    expect(PITCH_DECK_TEMPLATE.id).toBe('pitch-deck');
    expect(PITCH_DECK_TEMPLATE.category).toBe('pitch');
    expect(PITCH_DECK_TEMPLATE.name.length).toBeGreaterThan(0);
    expect(PITCH_DECK_TEMPLATE.description.length).toBeGreaterThan(0);
  });

  it('has 15 slides (mirrors UNIEX_SLIDES)', () => {
    // Note: the original task brief said "14 slides", but the source
    // UNIEX_SLIDES array has 15 entries (Cover → CTA, including the
    // team-grid slide). We mirror the source exactly so no content
    // is dropped.
    expect(PITCH_DECK_TEMPLATE.slides).toHaveLength(15);
  });

  it('uses only known layout ids', () => {
    for (const slide of PITCH_DECK_TEMPLATE.slides) {
      expect(KNOWN_LAYOUTS.has(slide.layout)).toBe(true);
    }
  });

  it('opens with a cover and closes with a cta', () => {
    const slides = PITCH_DECK_TEMPLATE.slides;
    expect(slides[0].layout).toBe('cover');
    expect(slides[slides.length - 1].layout).toBe('cta');
  });

  it('every slide has a non-empty title (or quote/cta equivalent)', () => {
    for (const [i, slide] of PITCH_DECK_TEMPLATE.slides.entries()) {
      const titleBlock = slide.blocks.title;
      const quoteBlock = slide.blocks.quote;

      // Quote layouts use a quote block instead of a title.
      if (slide.layout === 'quote') {
        expect(quoteBlock, `slide ${i} (quote) needs a quote block`).toBeDefined();
        if (quoteBlock && quoteBlock.kind === 'quote') {
          expect(quoteBlock.text.trim().length).toBeGreaterThan(0);
        }
        continue;
      }

      expect(titleBlock, `slide ${i} (${slide.layout}) needs a title block`).toBeDefined();
      if (titleBlock && titleBlock.kind === 'text') {
        expect(
          titleBlock.text.trim().length,
          `slide ${i} (${slide.layout}) title is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('every slide has a section label', () => {
    for (const [i, slide] of PITCH_DECK_TEMPLATE.slides.entries()) {
      expect(slide.section, `slide ${i} (${slide.layout}) is missing section`).toBeTruthy();
    }
  });

  it('text blocks have a valid role and non-empty text', () => {
    const validRoles = new Set([
      'display',
      'h1',
      'h2',
      'h3',
      'h4',
      'body',
      'caption',
      'label',
    ]);
    for (const [i, slide] of PITCH_DECK_TEMPLATE.slides.entries()) {
      for (const [slot, block] of Object.entries(slide.blocks)) {
        if (block.kind === 'text') {
          expect(
            validRoles.has(block.role),
            `slide ${i} slot ${slot} has unknown role ${block.role}`,
          ).toBe(true);
          expect(
            block.text.trim().length,
            `slide ${i} slot ${slot} has empty text`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has exactly three program-detail title-body slides', () => {
    const programSlides = PITCH_DECK_TEMPLATE.slides.filter(
      (s) => s.layout === 'title-body' && s.section === 'مسار',
    );
    expect(programSlides).toHaveLength(3);
  });

  it('team-grid slide carries 6 named members', () => {
    const team = PITCH_DECK_TEMPLATE.slides.find((s) => s.layout === 'team-grid');
    expect(team).toBeDefined();
    if (!team) return;
    for (let i = 1; i <= 6; i++) {
      const nameBlock = team.blocks[`member${i}Name`];
      expect(nameBlock, `team-grid is missing member${i}Name`).toBeDefined();
      if (nameBlock && nameBlock.kind === 'text') {
        expect(nameBlock.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('stats-3 slide has three populated stat blocks', () => {
    const stats = PITCH_DECK_TEMPLATE.slides.find((s) => s.layout === 'stats-3');
    expect(stats).toBeDefined();
    if (!stats) return;
    for (const slot of ['stat1', 'stat2', 'stat3'] as const) {
      const b = stats.blocks[slot];
      expect(b, `stats-3 is missing ${slot}`).toBeDefined();
      if (b && b.kind === 'stat') {
        expect(b.value.length).toBeGreaterThan(0);
        expect(b.label.length).toBeGreaterThan(0);
      }
    }
  });
});
