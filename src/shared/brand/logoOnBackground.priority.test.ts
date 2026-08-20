/**
 * `pickLogoByPriority` — the caller's order decides, contrast only vetoes.
 *
 * The bug this exists to prevent is subtle enough to survive review: a brand
 * with a Brand Icon shows its Primary lockup instead, because the lockup scored
 * a higher contrast ratio. Scoring answers "can this be seen" — a floor. It was
 * never meant to answer "which mark belongs in a small square", and when it is
 * allowed to, the answer is right often enough that nobody notices it is wrong.
 */
import { describe, expect, it } from 'vitest';
import { pickLogoByPriority, pickLogoOnBackground } from './logoOnBackground';
import type { Brand } from '@/shared/types/brand';

/** A brand carrying exactly the logo roles named, as v3 refs + assets. */
function brandWith(roles: Partial<Record<string, string>>, primaryColor = '#EF4444'): Brand {
  const brandAssets = Object.entries(roles).map(([role, url]) => ({
    id: `asset-${role}`,
    kind: 'logo' as const,
    name: role,
    formats: { svg: { url: url!, size: 1 } },
    tags: [],
  }));
  const ref = (role: string) =>
    roles[role] ? { assetId: `asset-${role}` } : undefined;

  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor,
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    brandAssets,
    logoSystem: {
      primary: ref('primary'),
      iconmark: ref('iconmark'),
      wordmark: ref('wordmark'),
      mono: { white: ref('monoWhite'), black: ref('monoBlack') },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Brand;
}

describe('the order a brand’s face is chosen in', () => {
  it('takes the Brand Icon when there is one', () => {
    const brand = brandWith({ iconmark: 'icon.svg', primary: 'primary.svg' });
    expect(pickLogoByPriority(brand, '#FFFFFF')?.url).toBe('icon.svg');
  });

  it('takes the Primary logo when there is no icon', () => {
    const brand = brandWith({ primary: 'primary.svg', wordmark: 'wordmark.svg' });
    expect(pickLogoByPriority(brand, '#FFFFFF')?.url).toBe('primary.svg');
  });

  it('does NOT let contrast scoring promote Primary over the icon', () => {
    // Both are coloured variants, so they score identically — but the previous
    // implementation compared scores across ALL roles, and a mono variant with
    // a better ratio would take the slot from the icon outright.
    const brand = brandWith({
      iconmark: 'icon.svg',
      primary: 'primary.svg',
      monoBlack: 'mono-black.svg',
    });
    // Scoring alone prefers the black mono on a white ground (21:1).
    expect(pickLogoOnBackground(brand, '#FFFFFF')?.url).toBe('mono-black.svg');
    // The face does not.
    expect(pickLogoByPriority(brand, '#FFFFFF')?.url).toBe('icon.svg');
  });

  it('falls through to a variant that reads when the priority roles cannot', () => {
    // A red mark on a red card is an empty card. Contrast still gets its veto,
    // and the mono twin is what rescues it.
    const brand = brandWith({ iconmark: 'icon.svg', monoWhite: 'mono-white.svg' }, '#EF4444');
    expect(pickLogoByPriority(brand, '#EF4444')?.url).toBe('mono-white.svg');
  });

  it('returns nothing — the letter’s cue — when the brand has no logo', () => {
    expect(pickLogoByPriority(brandWith({}), '#FFFFFF')).toBeUndefined();
  });

  it('returns nothing when no variant clears the floor on this background', () => {
    // Only a white mark, on white.
    const brand = brandWith({ monoWhite: 'mono-white.svg' }, '#FFFFFF');
    expect(pickLogoByPriority(brand, '#FFFFFF')).toBeUndefined();
  });

  it('honours a caller’s own order', () => {
    const brand = brandWith({ iconmark: 'icon.svg', wordmark: 'wordmark.svg' });
    expect(pickLogoByPriority(brand, '#FFFFFF', ['wordmark', 'iconmark'])?.url).toBe(
      'wordmark.svg',
    );
  });
});
