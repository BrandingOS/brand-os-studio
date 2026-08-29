/**
 * What "Export kit" actually puts in the zip.
 *
 * The bug this file exists to prevent is not a crash. It is an export
 * that succeeds, downloads, opens — and contains the brand's colours and
 * nothing the brand was applied to. A user cannot tell that from a
 * working export until they go looking for the business card.
 */
import { describe, it, expect } from 'vitest';
import { planKitExport } from './exportEverything';
import { downloadOptionsFor, nativeFormatFor, SOCIAL_PACK_SLOTS } from './exportFormats';
import { SOCIAL_SIZES } from '../exporters';
import { getEntryFor, visibleEntries, visibleGroups, KIT_CATALOG } from '../catalog/catalog';

const CUSTOMER = { isDev: false, isAdmin: false };
const DEVELOPER = { isDev: true, isAdmin: false };

describe('planKitExport', () => {
  it('plans exactly one unit per entry, in the order the kit shows them', () => {
    const entries = visibleEntries(CUSTOMER);
    const units = planKitExport(entries);
    expect(units).toHaveLength(entries.length);
    expect(units.map((u) => u.entry.key)).toEqual(entries.map((e) => e.key));
  });

  it('exports every deliverable the kit shows, not just the brand assets', () => {
    const units = planKitExport(visibleEntries(CUSTOMER));
    const deliverables = units.filter((u) => u.path.startsWith('deliverables/'));
    // Business Card · Letterhead · Invoice · Email Signature · Social
    // Media System · Presentation System · Brand Board.
    expect(deliverables.map((u) => u.path).sort()).toEqual([
      'deliverables/brand-board.png',
      'deliverables/business-card.png',
      'deliverables/email-signature.png',
      'deliverables/invoice.png',
      'deliverables/letterhead.png',
      'deliverables/presentation-system.png',
      'deliverables/social-media-system.png',
    ]);
  });

  it('gives every brand-asset card a folder of its own', () => {
    const units = planKitExport(visibleEntries(CUSTOMER));
    const byKind = Object.fromEntries(units.map((u) => [u.kind, u.path]));
    expect(byKind.logos).toBe('logos/');
    expect(byKind.colors).toBe('colors/');
    expect(byKind.fonts).toBe('fonts/');
    expect(byKind.icons).toBe('icons/');
    expect(byKind.photos).toBe('photos/');
  });

  it('files Strategy as the about document rather than a picture of itself', () => {
    // Strategy is prose. Rasterizing it would ship an image of text that
    // brand.json and about.md already carry as text.
    const strategy = KIT_CATALOG.find((e) => e.view === 'strategy');
    const [unit] = planKitExport([strategy!]);
    expect(unit.kind).toBe('about');
    expect(unit.path).toBe('strategy.pdf');
  });

  it('rasterizes a composed system as a page body, not as a card', () => {
    const social = KIT_CATALOG.find((e) => e.view === 'social-system');
    const [unit] = planKitExport([social!]);
    expect(unit.kind).toBe('document');
  });

  it('ships only what the viewer can see — an experimental capability never leaks', () => {
    const customer = planKitExport(visibleEntries(CUSTOMER));
    const developer = planKitExport(visibleEntries(DEVELOPER));
    expect(developer.length).toBeGreaterThan(customer.length);
    // Envelope is experimental: built, working, deprioritised. It must
    // not appear in a customer's download.
    expect(customer.some((u) => u.path.includes('envelope'))).toBe(false);
    expect(developer.some((u) => u.path.includes('envelope'))).toBe(true);
  });

  it('never plans a hidden capability, for anyone', () => {
    const everyone = [CUSTOMER, DEVELOPER, { isDev: true, isAdmin: true }];
    for (const viewer of everyone) {
      const units = planKitExport(visibleEntries(viewer));
      expect(units.some((u) => u.entry.state === 'hidden')).toBe(false);
    }
  });

  it('plans a group download out of the same units as the whole kit', () => {
    // The two buttons must not be able to disagree about what a group
    // contains — that is the whole reason they share this function.
    const groups = visibleGroups(CUSTOMER);
    const perGroup = groups.flatMap((g) => planKitExport(g.entries).map((u) => u.path));
    const whole = planKitExport(visibleEntries(CUSTOMER)).map((u) => u.path);
    expect(perGroup.slice().sort()).toEqual(whole.slice().sort());
  });

  it('gives every unit a distinct destination', () => {
    const units = planKitExport(visibleEntries(DEVELOPER));
    const files = units.filter((u) => !u.path.endsWith('/')).map((u) => u.path);
    expect(new Set(files).size).toBe(files.length);
  });
});

/**
 * What a family owes beyond a picture of itself.
 *
 * Decided from the catalog ENTRY, because both readers need the answer
 * before anything is rendered: the menu has to be drawn on hover, and the
 * zip walker has to plan before it rasterizes. One function, so the row the
 * user clicks and the file the zip contains cannot name different formats.
 */
describe('nativeFormatFor', () => {
  const entry = (section: string, label: string) => getEntryFor(section as never, label)!;

  it.each([
    ['web', 'Favicon', 'ico'],
    ['web', 'Email Signature', 'html'],
    ['social', 'Post', 'sizes'],
    ['social', 'Story', 'sizes'],
    ['social', 'Cover', 'sizes'],
    ['social', 'Profile', 'sizes'],
    ['presentations', 'Pitch Deck', 'pptx'],
    ['presentations', 'Presentation System', 'pptx'],
  ])('%s / %s owes a %s', (section, label, expected) => {
    expect(nativeFormatFor(entry(section, label))).toBe(expected);
  });

  it('never asks the Brand Board for slides — it is a poster', () => {
    // It lives in `presentations` and has no `slides` to carry. A rule
    // written as "the presentations section" alone would have shipped an
    // empty deck for it.
    expect(nativeFormatFor(entry('presentations', 'Brand Board'))).toBeNull();
  });

  it('leaves a family with no native exporter alone', () => {
    for (const label of ['Business Card', 'Letterhead', 'Invoice']) {
      expect(nativeFormatFor(entry('stationery', label))).toBeNull();
    }
    expect(nativeFormatFor(entry('brand-assets', 'Logos'))).toBeNull();
  });

  it('names only slots the size table actually knows', () => {
    // A typo here is a download that throws `Unknown social slot` in the
    // middle of an export the user is watching.
    const known = new Set(SOCIAL_SIZES.map((s) => s.id));
    for (const [label, slots] of Object.entries(SOCIAL_PACK_SLOTS)) {
      expect(slots.length, `${label} asks for no sizes`).toBeGreaterThan(0);
      for (const id of slots) expect(known, `${label} → ${id}`).toContain(id);
    }
  });

  it('never offers an Instagram POST as a profile picture', () => {
    // `PROFILE_SLOTS` is "every square slot" and a post is square, so the
    // obvious derivation put a 1080 feed design in the avatar pack.
    expect(SOCIAL_PACK_SLOTS.Profile).not.toContain('instagram-post');
  });
});

/**
 * The menu is the same five rows everywhere.
 *
 * A menu that changes shape per card is a menu nobody learns, so the third
 * row is always there: the family's own native format when it has one, the
 * vector when the artwork is vector, and otherwise the vector row disabled
 * with the reason. Never hidden.
 */
describe('downloadOptionsFor', () => {
  const shape = (section: string, label: string) =>
    downloadOptionsFor(getEntryFor(section as never, label)!).map((o) => `${o.label} (${o.chip})`);

  it('opens with For web and For print, whatever the family', () => {
    for (const entry of visibleEntries(DEVELOPER)) {
      const options = downloadOptionsFor(entry);
      expect(options).toHaveLength(5);
      expect(options.slice(0, 2).map((o) => o.format)).toEqual(['png', 'pdf']);
      expect(options.filter((o) => o.secondary)).toHaveLength(3);
    }
  });

  it('offers the real format where one now exists', () => {
    expect(shape('presentations', 'Pitch Deck')[2]).toBe('Editable deck (PPTX)');
    expect(shape('web', 'Favicon')[2]).toBe('Favicon set (ICO)');
    expect(shape('web', 'Email Signature')[2]).toBe('Signature (HTML)');
    expect(shape('social', 'Story')[2]).toBe('Platform sizes (PNG)');
    for (const label of ['Pitch Deck']) {
      const option = downloadOptionsFor(getEntryFor('presentations', label)!)[2];
      expect(option.disabledReason, 'a real format is never "coming soon"').toBeUndefined();
    }
  });

  it('keeps the vector row honest where no exporter exists', () => {
    const card = downloadOptionsFor(getEntryFor('stationery', 'Business Card')!)[2];
    expect(card.format).toBe('svg');
    expect(card.disabledReason).toBeTruthy();
    // The brand's own assets ARE vector, so theirs is enabled.
    const logos = downloadOptionsFor(getEntryFor('brand-assets', 'Logos')!)[2];
    expect(logos.format).toBe('svg');
    expect(logos.disabledReason).toBeUndefined();
  });
});
