/**
 * Managing logo variants from Setup.
 *
 * What Setup could do before: upload a file that became a tile called "Logo"
 * holding no role — and a tile with no role has no slot, so it could not be
 * persisted at all. What it could not do: name the variant before uploading,
 * promote one to Primary, or delete one without risking a brand that has no
 * primary logo anywhere in the product.
 */
import { describe, it, expect } from 'vitest';
import { LOGO_ROLE_DEFS, logoRoleDef } from '@/shared/brand/logoRoles';
import type { BrandLogo } from '../mockBrand';
import { addVariant, changeRole, logoTileSvg, removeVariant, setPrimary } from '../logoBoard';

const tile = (id: string, role: BrandLogo['role'], label: string, tone: 'light' | 'dark' = 'light'): BrandLogo => ({
  id,
  label,
  variant: tone,
  role,
  svg: logoTileSvg(`${id}.svg`, tone),
});

const board = (): BrandLogo[] => [
  tile('primary', 'primary', 'Primary'),
  tile('mark', 'iconmark', 'Brand Icon'),
];

const roles = (logos: BrandLogo[]) => logos.map((l) => l.role);

describe('adding a variant the user named', () => {
  it('lands in the role that was chosen', () => {
    const next = addVariant(board(), logoRoleDef('wordmark')!, 'word.svg');
    expect(roles(next)).toEqual(['primary', 'iconmark', 'wordmark']);
    expect(next[2].svg).toContain('word.svg');
    expect(next[2].label).toBe('Wordmark');
  });

  it('replaces the tile already holding that role, never doubles it', () => {
    const next = addVariant(board(), logoRoleDef('iconmark')!, 'new-icon.svg');
    expect(roles(next)).toEqual(['primary', 'iconmark']);
    expect(next.find((l) => l.role === 'iconmark')!.svg).toContain('new-icon.svg');
  });

  it('leaves every other variant exactly where it was', () => {
    // Adding a primary has no opinion about the icon.
    const next = addVariant(board(), logoRoleDef('primary')!, 'new-primary.svg');
    expect(next.find((l) => l.role === 'iconmark')!.svg).toContain('mark.svg');
  });

  it('keeps the primary first, wherever it is added', () => {
    const next = addVariant([tile('mark', 'iconmark', 'Brand Icon')], logoRoleDef('primary')!, 'p.svg');
    expect(next[0].role).toBe('primary');
  });

  it('previews the on-dark variant on a dark ground and never inverts it', () => {
    const next = addVariant(board(), logoRoleDef('mono.white')!, 'white.svg');
    const onDark = next.find((l) => l.role === 'mono.white')!;
    expect(onDark.variant).toBe('dark');
    expect(onDark.svg).toContain('fill="#111113"');
    // The artwork is embedded untouched. Nothing here recolours a drawing.
    expect(onDark.svg).toContain('white.svg');
    expect(onDark.svg).not.toContain('invert');
  });
});

describe('promoting a variant to Primary', () => {
  it('trades roles rather than dropping the old primary', () => {
    const next = setPrimary(board(), 'mark');
    expect(next[0].role).toBe('primary');
    expect(next[0].svg).toContain('mark.svg');
    // The artwork that WAS the primary is still one of the brand's logos.
    const displaced = next.find((l) => l.role === 'iconmark')!;
    expect(displaced.svg).toContain('primary.svg');
  });

  it('does nothing when it is already the primary', () => {
    const before = board();
    expect(setPrimary(before, 'primary')).toBe(before);
  });

  it('re-grounds a promoted on-dark variant, without touching its artwork', () => {
    const withDark = [...board(), tile('on-dark', 'mono.white', 'On dark', 'dark')];
    const next = setPrimary(withDark, 'on-dark');
    expect(next[0].role).toBe('primary');
    expect(next[0].svg).toContain('fill="#F5F4EF"');
    expect(next[0].svg).toContain('on-dark.svg');
  });
});

describe('removing a variant', () => {
  it('removes an ordinary one outright', () => {
    const next = removeVariant(board(), 'mark');
    expect(next.ok).toBe(true);
    expect(next.ok && roles(next.logos)).toEqual(['primary']);
  });

  it('promotes the next variant when the primary goes', () => {
    const out = removeVariant(board(), 'primary');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.promoted?.label).toBe('Primary');
    // The icon's artwork is what took the role.
    expect(out.logos[0].svg).toContain('mark.svg');
    expect(roles(out.logos)).toEqual(['primary']);
  });

  it('refuses to remove the only logo', () => {
    // A brand with no primary is a brand with no logo, everywhere that asks.
    const out = removeVariant([tile('primary', 'primary', 'Primary')], 'primary');
    expect(out).toEqual({ ok: false, reason: 'only-logo' });
  });
});

describe('changing a variant’s role', () => {
  it('swaps with whatever held the target role', () => {
    const target = LOGO_ROLE_DEFS.find((d) => d.role === 'iconmark')!;
    const next = changeRole(board(), 'primary', {
      id: 'mark',
      label: target.label,
      variant: target.tone,
      role: target.role,
    });
    expect(next.find((l) => l.role === 'iconmark')!.svg).toContain('primary.svg');
    expect(next.find((l) => l.role === 'primary')!.svg).toContain('mark.svg');
  });

  it('moves into a free role without disturbing anything else', () => {
    const target = LOGO_ROLE_DEFS.find((d) => d.role === 'wordmark')!;
    const next = changeRole(board(), 'mark', {
      id: 'wordmark',
      label: target.label,
      variant: target.tone,
      role: target.role,
    });
    expect(roles(next)).toEqual(['primary', 'wordmark']);
    expect(next.find((l) => l.role === 'wordmark')!.svg).toContain('mark.svg');
  });
});
