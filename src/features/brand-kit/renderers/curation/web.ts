import type { FamilyCuration } from './types';
import {
  FAVICON_ARCHIVED_IDS,
  FAVICON_NAMES,
  FAVICON_TAGS,
} from '../WebFaviconExtended';
import {
  WEBSITE_ARCHIVED_IDS,
  WEBSITE_NAMES,
  WEBSITE_TAGS,
} from '../WebWebsiteExtended';
import {
  LANDING_ARCHIVED_IDS,
  LANDING_NAMES,
  LANDING_TAGS,
} from '../WebLandingPageExtended';

/**
 * Owned by the web family — Favicon, Website and Landing Page.
 *
 * Ninety generated stills became thirty-six designs: twelve delivery
 * contexts for the favicon, twelve hero layouts for the website, twelve
 * conversion layouts for the landing page. The fifty-four culled ids
 * (`…-ext-13`…`-ext-30` in each of the three) stay reserved and stay
 * readable as persistence keys; they simply never appear again.
 *
 * The three families share one file because they share one card section
 * — and because Website and Landing share one content kind and one set
 * of primitives, so a tag vocabulary that differed between them would be
 * two answers to one question.
 *
 * The maps are READ FROM THE RENDERERS rather than retyped here: a
 * design's name is part of the design, and a second hand-kept copy of
 * thirty-six names and a hundred tags is a copy that drifts the first
 * time one is renamed. `curation/index.ts` still sees a plain
 * `FamilyCuration`, so nothing downstream knows or cares.
 */
export const curation: FamilyCuration = {
  names: { ...FAVICON_NAMES, ...WEBSITE_NAMES, ...LANDING_NAMES },
  tags: { ...FAVICON_TAGS, ...WEBSITE_TAGS, ...LANDING_TAGS },
  archived: [...FAVICON_ARCHIVED_IDS, ...WEBSITE_ARCHIVED_IDS, ...LANDING_ARCHIVED_IDS],
};
