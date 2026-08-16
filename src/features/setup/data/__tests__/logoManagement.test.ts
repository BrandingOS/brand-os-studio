/**
 * Managing logo variants from Setup.
 *
 * Setup could show a logo system and barely change one. The `+` opened a file
 * picker that produced a tile called "Logo" with no role — and a tile with no
 * role has no slot, so the upload could not be persisted at all. There was no
 * way to promote a variant, and deleting the primary left the brand with no
 * logo anywhere in the product.
 *
 * The behaviours below are what Setup and the onboarding review now share.
 */
import { describe, it, expect } from 'vitest';
import {
  ADDABLE_LOGO_ROLES,
  LOGO_ROLE_DEFS,
  logoRoleLabel,
  roleForSlot,
  slotForRole,
} from '@/shared/brand/logoRoles';
import { LOGO_ROLES } from '../../components/SetupBoard';

describe('one vocabulary of variants', () => {
  it('names every canonical role exactly once', () => {
    const roles = LOGO_ROLE_DEFS.map((d) => d.role);
    expect(new Set(roles).size).toBe(roles.length);
    expect(roles).toEqual([
      'primary',
      'secondary',
      'iconmark',
      'wordmark',
      'mono.white',
      'mono.black',
      'horizontal',
      'stacked',
    ]);
  });

  it('calls the iconmark what the product calls it', () => {
    // One name per role, everywhere. This one was "Icon" on one board and
    // "Brand Icon" in the copy people wrote about it.
    expect(logoRoleLabel('iconmark')).toBe('Brand Icon');
    expect(logoRoleLabel('mono.white')).toBe('On dark');
  });

  it('round-trips between the review’s slot keys and the canonical roles', () => {
    for (const def of LOGO_ROLE_DEFS) {
      expect(roleForSlot(def.slot)).toBe(def.role);
      expect(slotForRole(def.role)).toBe(def.slot);
    }
    // A variant the user invented has no canonical role, on purpose.
    expect(roleForSlot('custom:seasonal')).toBeUndefined();
  });

  it('does not offer "On light" — the ordinary case is not a variant', () => {
    expect(ADDABLE_LOGO_ROLES.map((d) => d.role)).not.toContain('mono.black');
    // …but it is still described, so a brand that has one still renders it.
    expect(LOGO_ROLE_DEFS.map((d) => d.role)).toContain('mono.black');
  });

  it('gives Setup the same list, under the same names', () => {
    expect(LOGO_ROLES.map((r) => r.label)).toEqual(ADDABLE_LOGO_ROLES.map((d) => d.label));
    expect(LOGO_ROLES.map((r) => r.role)).toEqual(ADDABLE_LOGO_ROLES.map((d) => d.role));
    // Every tile id is distinct — they address the board.
    expect(new Set(LOGO_ROLES.map((r) => r.id)).size).toBe(LOGO_ROLES.length);
  });

  it('previews the on-dark variant on a dark ground and nothing else', () => {
    const dark = LOGO_ROLE_DEFS.filter((d) => d.tone === 'dark').map((d) => d.role);
    expect(dark).toEqual(['mono.white']);
  });
});
