/**
 * Brand Kit catalog — types.
 *
 * The catalog answers three questions that used to be answered by five
 * separate hand-maintained lists (`KIT_SECTIONS`, `SECTION_CARDS`,
 * `DELIVERABLES`, the legacy `MAP`, and four per-label maps on the page):
 *
 *   • what does the Brand Kit contain
 *   • where does each thing appear, and under what name
 *   • may this user see it at all
 *
 * The single most important idea here is that **storage identity and
 * presentation are different things**.
 *
 * `key` is `${sectionKey}::${label}` and is the persistence key for kit
 * items (`brandos:brand-kit:state`), card customizations, and saved
 * featured-variant lists. It NEVER changes. `group` and `label` are what
 * the user sees, and they are free to change. That split is what lets
 * Email Signature move out of Web into Brand Applications, and About be
 * renamed Strategy, without orphaning a single saved edit.
 */
import type { KitSectionKey } from '../components/BrandKitSidebar';
import type { DeliverableKey } from '../kit/types';

/**
 * How much of the product a capability is part of.
 *
 * Nothing is ever deleted to simplify the Brand Kit — it is moved down
 * this ladder. Every renderer, registry entry, template family and export
 * path for a non-active capability stays exactly where it is and keeps
 * working; the capability is simply not listed.
 *
 *   • `active`       — part of the product. Everyone sees it.
 *   • `experimental` — built and working, deprioritised for now. Visible
 *                      to developers and admins so the work stays
 *                      reachable and reviewable.
 *   • `admin-only`   — deliberately internal. Admins only, never revealed
 *                      by a dev build alone.
 *   • `hidden`       — superseded or duplicated by a surface that shipped
 *                      elsewhere. Kept in the codebase, listed to nobody.
 *
 * When an internal feature-management area lands, it overrides this field
 * and nothing else in the Brand Kit has to move.
 */
export type CapabilityState = 'active' | 'experimental' | 'admin-only' | 'hidden';

/** A user-facing group in the Brand Kit. Purely presentational. */
export type KitGroup = 'assets' | 'applications' | 'social' | 'presentations';

/**
 * How an opened item paints.
 *
 * `variants` is the existing behaviour — the template/asset grid the
 * drilldown has always shown. The others are composed views that read the
 * brand directly and reuse the existing renderers as their material.
 */
export type KitView =
  | 'variants'
  | 'strategy'
  | 'social-system'
  | 'presentation-system'
  | 'brand-board';

export type KitEntry = {
  /**
   * STORAGE IDENTITY — `${sectionKey}::${storageLabel}`.
   *
   * Never change this for an entry that has already shipped. Saved kit
   * state, card customizations and featured-variant lists are all filed
   * under it, and a rename is not an error anyone sees — it is everyone's
   * saved work quietly disappearing.
   */
  key: DeliverableKey;
  /** First half of `key`. Also the registry / legacy-mapping section. */
  sectionKey: KitSectionKey;
  /** Second half of `key`. The name the data is filed under. */
  storageLabel: string;
  /** What the user reads. May differ from `storageLabel`. */
  label: string;
  /** Where the user finds it. Independent of `sectionKey`. */
  group: KitGroup;
  state: CapabilityState;
  /** Defaults to `variants`. */
  view?: KitView;
};

/** Group display order and names. */
export const KIT_GROUPS: ReadonlyArray<{ id: KitGroup; label: string }> = [
  { id: 'assets', label: 'Brand Assets' },
  { id: 'applications', label: 'Brand Applications' },
  { id: 'social', label: 'Social Media' },
  { id: 'presentations', label: 'Presentations' },
];
