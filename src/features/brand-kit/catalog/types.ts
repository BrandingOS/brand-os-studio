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
 *   • `archived`     — culled during curation. Never visible to ANYONE,
 *                      including admins and dev builds — see below.
 *
 * When an internal feature-management area lands, it overrides this field
 * and nothing else in the Brand Kit has to move.
 */
export type CapabilityState =
  | 'active'
  | 'experimental'
  | 'admin-only'
  | 'hidden'
  | 'archived';

/**
 * Why `archived` exists beside `hidden`, when both are invisible.
 *
 * They mean different things to the person reading this file, and the
 * difference is what stops the second one being deleted by mistake:
 *
 *   • `hidden` — a whole capability that another surface now owns. The
 *     Brand Guides cards are hidden because `/b/:slug/guideline` is the
 *     guideline. They may come back if that changes.
 *   • `archived` — a design or a family CULLED during curation (spec §3:
 *     "keep a design only if it is distinct, readable at tile size,
 *     contrast-clean, and fully bound"). It is not coming back.
 *
 * **An archived entry keeps its `key`, and that is the entire point.**
 * `${sectionKey}::${storageLabel}` is a persistence key: kit items in
 * `brandos:brand-kit:state`, card customizations, saved featured-variant
 * lists are all filed under it. Deleting the entry would free the key for
 * something else to claim later and quietly inherit a stranger's saved
 * work. Archiving retires the key while keeping it reserved.
 *
 * It is invisible to admins and to dev builds too, unlike `experimental`.
 * A culled design that a developer can still demo is a culled design that
 * comes back in a screenshot.
 */

/** A user-facing group in the Brand Kit. Purely presentational. */
export type KitGroup =
  | 'assets'
  | 'applications'
  | 'social'
  | 'presentations'
  | 'mockups';

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
  // Mockups sit directly after applications: they are the same brand on
  // the same things, photographed rather than printed, and a user looking
  // for "our logo on a tote" is looking near "our logo on a card".
  { id: 'mockups', label: 'Mockups' },
  { id: 'social', label: 'Social Media' },
  { id: 'presentations', label: 'Presentations' },
];
