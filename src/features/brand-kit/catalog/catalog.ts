/**
 * Brand Kit catalog — the entries.
 *
 * ONE list. Adding, hiding, renaming or regrouping a Brand Kit item is a
 * change to this file and nowhere else.
 *
 * Read `./types.ts` before editing — in particular the rule that `key` is
 * storage identity and must never change for an entry that has shipped.
 */
import type { KitSectionKey } from '../components/BrandKitSidebar';
import { deliverableKey, type DeliverableKey } from '../kit/types';
import {
  KIT_GROUPS,
  type CapabilityState,
  type KitEntry,
  type KitGroup,
  type KitView,
} from './types';

export { KIT_GROUPS };
export type { CapabilityState, KitEntry, KitGroup, KitView };

type EntryInput = {
  sectionKey: KitSectionKey;
  /** The name this entry's data is filed under. Half of the storage key. */
  storageLabel: string;
  /** Display name. Omit when it matches `storageLabel`. */
  label?: string;
  group: KitGroup;
  state: CapabilityState;
  view?: KitView;
};

function entry(input: EntryInput): KitEntry {
  return {
    key: deliverableKey(input.sectionKey, input.storageLabel),
    sectionKey: input.sectionKey,
    storageLabel: input.storageLabel,
    label: input.label ?? input.storageLabel,
    group: input.group,
    state: input.state,
    view: input.view ?? 'variants',
  };
}

/**
 * Every Brand Kit capability, in display order within each group.
 *
 * The `state` column is the whole simplification. Nothing below was
 * deleted to make the Brand Kit smaller — the four families that left the
 * user-facing kit (Web, Animations, the standalone Social formats, the
 * standalone decks) still have all their renderers, templates, registry
 * definitions and export paths, and still render correctly the moment
 * their state is raised.
 */
export const KIT_CATALOG: ReadonlyArray<KitEntry> = [
  /* ── Brand Assets ─────────────────────────────────────────────────
   * The brand's core identity. Every one of these reads real Setup data
   * rather than a template library. */
  entry({ sectionKey: 'brand-assets', storageLabel: 'Logos', group: 'assets', state: 'active' }),
  entry({ sectionKey: 'brand-assets', storageLabel: 'Colors', group: 'assets', state: 'active' }),
  // Renamed for the user; still filed under "Fonts".
  entry({ sectionKey: 'brand-assets', storageLabel: 'Fonts', label: 'Typography', group: 'assets', state: 'active' }),
  entry({ sectionKey: 'brand-assets', storageLabel: 'Icons', group: 'assets', state: 'active' }),
  entry({ sectionKey: 'brand-assets', storageLabel: 'Photos', group: 'assets', state: 'active' }),
  // Renamed AND re-viewed: still filed under "About", but it now renders
  // Setup's own eleven strategy answers instead of only the free-form
  // sections. Setup remains the single source of truth for all of it.
  entry({
    sectionKey: 'brand-assets',
    storageLabel: 'About',
    label: 'Strategy',
    group: 'assets',
    state: 'active',
    view: 'strategy',
  }),

  /* ── Brand Applications ───────────────────────────────────────────
   * The brand applied to the things every business actually sends out.
   * Email Signature keeps its `web::` storage key — it was filed there
   * before this group existed and its saved edits still live under it. */
  entry({ sectionKey: 'stationery', storageLabel: 'Business Card', group: 'applications', state: 'active' }),
  entry({ sectionKey: 'stationery', storageLabel: 'Letterhead', group: 'applications', state: 'active' }),
  entry({ sectionKey: 'stationery', storageLabel: 'Invoice', group: 'applications', state: 'active' }),
  entry({ sectionKey: 'web', storageLabel: 'Email Signature', group: 'applications', state: 'active' }),

  /* ── Social Media ─────────────────────────────────────────────────
   * One item, not four. It is a SYSTEM plus a real application of that
   * system — how this brand behaves on social, demonstrated — rather
   * than a pretend library of finished posts. The four standalone
   * formats below become its material. */
  entry({
    sectionKey: 'social',
    storageLabel: 'Social Media System',
    group: 'social',
    state: 'active',
    view: 'social-system',
  }),

  /* ── Presentations ────────────────────────────────────────────────
   * Same shape: the deck system with a real deck built from it, plus a
   * single-page overview of the whole identity. */
  entry({
    sectionKey: 'presentations',
    storageLabel: 'Presentation System',
    group: 'presentations',
    state: 'active',
    view: 'presentation-system',
  }),
  entry({
    sectionKey: 'presentations',
    storageLabel: 'Brand Board',
    group: 'presentations',
    state: 'active',
    view: 'brand-board',
  }),

  /* ── Experimental: built, working, deprioritised for V1 ───────────
   * Not deleted. Not broken. Just not part of the focused kit yet. */
  entry({ sectionKey: 'stationery', storageLabel: 'Envelope', group: 'applications', state: 'experimental' }),

  // The standalone social formats. The Social Media System renders these
  // very renderers as its applied examples, so the work is on screen
  // either way — these entries are the per-format drilldowns.
  entry({ sectionKey: 'social', storageLabel: 'Profile', group: 'social', state: 'experimental' }),
  entry({ sectionKey: 'social', storageLabel: 'Cover', group: 'social', state: 'experimental' }),
  entry({ sectionKey: 'social', storageLabel: 'Post', group: 'social', state: 'experimental' }),
  entry({ sectionKey: 'social', storageLabel: 'Story', group: 'social', state: 'experimental' }),

  // Web. A brand's website is a real capability and these renderers work;
  // it is simply not what V1 of the Brand Kit is about.
  entry({ sectionKey: 'web', storageLabel: 'Favicon', group: 'applications', state: 'experimental' }),
  entry({ sectionKey: 'web', storageLabel: 'Website', group: 'applications', state: 'experimental' }),
  entry({ sectionKey: 'web', storageLabel: 'Landing Page', group: 'applications', state: 'experimental' }),

  // The individual decks. The Presentation System builds its applied deck
  // from the Pitch Deck renderer.
  entry({ sectionKey: 'presentations', storageLabel: 'Pitch Deck', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'presentations', storageLabel: 'Business Plan', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'presentations', storageLabel: 'Proposal', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'presentations', storageLabel: 'Case Studies', group: 'presentations', state: 'experimental' }),

  // Motion. A whole family with no home in the product yet.
  entry({ sectionKey: 'animations', storageLabel: 'Logo Reveal', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'animations', storageLabel: 'Slide In', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'animations', storageLabel: 'Fade', group: 'presentations', state: 'experimental' }),
  entry({ sectionKey: 'animations', storageLabel: 'Rotate', group: 'presentations', state: 'experimental' }),

  /* ── Mockups: the brand on real objects ───────────────────────────
   * A NEW family (spec §3). Vector scenes with the logo composited
   * through `pickLogoOnBackground`, not photographs — so they restyle with
   * the brand instead of aging into stock art.
   *
   * `mockups::` is a section key of its own because these are not
   * stationery and not social: filing them under an existing section would
   * make the storage key lie about what the deliverable is, and the key is
   * the one thing that can never be changed afterwards.
   *
   * All `experimental` on purpose. The renderers exist (MockupMug /
   * TShirt / Billboard / Tote / Sticker) but the family has not been
   * curated, bound or contrast-swept yet, so nobody but a developer sees
   * it until it clears the bar in §1. */
  entry({ sectionKey: 'mockups', storageLabel: 'Signage', group: 'mockups', state: 'experimental' }),
  entry({ sectionKey: 'mockups', storageLabel: 'Apparel', group: 'mockups', state: 'experimental' }),
  entry({ sectionKey: 'mockups', storageLabel: 'Mug', group: 'mockups', state: 'experimental' }),
  entry({ sectionKey: 'mockups', storageLabel: 'Tote', group: 'mockups', state: 'experimental' }),
  entry({ sectionKey: 'mockups', storageLabel: 'Sticker', group: 'mockups', state: 'experimental' }),
  entry({
    sectionKey: 'mockups',
    storageLabel: 'Business Card Stack',
    group: 'mockups',
    state: 'experimental',
  }),
  entry({
    sectionKey: 'mockups',
    storageLabel: 'Device Screen',
    group: 'mockups',
    state: 'experimental',
  }),
  entry({ sectionKey: 'mockups', storageLabel: 'Billboard', group: 'mockups', state: 'experimental' }),

  /* ── Hidden: superseded by a surface that shipped elsewhere ───────
   * The Brand Guidelines BUILDER at /b/:slug/guideline is the guideline
   * surface now. These five cards are the duplicate. Their renderers stay
   * — `features/guidelines/pages/templates/*` is the strongest guideline
   * artwork in the repo and the builder reads it — but the kit does not
   * offer a second, weaker way in. */
  entry({ sectionKey: 'brand-guides', storageLabel: 'Logo Guide', group: 'presentations', state: 'hidden' }),
  entry({ sectionKey: 'brand-guides', storageLabel: 'Color Guide', group: 'presentations', state: 'hidden' }),
  entry({ sectionKey: 'brand-guides', storageLabel: 'Typography Guide', group: 'presentations', state: 'hidden' }),
  entry({ sectionKey: 'brand-guides', storageLabel: 'Voice Guide', group: 'presentations', state: 'hidden' }),
  entry({ sectionKey: 'brand-guides', storageLabel: 'Imagery Guide', group: 'presentations', state: 'hidden' }),
];

const BY_KEY: ReadonlyMap<DeliverableKey, KitEntry> = new Map(
  KIT_CATALOG.map((e) => [e.key, e]),
);

export function getEntry(key: DeliverableKey): KitEntry | undefined {
  return BY_KEY.get(key);
}

export function getEntryFor(
  sectionKey: KitSectionKey,
  storageLabel: string,
): KitEntry | undefined {
  return BY_KEY.get(deliverableKey(sectionKey, storageLabel));
}

/**
 * What a viewer with these privileges may see.
 *
 * `hidden` and `archived` are invisible to everyone — that is what makes
 * them safe places to park a superseded surface and a culled design
 * respectively, each keeping its persistence key reserved. `admin-only` is
 * never revealed by a dev build alone, so a developer cannot accidentally
 * demo something meant to stay internal.
 */
export function isVisible(
  state: CapabilityState,
  viewer: { isDev: boolean; isAdmin: boolean },
): boolean {
  switch (state) {
    case 'active':
      return true;
    case 'experimental':
      return viewer.isDev || viewer.isAdmin;
    case 'admin-only':
      return viewer.isAdmin;
    case 'hidden':
      return false;
    // Invisible to admins and to dev builds alike — see `CapabilityState`
    // in ./types.ts. A culled design a developer can still demo is a
    // culled design that comes back in a screenshot.
    case 'archived':
      return false;
  }
}

/** Every entry this viewer may see, in catalog order. */
export function visibleEntries(viewer: {
  isDev: boolean;
  isAdmin: boolean;
}): KitEntry[] {
  return KIT_CATALOG.filter((e) => isVisible(e.state, viewer));
}

/** Visible entries for one group, in catalog order. */
export function visibleEntriesForGroup(
  group: KitGroup,
  viewer: { isDev: boolean; isAdmin: boolean },
): KitEntry[] {
  return visibleEntries(viewer).filter((e) => e.group === group);
}

/** Groups that have at least one visible entry, in display order. */
export function visibleGroups(viewer: {
  isDev: boolean;
  isAdmin: boolean;
}): Array<{ id: KitGroup; label: string; entries: KitEntry[] }> {
  return KIT_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    entries: visibleEntriesForGroup(g.id, viewer),
  })).filter((g) => g.entries.length > 0);
}
