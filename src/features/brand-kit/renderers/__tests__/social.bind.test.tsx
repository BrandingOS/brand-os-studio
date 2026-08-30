/**
 * Social — four cards, one system, and every field alive in all of them.
 *
 * The family shipped 176 variants and could edit none of them. That is
 * not an exaggeration: Post, Story and Cover reached the artwork through
 * renderers that declared no `content` prop at all, and the Quick Edit
 * panel is keyed by template TYPE — so a customer typing a headline into
 * the Post panel watched nothing happen, on every one of the sixteen
 * tiles the card offered. Profile was the same, one field further down.
 *
 * `assertFullyBound` is deliberately all-or-nothing here. A social post
 * is seven fields that only make sense together — a headline with no
 * handle is not a post — and a design that keeps six of the seven is a
 * design that silently drops the customer's call to action.
 *
 * The other half of this file is CURATION, because the two failures are
 * the same failure seen from either end: 176 variants of which 130 were
 * generated is not a choice a customer can make. What is left is 16 · 16
 * · 12 · 24, each named by a designer and reachable by a filter chip.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import { SOCIAL_POST_EXTENDED } from '../SocialPostExtended';
import { SOCIAL_STORY_EXTENDED } from '../SocialStoryExtended';
import { SOCIAL_COVER_EXTENDED } from '../SocialCoverExtended';
import { PROFILE_KEPT_IDS, SOCIAL_PROFILE_EXTENDED } from '../SocialProfileExtended';
import {
  SOCIAL_PROFILE_EXTENDED_2,
  SOCIAL_PROFILE_WAVE_2_IDS,
} from '../SocialProfileExtended2';
import { SOCIAL_SYSTEM_EXAMPLES } from '../../systems/SocialSystemView';

afterEach(cleanup);

const SECTION = 'social';

/** The seven fields the `socialPost` panel offers. */
const POST_PATHS = fieldPathsForFamily('instagram-posts');
/** The four fields the `profile` panel offers. */
const PROFILE_PATHS = fieldPathsForFamily('profile-icons');

/** Label → how many designs the card offers, and its template prefix. */
const CARDS = [
  { label: 'Post', prefix: 'instagram-posts', count: 16, paths: POST_PATHS },
  { label: 'Story', prefix: 'instagram-stories', count: 16, paths: POST_PATHS },
  { label: 'Cover', prefix: 'facebook-covers', count: 12, paths: POST_PATHS },
  { label: 'Profile', prefix: 'profile-icons', count: 24, paths: PROFILE_PATHS },
] as const;

describe('social — the panel’s fields', () => {
  it('knows the seven fields a post is made of', () => {
    expect(POST_PATHS).toEqual([
      'headline',
      'subline',
      'body',
      'cta',
      'handle',
      'date',
      'tag',
    ]);
  });

  it('knows the four a profile icon is made of', () => {
    expect(PROFILE_PATHS).toEqual(['glyph', 'text', 'tabTitle', 'url']);
  });
});

describe('social — curation', () => {
  for (const card of CARDS) {
    describe(card.label, () => {
      it(`shows ${card.count} designs, all of them ${card.prefix} extensions`, () => {
        const shown = variantsForCard(SECTION, card.label, mockBrand);
        expect(shown).toHaveLength(card.count);
        for (const t of shown) expect(t.id.startsWith(`${card.prefix}-ext-`)).toBe(true);
      });

      it('archives the legacy ids rather than renumbering', () => {
        // The legacy designs advertised a fintech company nobody here
        // owns. They are gone from every surface; their ids stay valid,
        // so a saved customization filed under one still resolves.
        const legacyCount = { Post: 10, Story: 8, Cover: 8, Profile: 12 }[card.label];
        for (let i = 1; i <= legacyCount; i += 1) {
          expect(isArchived(`${card.prefix}-${i}`), `${card.prefix}-${i}`).toBe(true);
        }
      });

      it('gives every kept design a designer’s name and its filter chips', () => {
        for (const t of variantsForCard(SECTION, card.label, mockBrand)) {
          expect(curatedName(t.id), t.id).toBeTruthy();
          // Curation is what the drilldown renders, so the two must agree.
          expect(t.name).toBe(curatedName(t.id));
          expect(isGeneratedName(t.name), t.id).toBe(false);
          expect(tagsFor(t.id).length, t.id).toBeGreaterThanOrEqual(2);
        }
      });

      it('names no two designs the same', () => {
        const names = variantsForCard(SECTION, card.label, mockBrand).map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
      });

      it('features three of them, all of them real', () => {
        const featured = DEFAULT_FEATURED_IDS_BY_LABEL[card.label] ?? [];
        expect(featured).toHaveLength(3);
        const kept = new Set(variantsForCard(SECTION, card.label, mockBrand).map((t) => t.id));
        for (const id of featured) expect(kept.has(id), id).toBe(true);
      });
    });
  }

  it('declares exactly the designs each family renders', () => {
    expect(SOCIAL_POST_EXTENDED).toHaveLength(16);
    expect(SOCIAL_STORY_EXTENDED).toHaveLength(16);
    expect(SOCIAL_COVER_EXTENDED).toHaveLength(12);
    // Profile is split at 18 by the shared dispatch, not by design.
    expect(SOCIAL_PROFILE_EXTENDED).toHaveLength(18);
    expect(SOCIAL_PROFILE_EXTENDED_2).toHaveLength(6);
    expect(PROFILE_KEPT_IDS).toHaveLength(24);
  });

  it('archives the 94 generated profile ids and no kept one', () => {
    expect(SOCIAL_PROFILE_WAVE_2_IDS).toHaveLength(94);
    for (const id of SOCIAL_PROFILE_WAVE_2_IDS) expect(isArchived(id), id).toBe(true);
    for (const id of PROFILE_KEPT_IDS) expect(isArchived(id), id).toBe(false);
  });

  it('keeps the id ranges contiguous, so no `-ext-N` arithmetic moved', () => {
    // `profile-icons-ext-19` is `SPECS[18]`. If the ranges ever stopped
    // meeting, the dispatch's `idx >= 18` split would land on the wrong
    // design and every customer's saved pick would silently change.
    expect(SOCIAL_PROFILE_EXTENDED.at(-1)!.idSuffix).toBe('ext-18');
    expect(SOCIAL_PROFILE_EXTENDED_2[0]!.idSuffix).toBe('ext-19');
    expect(SOCIAL_PROFILE_EXTENDED_2.at(-1)!.idSuffix).toBe('ext-24');
    expect(SOCIAL_PROFILE_WAVE_2_IDS[0]).toBe('profile-icons-ext-25');
  });
});

describe('social — binding', () => {
  for (const card of CARDS) {
    it(`binds every field in every ${card.label} design`, () => {
      assertFullyBound({ sectionKey: SECTION, storageLabel: card.label }, card.paths);
    });

    it(`leaves no ${card.label} design unbound`, () => {
      const results = renderAllVariants(SECTION, card.label);
      expect(results).toHaveLength(card.count);
      expect(boundVariantCount(results)).toBe(card.count);
    });

    it(`declares nothing a ${card.label} customer cannot edit`, () => {
      // The inverse guard: a path that is not a panel field is a region
      // the customer can click and then find no control for.
      const known = new Set<string>(card.paths);
      for (const result of renderAllVariants(SECTION, card.label)) {
        for (const path of result.paths) {
          expect(known.has(path), `${result.template.id} declares ${path}`).toBe(true);
        }
      }
    });
  }
});

describe('social — the system view’s worked examples', () => {
  /**
   * `SocialSystemView` names five template ids directly rather than
   * asking `variantsForCard`, because it is showing ONE worked example
   * per format, not a shelf. That is the right call and it is also the
   * one place curation cannot protect it: archiving a design the system
   * view points at would leave the page rendering `designs[0]` — a
   * silent substitution, on the surface whose whole claim is "this is
   * how your brand behaves".
   */
  it('points at five designs that are still kept', () => {
    expect(SOCIAL_SYSTEM_EXAMPLES).toHaveLength(5);
    for (const item of SOCIAL_SYSTEM_EXAMPLES) {
      expect(isArchived(item.templateId), item.templateId).toBe(false);
      expect(curatedName(item.templateId), item.templateId).toBeTruthy();
    }
  });

  it('shows every format the section covers', () => {
    expect(new Set(SOCIAL_SYSTEM_EXAMPLES.map((i) => i.type))).toEqual(
      new Set(['profile-icons', 'facebook-covers', 'instagram-posts', 'instagram-stories']),
    );
  });
});
