import { describe, expect, it } from 'vitest';
import { INDUSTRY } from '@/features/onboarding/vocabulary/vocabularies';
import { FLATICON_RR_NAMES } from './flaticonNames';
import {
  ICON_PACKS,
  PACK_BY_INDUSTRY,
  detectPackFromText,
  iconPack,
  isRealCatalogName,
  packClassNames,
  packForIndustry,
} from './iconPacks';

const CATALOG = new Set(FLATICON_RR_NAMES);

describe('icon packs', () => {
  it('every name in every pack really exists in the shipped catalogue', () => {
    // The audit's "50 emptyLike tiles" were names the font has no glyph for.
    // A typo here renders an empty box, so the catalogue is the test.
    const missing: string[] = [];
    for (const pack of ICON_PACKS) {
      for (const name of pack.icons) {
        if (!CATALOG.has(`fi-rr-${name}`)) missing.push(`${pack.id}/${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every pack is a usable set — 24 to 32 symbols, no duplicates', () => {
    for (const pack of ICON_PACKS) {
      expect(pack.icons.length, pack.id).toBeGreaterThanOrEqual(24);
      expect(pack.icons.length, pack.id).toBeLessThanOrEqual(32);
      expect(new Set(pack.icons).size, pack.id).toBe(pack.icons.length);
    }
  });

  it('names are stored without a weight prefix, so a weight change is one edit', () => {
    for (const pack of ICON_PACKS) {
      for (const name of pack.icons) expect(name.startsWith('fi-')).toBe(false);
    }
  });

  it('pack ids and labels are unique', () => {
    expect(new Set(ICON_PACKS.map((p) => p.id)).size).toBe(ICON_PACKS.length);
    expect(new Set(ICON_PACKS.map((p) => p.label)).size).toBe(ICON_PACKS.length);
  });

  it('every industry in the onboarding vocabulary maps to a real pack', () => {
    const ids = new Set(ICON_PACKS.map((p) => p.id));
    for (const member of INDUSTRY) {
      const packId = PACK_BY_INDUSTRY[member.id];
      expect(packId, `industry ${member.id} has no pack`).toBeTruthy();
      expect(ids.has(packId!), `${member.id} → ${packId}`).toBe(true);
    }
  });

  it('resolves an industry by id and by the label a person reads', () => {
    expect(packForIndustry('finance')?.id).toBe('finance');
    expect(packForIndustry('Health & Wellness')?.id).toBe('health');
    expect(packForIndustry('food-beverage')?.id).toBe('food');
    expect(packForIndustry('')).toBeNull();
  });

  it('falls through to the wording of an "Other" answer', () => {
    expect(packForIndustry('mobile app development studio')?.id).toBe('tech');
  });

  it('one stray word is a coincidence, two is a signal', () => {
    expect(detectPackFromText('we value design')).toBeNull();
    expect(detectPackFromText('a bakery and coffee house serving pastry')?.id).toBe('food');
  });

  it('unknown ids fall back to the general pack rather than throwing', () => {
    expect(iconPack('nope').id).toBe('general');
    expect(iconPack(undefined).id).toBe('general');
  });

  it('class names carry the regular-rounded prefix', () => {
    const names = packClassNames(iconPack('finance'));
    expect(names.every((n) => n.startsWith('fi-rr-'))).toBe(true);
    expect(names.every((n) => CATALOG.has(n))).toBe(true);
  });

  it('isRealCatalogName answers for a bare name', () => {
    expect(isRealCatalogName('camera')).toBe(true);
    expect(isRealCatalogName('definitely-not-an-icon')).toBe(false);
  });

  it('no pack offers the off-brand glyphs the audit found', () => {
    // Waste, Waste Pollution, Building NGO, Broken Chain, Assistive Listening,
    // Turkey, Anatomical Heart, Blender Phone, Government User, Cvv Card.
    const banned = [
      'waste', 'waste-pollution', 'building-ngo', 'broken-chain',
      'assistive-listening-systems', 'turkey', 'anatomical-heart',
      'blender-phone', 'government-user', 'cvv-card',
    ];
    const offered = new Set(ICON_PACKS.flatMap((p) => [...p.icons]));
    for (const name of banned) expect(offered.has(name), name).toBe(false);
  });
});
