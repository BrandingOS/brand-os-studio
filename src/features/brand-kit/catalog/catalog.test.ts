import { describe, it, expect } from 'vitest';
import {
  KIT_CATALOG,
  KIT_GROUPS,
  getEntryFor,
  isVisible,
  visibleEntries,
  visibleGroups,
  type CapabilityState,
} from './catalog';
import { deliverableKey } from '../kit/types';
import { getDeliverable } from '../kit/registry';
import { resolveLegacyCard } from '../data/legacy-mapping';

const NOBODY = { isDev: false, isAdmin: false };
const DEV = { isDev: true, isAdmin: false };
const ADMIN = { isDev: false, isAdmin: true };

describe('kit catalog — storage identity', () => {
  /**
   * The load-bearing test in this file.
   *
   * Every key below is already written into somebody's browser — kit
   * items in `brandos:brand-kit:state`, card customizations in
   * `brandos:brand-kit:customizations`, saved featured-variant lists.
   * Renaming one is not an error anyone sees; it is that person's saved
   * work quietly disappearing. If this test fails because you renamed a
   * label, put the label back and change `label` instead of
   * `storageLabel`.
   */
  it('pins every shipped storage key', () => {
    const expected = [
      'brand-assets::Logos',
      'brand-assets::Colors',
      'brand-assets::Fonts',
      'brand-assets::Icons',
      'brand-assets::Photos',
      'brand-assets::About',
      'stationery::Business Card',
      'stationery::Letterhead',
      'stationery::Envelope',
      'stationery::Invoice',
      'social::Profile',
      'social::Cover',
      'social::Post',
      'social::Story',
      'web::Favicon',
      'web::Website',
      'web::Email Signature',
      'web::Landing Page',
      'brand-guides::Logo Guide',
      'brand-guides::Color Guide',
      'brand-guides::Typography Guide',
      'brand-guides::Voice Guide',
      'brand-guides::Imagery Guide',
      'presentations::Pitch Deck',
      'presentations::Business Plan',
      'presentations::Proposal',
      'presentations::Case Studies',
      'animations::Logo Reveal',
      'animations::Slide In',
      'animations::Fade',
      'animations::Rotate',
      'mockups::Signage',
      'mockups::Apparel',
      'mockups::Mug',
      'mockups::Tote',
      'mockups::Sticker',
      'mockups::Business Card Stack',
      'mockups::Device Screen',
      'mockups::Billboard',
    ];
    const keys = new Set(KIT_CATALOG.map((e) => e.key));
    for (const key of expected) expect(keys).toContain(key);
  });

  it('derives key from sectionKey + storageLabel, never from the display label', () => {
    for (const e of KIT_CATALOG) {
      expect(e.key).toBe(deliverableKey(e.sectionKey, e.storageLabel));
    }
  });

  it('has no duplicate keys', () => {
    const keys = KIT_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps renamed entries on their original key', () => {
    // Typography is still filed as Fonts; Strategy is still filed as About.
    expect(getEntryFor('brand-assets', 'Fonts')?.label).toBe('Typography');
    expect(getEntryFor('brand-assets', 'About')?.label).toBe('Strategy');
  });

  it('keeps Email Signature on its web:: key while showing it under Applications', () => {
    const e = getEntryFor('web', 'Email Signature');
    expect(e?.key).toBe('web::Email Signature');
    expect(e?.group).toBe('applications');
  });
});

describe('kit catalog — every entry resolves to something renderable', () => {
  it('resolves each variants entry to a registry def or a legacy source', () => {
    for (const e of KIT_CATALOG) {
      if (e.view !== 'variants') continue;
      // Mockups is the one family whose renderers exist but whose
      // labels are not yet routed (`legacy-mapping.ts`'s `mockups: {}`).
      // Exempt by SECTION, not by name, and paid for by the assertion
      // below: nobody outside a dev build can reach one.
      if (e.sectionKey === 'mockups') continue;
      const renderable =
        Boolean(getDeliverable(e.sectionKey, e.storageLabel)) ||
        Boolean(resolveLegacyCard(e.sectionKey, e.storageLabel));
      expect(
        renderable,
        `${e.key} has view 'variants' but no registry def and no legacy source`,
      ).toBe(true);
    }
  });

  it('never shows an unrouted mockup to a normal user', () => {
    // The exemption above is only safe while this holds. When the Mockups
    // family lands its `legacy-mapping` entries, delete the exemption
    // BEFORE promoting any of these to active.
    const mockups = KIT_CATALOG.filter((e) => e.sectionKey === 'mockups');
    expect(mockups.length).toBe(8);
    for (const e of mockups) expect(e.state).toBe('experimental');
    expect(visibleEntries(NOBODY).some((e) => e.sectionKey === 'mockups')).toBe(false);
  });

  it('gives every entry a group that exists', () => {
    const groups = new Set(KIT_GROUPS.map((g) => g.id));
    for (const e of KIT_CATALOG) expect(groups).toContain(e.group);
  });
});

describe('kit catalog — capability visibility', () => {
  it('shows active to everyone', () => {
    expect(isVisible('active', NOBODY)).toBe(true);
  });

  it('never shows hidden, to anyone', () => {
    for (const viewer of [NOBODY, DEV, ADMIN, { isDev: true, isAdmin: true }]) {
      expect(isVisible('hidden', viewer)).toBe(false);
    }
  });

  it('shows experimental to developers and admins, never to a normal user', () => {
    expect(isVisible('experimental', NOBODY)).toBe(false);
    expect(isVisible('experimental', DEV)).toBe(true);
    expect(isVisible('experimental', ADMIN)).toBe(true);
  });

  it('shows admin-only to admins, and NOT to a dev build alone', () => {
    // A developer must not be able to demo something meant to stay
    // internal just by running the dev server.
    expect(isVisible('admin-only', NOBODY)).toBe(false);
    expect(isVisible('admin-only', DEV)).toBe(false);
    expect(isVisible('admin-only', ADMIN)).toBe(true);
  });

  it('never shows archived, to anyone — not even an admin on a dev build', () => {
    // `archived` is where a CULLED design's persistence key is retired.
    // A developer who can still demo it will demo it.
    for (const viewer of [NOBODY, DEV, ADMIN, { isDev: true, isAdmin: true }]) {
      expect(isVisible('archived', viewer)).toBe(false);
    }
  });

  it('covers every capability state', () => {
    const states: CapabilityState[] = [
      'active',
      'experimental',
      'admin-only',
      'hidden',
      'archived',
    ];
    for (const s of states) expect(typeof isVisible(s, ADMIN)).toBe('boolean');
  });
});

describe('kit catalog — what a normal user actually sees', () => {
  const labels = visibleEntries(NOBODY).map((e) => e.label);

  it('is the focused twelve', () => {
    expect(labels).toEqual([
      'Logos',
      'Colors',
      'Typography',
      'Icons',
      'Photos',
      'Strategy',
      'Business Card',
      'Letterhead',
      'Invoice',
      'Email Signature',
      'Social Media System',
      'Presentation System',
      'Brand Board',
    ]);
  });

  it('drops the families that left V1', () => {
    for (const gone of [
      'Envelope',
      'Favicon',
      'Website',
      'Landing Page',
      'Logo Reveal',
      'Logo Guide',
      'Pitch Deck',
      'Post',
      'Story',
    ]) {
      expect(labels).not.toContain(gone);
    }
  });

  it('groups them in display order with no empty group', () => {
    const groups = visibleGroups(NOBODY);
    // Mockups is absent for a normal user because every entry in it is
    // experimental — `visibleGroups` drops a group with nothing in it.
    expect(groups.map((g) => g.label)).toEqual([
      'Brand Assets',
      'Brand Applications',
      'Social Media',
      'Presentations',
    ]);
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0);
  });

  it('puts Mockups directly after Brand Applications for a developer', () => {
    // Same brand on the same things, photographed rather than printed —
    // somebody looking for "our logo on a tote" looks near the card.
    expect(KIT_GROUPS.map((g) => g.id)).toEqual([
      'assets',
      'applications',
      'mockups',
      'social',
      'presentations',
    ]);
    expect(visibleGroups(DEV).map((g) => g.label)).toEqual([
      'Brand Assets',
      'Brand Applications',
      'Mockups',
      'Social Media',
      'Presentations',
    ]);
    const mockups = visibleGroups(DEV).find((g) => g.label === 'Mockups')!;
    expect(mockups.entries.map((e) => e.label)).toEqual([
      'Signage',
      'Apparel',
      'Mug',
      'Tote',
      'Sticker',
      'Business Card Stack',
      'Device Screen',
      'Billboard',
    ]);
  });

  it('keeps the retired work reachable for a developer or admin', () => {
    const devLabels = visibleEntries(DEV).map((e) => e.label);
    for (const kept of ['Envelope', 'Website', 'Pitch Deck', 'Logo Reveal', 'Post']) {
      expect(devLabels).toContain(kept);
    }
    // ...but the guideline duplicates stay gone even for them.
    expect(devLabels).not.toContain('Logo Guide');
  });
});
