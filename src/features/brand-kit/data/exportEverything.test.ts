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
import { visibleEntries, visibleGroups, KIT_CATALOG } from '../catalog/catalog';

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
