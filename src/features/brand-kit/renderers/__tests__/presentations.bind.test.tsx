/**
 * Presentations — four decks of ten slides, not four grids of thirty.
 *
 * `PresentationsExtended.tsx` advertised thirty variants per deck and
 * shipped ten: it wrote `[...slides, ...slides, ...slides]`, so tiles
 * 11–20 and 21–30 were pixel-identical to 1–10 and a customer choosing
 * between "Pitch 4", "Pitch 14" and "Pitch 24" was choosing between three
 * copies of the same slide. The copy inside them belonged to a start-up
 * that does not exist — a `$1.4M seed round`, a market of `014M / 2.1M /
 * 340K`, three initialled founders — and none of it was editable, because
 * none of it was data.
 *
 * This file measures both halves of the fix.
 *
 * ## What "fully bound" means for a deck, and why it is per KIND
 *
 * A slide shows only what its kind needs — the rule `content/fields.ts`
 * states for the panel, held to in the artwork. A title slide is the
 * cover fields; a divider is a number and a heading; a page is a heading
 * and either prose or points. So `assertFullyBound` with one flat path
 * list is the wrong assertion here: it would demand a quote on the cover
 * and a stat on the divider, and the only way to pass it would be to
 * print every field on every slide — which is a form, not a deck.
 *
 * What is asserted instead is per-position, against the kind that
 * position really holds: every slide declares its own heading; a slide
 * with prose declares the prose; a slide with points declares EVERY
 * point, not the first; and the deck's own four fields are declared by
 * every slide in the deck, because the running header and footer carry
 * them. That last one is what makes the date editable from slide six
 * instead of only from the cover.
 *
 * ## Two panel controls that deliberately reach nothing
 *
 * Slide 1's own `heading` / `body` are not painted: the cover paints the
 * DECK's `title` and `subtitle`, which default to the same two strings,
 * and printing both would put the brand's name on the cover twice. The
 * closing slide's `quote` is unpainted for the same reason — its default
 * text is the tagline the footer already carries. Both are pinned below
 * rather than left to be discovered: they are the cost of the cover
 * looking right, and if that trade is ever revisited these tests are
 * where the decision is written down.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { hydrateContent, type DeckContent, type DeckSlide } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import { deckSlideIds, deckSlideName } from '../curation/presentations';
import { fieldPathsForFamily, renderAllVariants } from '../__guards__/bindSweep';
import { DECK_SLIDES_KEPT, PITCH_DECK_EXTENDED } from '../PresentationsExtended';

afterEach(cleanup);

const SECTION = 'presentations';

/** The four deck CARDS, and the id family each one draws from. */
const DECKS = [
  { label: 'Pitch Deck', family: 'pres-pitch' },
  { label: 'Business Plan', family: 'pres-plan' },
  { label: 'Proposal', family: 'pres-proposal' },
  { label: 'Case Studies', family: 'pres-case' },
] as const;

/** Portfolio has ids and names but no catalog card; its ids stay reserved. */
const ALL_FAMILIES = [...DECKS.map((d) => d.family), 'pres-portfolio'] as const;

/** The four deck-level fields every slide's chrome carries. */
const DECK_FIELDS = ['title', 'subtitle', 'presenter', 'date'] as const;

/** The slides the kind's own defaults produce, in order. */
function defaultSlides(): DeckSlide[] {
  return (hydrateContent('deck', mockBrand, undefined) as { kind: 'deck' } & DeckContent).slides;
}

describe('presentations — curation', () => {
  it('shows ten slides per deck, not thirty', () => {
    for (const { label, family } of DECKS) {
      const shown = variantsForCard(SECTION, label, mockBrand);
      expect(shown.map((t) => t.id), label).toEqual(deckSlideIds(family));
      expect(shown, label).toHaveLength(DECK_SLIDES_KEPT);
    }
  });

  it('archives the two tripled copies of every slide, reserving every id', () => {
    // The list of ids stays thirty long on purpose: `pres-plan-ext-24` may
    // be sitting in somebody's saved kit, and renumbering would hand their
    // customization to a different slide.
    expect(PITCH_DECK_EXTENDED).toHaveLength(30);
    for (const family of ALL_FAMILIES) {
      for (let n = 1; n <= DECK_SLIDES_KEPT; n += 1) {
        expect(isArchived(`${family}-ext-${n}`), `${family}-ext-${n}`).toBe(false);
      }
      for (let n = DECK_SLIDES_KEPT + 1; n <= 30; n += 1) {
        expect(isArchived(`${family}-ext-${n}`), `${family}-ext-${n}`).toBe(true);
      }
    }
  });

  it('gives every kept slide a designer’s name and its filter chips', () => {
    for (const { label } of DECKS) {
      for (const template of variantsForCard(SECTION, label, mockBrand)) {
        expect(curatedName(template.id), template.id).toBeTruthy();
        expect(template.name, template.id).toBe(curatedName(template.id));
        expect(isGeneratedName(template.name), template.id).toBe(false);
        expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('names the slots of one deck without repeating itself', () => {
    for (const family of ALL_FAMILIES) {
      const names = deckSlideIds(family).map((id) => curatedName(id));
      expect(new Set(names).size, family).toBe(names.length);
    }
  });

  it('names a proposal’s third page as a proposal, not as a pitch', () => {
    // The four families deliberately do NOT share a name list: a
    // proposal's third page and a case study's third page occupy the same
    // slot and are not the same page.
    expect(deckSlideName('pres-proposal', 3)).not.toBe(deckSlideName('pres-pitch', 3));
    expect(deckSlideName('pres-case', 6)).not.toBe(deckSlideName('pres-plan', 6));
  });

  it('features three pages of each deck — cover, divider, page', () => {
    for (const { label, family } of DECKS) {
      const featured = DEFAULT_FEATURED_IDS_BY_LABEL[label] ?? [];
      expect(featured, label).toEqual([
        `${family}-ext-1`,
        `${family}-ext-5`,
        `${family}-ext-6`,
      ]);
      const shown = variantsForCard(SECTION, label, mockBrand).map((t) => t.id);
      for (const id of featured) expect(shown, label).toContain(id);
    }
  });
});

describe('presentations — binding', () => {
  it('knows the field paths the deck panel offers', () => {
    expect(fieldPathsForFamily('pres-pitch')).toEqual([
      ...DECK_FIELDS,
      'slides.0.kind',
      'slides.0.heading',
      'slides.0.body',
      'slides.0.bullets',
      'slides.0.stat.value',
      'slides.0.stat.label',
      'slides.0.quote.text',
      'slides.0.quote.by',
    ]);
  });

  it('carries the deck’s own four fields on every slide of every deck', () => {
    // The running header and footer are why the date is editable from
    // slide six rather than only from the cover.
    for (const { label } of DECKS) {
      for (const result of renderAllVariants(SECTION, label)) {
        for (const field of DECK_FIELDS) {
          expect(result.paths, `${result.template.id} · ${field}`).toContain(field);
        }
      }
    }
  });

  it('leaves no slide unbound', () => {
    for (const { label } of DECKS) {
      const results = renderAllVariants(SECTION, label);
      expect(results, label).toHaveLength(DECK_SLIDES_KEPT);
      for (const r of results) expect(r.paths.length, r.template.id).toBeGreaterThan(0);
    }
  });

  it('binds each slide to its OWN position in the deck', () => {
    // `pres-case-ext-7` is slide seven. If it declared `slides.2.*` the
    // customer would edit slide three and watch slide seven change.
    for (const { label } of DECKS) {
      renderAllVariants(SECTION, label).forEach((result, i) => {
        const foreign = result.paths.filter(
          (p) => p.startsWith('slides.') && !p.startsWith(`slides.${i}.`),
        );
        expect(foreign, result.template.id).toEqual([]);
      });
    }
  });

  it('declares every field its kind actually shows', () => {
    const slides = defaultSlides();
    for (const { label } of DECKS) {
      renderAllVariants(SECTION, label).forEach((result, i) => {
        const slide = slides[i]!;
        const own = (leaf: string) => `slides.${i}.${leaf}`;
        if (slide.kind !== 'title') {
          expect(result.paths, `${result.template.id} heading`).toContain(own('heading'));
        }
        if (slide.kind !== 'title' && slide.body.length > 0) {
          expect(result.paths, `${result.template.id} body`).toContain(own('body'));
        }
        // Every point, not the first. A design that shows four bullets and
        // declares one is a design where bullet four cannot be edited.
        slide.bullets.forEach((_, b) => {
          expect(result.paths, `${result.template.id} bullet ${b}`).toContain(own(`bullets.${b}`));
        });
      });
    }
  });

  it('invents nothing the slide has not got', () => {
    // A stat block on a slide with no stat is a number the deck made up.
    const slides = defaultSlides();
    for (const { label } of DECKS) {
      renderAllVariants(SECTION, label).forEach((result, i) => {
        const slide = slides[i]!;
        for (const leaf of ['stat.value', 'stat.label', 'quote.text', 'quote.by']) {
          if (slide.kind === 'stat' || slide.kind === 'quote') continue;
          expect(result.paths, `${result.template.id} ${leaf}`).not.toContain(
            `slides.${i}.${leaf}`,
          );
        }
        if (slide.body.length === 0) {
          expect(result.paths, `${result.template.id} empty body`).not.toContain(
            `slides.${i}.body`,
          );
        }
      });
    }
  });

  it('declares nothing outside the panel’s own vocabulary', () => {
    const known = new Set<string>([
      ...DECK_FIELDS,
      'heading',
      'body',
      'stat.value',
      'stat.label',
      'quote.text',
      'quote.by',
    ]);
    for (const { label } of DECKS) {
      for (const result of renderAllVariants(SECTION, label)) {
        for (const path of result.paths) {
          const leaf = path.startsWith('slides.')
            ? path.replace(/^slides\.\d+\./, '').replace(/^bullets\.\d+$/, 'bullets')
            : path;
          expect(
            known.has(leaf) || leaf === 'bullets',
            `${result.template.id} declares ${path}`,
          ).toBe(true);
        }
      }
    }
  });

  it('paints the cover from the deck, and leaves slide one’s own two fields dark', () => {
    // Pinned, not overlooked. The cover's headline is the DECK's title and
    // its sub-line the deck's subtitle; slide 1's `heading` and `body`
    // default to the same two strings, so painting both would put the
    // brand's name on the cover twice. Same for the closing slide's quote,
    // whose default is the tagline the footer already carries.
    for (const { label } of DECKS) {
      const results = renderAllVariants(SECTION, label);
      expect(results[0]!.paths).toEqual([...DECK_FIELDS].sort());
      expect(results[DECK_SLIDES_KEPT - 1]!.paths).not.toContain(
        `slides.${DECK_SLIDES_KEPT - 1}.quote.text`,
      );
    }
  });
});
