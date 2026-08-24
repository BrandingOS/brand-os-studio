/**
 * The guideline document.
 *
 * A guideline is an ORDERED LIST OF PAGE INSTANCES plus a small set of
 * guideline-scoped brand overrides. It is deliberately tiny: the page bodies
 * are rendered from the brand at paint time, and the user's direct edits to a
 * page live as an HTML snapshot in IndexedDB keyed by the instance id. So this
 * object stays a few kilobytes however long the document gets.
 *
 * Why a stored list at all, when the previous version derived a fixed 27-slide
 * array from the brand: because you cannot add, remove or reorder pages in a
 * derived array. The list is the thing "Build Brand Guidelines" creates and
 * "Add page" changes.
 *
 * A future multi-template system is a different DEFAULT_SEQUENCE plus a
 * template id on the document. Nothing here needs to change for that.
 */
import type { Brand } from '@/shared/types/brand';
import { getPageType } from './pageLibrary';

export interface GuidelinePage {
  /**
   * Stable instance id, and the persistence key for this page's edits.
   * The first instance of a type takes the type id verbatim — that is what
   * makes edits made before the builder existed still load.
   */
  id: string;
  /** A `PAGE_TYPES` id. */
  type: string;
  /**
   * The user's label for this page — what the outline and the caption above
   * the slide say. NEVER rendered on the page itself; renaming a page must
   * not rewrite its content, which is what `title` is.
   */
  name?: string;
  /** Chapter/page title. Real page content for types with `titleIsContent`. */
  title?: string;
  subtitle?: string;
}

/**
 * Brand values this guideline uses INSTEAD of the brand's own.
 *
 * The whole point of this object: a user editing a colour while laying out
 * their guideline must not silently repaint every other surface in BrandOS.
 * Changes land here by default; pushing one to the brand is a separate,
 * confirmed action.
 */
export interface GuidelineOverrides {
  primaryColor?: string;
  secondaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export interface GuidelineDoc {
  version: 1;
  brandId: string;
  createdAt: string;
  updatedAt: string;
  overrides: GuidelineOverrides;
  pages: GuidelinePage[];
}

/**
 * The document "Build Brand Guidelines" produces.
 *
 * Ordered as a brand book reads: cover, then a numbered chapter per system,
 * then credits and a sign-off. Every page is filled from the brand — there is
 * no blank-page step and no template choice, because at MVP there is one
 * strong design per page type.
 *
 * The five ids that look arbitrary (`overview`, `logo-section`, …) are the
 * chapter-divider ids the previous deck used. Keeping them means a user who
 * had already retitled a chapter keeps that edit.
 */
const DEFAULT_SEQUENCE: GuidelinePage[] = [
  { id: 'cover', type: 'cover' },

  { id: 'overview', type: 'section', title: 'Brand Overview', subtitle: 'Mission & Vision' },
  { id: 'intro', type: 'intro', title: 'Introduction' },
  { id: 'values', type: 'values', title: 'Core Values' },
  { id: 'purpose', type: 'purpose' },
  { id: 'archetype', type: 'archetype' },
  { id: 'manifesto', type: 'manifesto' },

  { id: 'logo-section', type: 'section', title: 'Logo System', subtitle: 'Primary · Variations' },
  { id: 'logo-grid', type: 'logo-grid' },

  { id: 'color-section', type: 'section', title: 'Colour System', subtitle: 'Palette · Proportion' },
  { id: 'color-ratio', type: 'color-ratio' },
  { id: 'gradients', type: 'gradients' },
  { id: 'dark-mode', type: 'dark-mode' },

  { id: 'typo-section', type: 'section', title: 'Typography', subtitle: 'Typeface · Hierarchy' },
  { id: 'type-specimen', type: 'type-specimen' },

  { id: 'imagery-section', type: 'section', title: 'Imagery', subtitle: 'Photography · Pattern · Icons' },
  { id: 'photo-mood', type: 'photo-mood' },
  { id: 'patterns', type: 'patterns' },
  { id: 'icon-grid', type: 'icon-grid' },

  { id: 'motion-section', type: 'section', title: 'Motion', subtitle: 'Easing · Duration' },
  { id: 'motion', type: 'motion' },

  { id: 'voice-section', type: 'section', title: 'Voice & Tone', subtitle: 'Personality · Writing' },
  { id: 'voice-dna', type: 'voice-dna' },

  { id: 'applications-section', type: 'section', title: 'Applications', subtitle: 'The brand in the world' },
  { id: 'stationery', type: 'stationery' },
  { id: 'digital', type: 'digital' },
  { id: 'touchpoints', type: 'touchpoints' },
  { id: 'universe', type: 'universe' },

  { id: 'colophon', type: 'colophon' },
  { id: 'closing', type: 'closing' },
];

/** How many pages a build produces — shown before the user commits to it. */
export const DEFAULT_PAGE_COUNT = DEFAULT_SEQUENCE.length;

export function buildDefaultDocument(brand: Brand, now: string): GuidelineDoc {
  return {
    version: 1,
    brandId: brand.id,
    createdAt: now,
    updatedAt: now,
    overrides: {},
    // Deep-copied: DEFAULT_SEQUENCE is module state and a document is mutable.
    pages: DEFAULT_SEQUENCE.map((p) => ({ ...p })),
  };
}

/**
 * A fresh instance id for `type`.
 *
 * The first instance takes the bare type id, so the default document's ids
 * match the historical slide ids exactly. Later instances are suffixed. The
 * `taken` set is the whole document, not just same-type pages, so a suffix can
 * never collide with a hand-authored id.
 */
export function newPageId(type: string, taken: Set<string>): string {
  if (!taken.has(type)) return type;
  for (let n = 2; ; n += 1) {
    const candidate = `${type}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function createPage(type: string, taken: Set<string>): GuidelinePage {
  const def = getPageType(type);
  return {
    id: newPageId(type, taken),
    type,
    title: def?.defaultTitle,
    subtitle: def?.defaultSubtitle,
  };
}

/** Clamp an insertion index into [0, length]. */
export function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.min(Math.max(0, Math.round(index)), length);
}

/**
 * 1-based chapter number for each divider, by position.
 *
 * Derived rather than stored: a user who moves or deletes a chapter would
 * otherwise be left renumbering by hand, and a stored number that disagrees
 * with the order is worse than no number.
 */
export function sectionIndexes(pages: GuidelinePage[]): Record<string, number> {
  const out: Record<string, number> = {};
  let n = 0;
  for (const page of pages) {
    if (page.type === 'section') {
      n += 1;
      out[page.id] = n;
    }
  }
  return out;
}

/** The chapter a page belongs to — the nearest divider above it. */
export function chapterTitleFor(pages: GuidelinePage[], pageId: string): string | undefined {
  let current: string | undefined;
  for (const page of pages) {
    if (page.type === 'section') current = page.title;
    if (page.id === pageId) return page.type === 'section' ? page.title : current;
  }
  return undefined;
}

/** Display name in the outline — the user's label, else the title, else the type's name. */
export function pageDisplayName(page: GuidelinePage): string {
  return page.name?.trim() || page.title?.trim() || getPageType(page.type)?.name || 'Page';
}
