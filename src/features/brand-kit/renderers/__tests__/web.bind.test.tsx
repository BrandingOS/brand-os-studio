/**
 * The web three — Favicon, Website, Landing Page.
 *
 * Ninety generated stills, and not one editable string among them: every
 * favicon tab read `https://brand.com`, every website hero said "make it
 * last." in a typeface nobody chose, and every landing page carried the
 * same four navigation links above a proof band claiming "trusted by 1k+
 * brands." A customer who picked one of those designs could change the
 * colour and nothing else.
 *
 * Two things are measured here, and the second is the one a screenshot
 * cannot see.
 *
 *   1. Curation — twelve designs per card, each with a designer's name
 *      and its own tags, and every culled id still RESERVED so a saved
 *      customization filed under it still resolves.
 *   2. Binding — every kept design declares every field its panel offers.
 *      All-or-nothing, because a hero that binds the headline and not the
 *      subhead is a design where half the customer's edits vanish.
 *
 * The stats row is measured TWICE, from both sides. It is empty in the
 * kind's defaults on purpose — a hero statistic nobody supplied is a
 * claim nobody made — so the first sweep proves no layout invents one,
 * and the second, with a stat supplied, proves every layout has somewhere
 * to put it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import { assertFullyBound, renderAllVariants } from '../__guards__/bindSweep';
import { FAVICON_ARCHIVED_IDS, FAVICON_NAMES, WEB_FAVICON_EXTENDED } from '../WebFaviconExtended';
import { WEBSITE_ARCHIVED_IDS, WEBSITE_NAMES, WEB_WEBSITE_EXTENDED } from '../WebWebsiteExtended';
import { LANDING_ARCHIVED_IDS, LANDING_NAMES, WEB_LANDING_EXTENDED } from '../WebLandingPageExtended';

afterEach(cleanup);

const SECTION = 'web';

/**
 * The `profile` panel's four fields.
 *
 * `glyph` is a choice rather than a string, and it is declared on the
 * mark's own frame — selecting the mark on the artifact has to reach the
 * control that changes what the mark IS.
 */
const PROFILE_PATHS = ['glyph', 'text', 'tabTitle', 'url'];

/**
 * The `webHero` panel's fields, list items at index 0.
 *
 * `nav` is a string list, so the panel addresses the list and the artwork
 * addresses its members — `nav.0` is the path a design can actually
 * declare, and the one a click on the first link has to resolve to.
 */
const HERO_PATHS = [
  'nav.0',
  'url',
  'eyebrow',
  'headline',
  'subhead',
  'primaryCta',
  'secondaryCta',
];
const STAT_PATHS = ['stats.0.value', 'stats.0.label'];

/** The kind's defaults plus one stat, which the defaults deliberately lack. */
function heroWithAStat(): DeliverableContent {
  const base = hydrateContent('webHero', mockBrand, undefined);
  return { ...base, stats: [{ id: 'st-1', value: '12', label: 'Years' }] } as DeliverableContent;
}

const FAMILIES = [
  {
    label: 'Favicon',
    prefix: 'favicon',
    all: WEB_FAVICON_EXTENDED,
    names: FAVICON_NAMES,
    archivedIds: FAVICON_ARCHIVED_IDS,
    paths: PROFILE_PATHS,
  },
  {
    label: 'Website',
    prefix: 'website',
    all: WEB_WEBSITE_EXTENDED,
    names: WEBSITE_NAMES,
    archivedIds: WEBSITE_ARCHIVED_IDS,
    paths: HERO_PATHS,
  },
  {
    label: 'Landing Page',
    prefix: 'landing',
    all: WEB_LANDING_EXTENDED,
    names: LANDING_NAMES,
    archivedIds: LANDING_ARCHIVED_IDS,
    paths: HERO_PATHS,
  },
] as const;

describe.each(FAMILIES)('$label — curation', (family) => {
  const keptIds = Object.keys(family.names);

  it('shows twelve designs, not thirty', () => {
    const shown = variantsForCard(SECTION, family.label, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(keptIds);
    expect(shown).toHaveLength(12);
  });

  it('reserves every culled id rather than renumbering', () => {
    const allIds = family.all.map((t) => `${family.prefix}-${t.idSuffix}`);
    expect(allIds).toHaveLength(30);
    expect(allIds.slice(0, 12)).toEqual(keptIds);
    expect(allIds.slice(12)).toEqual(family.archivedIds);
    for (const id of family.archivedIds) expect(isArchived(id)).toBe(true);
    for (const id of keptIds) expect(isArchived(id)).toBe(false);
  });

  it('gives every kept design a designer’s name and its own tags', () => {
    for (const id of keptIds) {
      const name = curatedName(id);
      expect(name, id).toBeTruthy();
      expect(isGeneratedName(name!), `${id} → ${name}`).toBe(false);
      expect(tagsFor(id).length, id).toBeGreaterThanOrEqual(2);
    }
    // Distinct names, or the picker offers the same choice twice.
    expect(new Set(Object.values(family.names)).size).toBe(keptIds.length);
  });

  it('features three designs that all still resolve', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[family.label];
    expect(featured).toHaveLength(3);
    for (const id of featured) {
      expect(keptIds, `${id} is featured`).toContain(id);
    }
  });
});

describe.each(FAMILIES)('$label — binding', (family) => {
  it('every kept design declares every field its panel offers', () => {
    assertFullyBound({ sectionKey: SECTION, storageLabel: family.label }, family.paths);
  });
});

describe('the stats row', () => {
  /** Website and Landing only — the favicon has no such claim to make. */
  const heroFamilies = FAMILIES.filter((f) => f.paths === HERO_PATHS);

  it.each(heroFamilies)('$label prints no stat nobody supplied', (family) => {
    const results = renderAllVariants(SECTION, family.label, undefined, { mock: mockBrand });
    expect(results).toHaveLength(12);
    for (const r of results) {
      const invented = r.paths.filter((p) => p.startsWith('stats.'));
      expect(invented, `${r.template.id} invented ${invented.join(', ')}`).toEqual([]);
    }
  });

  it.each(heroFamilies)('$label finds room for one when there is one', (family) => {
    assertFullyBound(
      { sectionKey: SECTION, storageLabel: family.label, content: heroWithAStat() },
      [...family.paths, ...STAT_PATHS],
    );
  });
});
