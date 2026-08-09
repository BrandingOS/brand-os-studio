/**
 * Product Surface Explorer — types (dev-only tool at /_dev/product-map).
 *
 * A "surface" is anything the owner would reasonably consider a separate
 * product screen/capability: a routed page, a major in-page tab, a modal,
 * an editor mode, a flow step. NOT buttons/cards.
 */

export type SurfaceType =
  | 'PAGE'
  | 'TAB'
  | 'MODAL'
  | 'EDITOR'
  | 'FLOW STEP'
  | 'PUBLIC PAGE'
  | 'ADMIN'
  | 'DEV TOOL'
  | 'REDIRECT';

export type SurfaceStatus =
  | 'CURRENT'
  | 'LEGACY'
  | 'REDIRECT'
  | 'DEV'
  | 'EXPERIMENTAL'
  | 'DEFERRED'
  | 'UNKNOWN';

export type Reachability =
  | 'NAVIGATION'        // linked from live nav (sidebar/rail/menu)
  | 'INTERNAL LINK'     // reached from inside another surface (tab, button, dialog)
  | 'DIRECT URL ONLY'   // routed but nothing links to it
  | 'REDIRECT ONLY'     // exists purely to forward elsewhere
  | 'UNREACHABLE / ORPHAN';

export type SurfaceNamespace =
  | 'Studio'    // /b/:slug — canonical brand UI
  | 'Classic'   // /a/:slug — alternate brand UI (preference toggle)
  | 'Workspace' // /dashboard, /settings, /learn
  | 'Shared'    // used by both namespaces / global
  | 'Public'    // logged-out / share surfaces
  | 'Admin'
  | 'Dev';

export type SurfaceArea =
  | 'AUTH'
  | 'DASHBOARD'
  | 'ONBOARDING'
  | 'BRAND (STUDIO)'
  | 'BRAND (CLASSIC)'
  | 'BRAND KIT'
  | 'SETUP & IDENTITY'
  | 'GUIDELINES'
  | 'DESIGN & EDITORS'
  | 'PRESENTATIONS & DECKS'
  | 'ASSETS'
  | 'TOOLS'
  | 'TEMPLATES'
  | 'LOGO MAKER'
  | 'PUBLIC & SHARE'
  | 'SETTINGS'
  | 'ADMIN'
  | 'DEV / EXPERIMENTS';

export interface SurfaceEntry {
  /** Stable id — review decisions are keyed on this. Never reuse. */
  id: string;
  name: string;
  /** Routed path, or null for non-route surfaces (tabs/modals/panels). */
  route: string | null;
  /** For non-route surfaces: how to get there ("Brand Kit → right-click a card"). */
  entryHint?: string;
  type: SurfaceType;
  status: SurfaceStatus;
  reachability: Reachability;
  namespace: SurfaceNamespace;
  /** Source file (repo-relative) of the page/component. */
  source: string;
  description: string;
  area: SurfaceArea;
  /** Surfaces sharing a group are POSSIBLE duplicates of each other. */
  duplicateGroup?: string;
}

/** Review decisions the owner records. Persisted locally only. */
export type ReviewDecision = 'keep' | 'remove' | 'review' | 'merge' | 'undecided';

/** A route definition discovered by parsing the real router source. */
export interface DiscoveredRoute {
  /** Full composed path (parent + child for nested routes). */
  path: string;
  /** Element/component name if extractable (e.g. "BrandKitV2Page"). */
  element: string | null;
  /** Heuristic: element name contains Redirect/Navigate/Fallback. */
  looksLikeRedirect: boolean;
  /** Which source file defined it. */
  file: string;
}
