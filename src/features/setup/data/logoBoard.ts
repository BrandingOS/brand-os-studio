/**
 * The rules for a board of logo variants.
 *
 * Pulled out of `SetupPage` because they are decisions, not rendering: what
 * happens when a variant is added into a role that is taken, what "set as
 * primary" does to the logo it displaces, and when a deletion must be refused.
 * Each of those had lived inside a `setBrand` callback where nothing could
 * check it.
 *
 * Every function here takes the board and returns a new board. None of them
 * touch a store, so the answers are the same in a test as on the page.
 */
import type { BrandLogo } from './mockBrand';
import type { LogoRoleDef } from '@/shared/brand/logoRoles';
import type { LogoRole } from '@/shared/types/brandAssets';

/** The tile id Setup addresses each role by. */
export const TILE_ID_BY_ROLE: Partial<Record<LogoRole, string>> = {
  primary: 'primary',
  secondary: 'alternate',
  iconmark: 'mark',
  wordmark: 'wordmark',
  'mono.white': 'on-dark',
  'mono.black': 'on-light',
  horizontal: 'horizontal',
  stacked: 'vertical',
};

/** The tile's own ground. Only the white-ink variant gets a dark one. */
export function groundFor(tone: 'light' | 'dark'): string {
  return tone === 'dark' ? '#111113' : '#F5F4EF';
}

/**
 * Re-ground a tile WITHOUT touching the artwork.
 *
 * Only the background rect changes. The `<image>` inside is the file the user
 * uploaded and is never recoloured — moving a logo into the On-dark slot
 * previews it on black; it does not make a light logo out of a dark one.
 */
export function reground(svg: string, tone: 'light' | 'dark'): string {
  const bg = groundFor(tone);
  return /<rect[^>]*fill="/.test(svg)
    ? svg.replace(/(<rect[^>]*fill=")[^"]*(")/, `$1${bg}$2`)
    : // A tile with no ground of its own (an uploaded SVG document) gets one,
      // so the dark slot is dark rather than transparent.
      svg.replace(/(<svg[^>]*>)/, `$1<rect width="200" height="200" fill="${bg}"/>`);
}

/** The tile wrapper Setup renders an uploaded logo through. */
export function logoTileSvg(src: string, tone: 'light' | 'dark'): string {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="${groundFor(
    tone,
  )}"/><image href="${src}" x="20" y="20" width="160" height="160" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Put a logo into the role the user named.
 *
 * REPLACES whatever held that role rather than adding a second tile claiming
 * it — the user said which variant this is, and two tiles cannot both be the
 * wordmark. Every other tile is left exactly where it was; adding a primary
 * has no opinion about the icon.
 */
export function addVariant(logos: BrandLogo[], def: LogoRoleDef, src: string): BrandLogo[] {
  const id = TILE_ID_BY_ROLE[def.role] ?? def.slot;
  const next: BrandLogo = {
    id,
    label: def.label,
    variant: def.tone,
    role: def.role,
    svg: logoTileSvg(src, def.tone),
  };
  const others = logos.filter((l) => l.id !== id && l.role !== def.role);
  // Primary always renders and persists first.
  return def.role === 'primary' ? [next, ...others] : [...others, next];
}

/**
 * Promote a variant to Primary.
 *
 * The two tiles TRADE roles. The artwork that was the primary is still one of
 * the brand's logos, and dropping it because a different one was promoted would
 * be a deletion nobody asked for.
 */
export function setPrimary(logos: BrandLogo[], id: string): BrandLogo[] {
  const target = logos.find((l) => l.id === id);
  if (!target || target.role === 'primary') return logos;
  const held = logos.find((l) => l.role === 'primary' || l.id === 'primary');

  const next = logos.map((l) => {
    if (l.id === id) {
      return {
        ...l,
        id: 'primary',
        label: 'Primary',
        variant: 'light' as const,
        role: 'primary' as LogoRole,
        svg: reground(l.svg, 'light'),
      };
    }
    if (held && l.id === held.id) {
      return {
        ...l,
        id: target.id,
        label: target.label,
        variant: target.variant,
        role: target.role,
        svg: reground(l.svg, target.variant),
      };
    }
    return l;
  });

  const pIdx = next.findIndex((l) => l.id === 'primary');
  if (pIdx > 0) {
    const [p] = next.splice(pIdx, 1);
    next.unshift(p);
  }
  return next;
}

export type RemoveOutcome =
  | { ok: true; logos: BrandLogo[]; promoted?: BrandLogo }
  | { ok: false; reason: 'only-logo' };

/**
 * Remove a variant, with the primary protected.
 *
 * A brand with no primary logo is a brand with no logo as far as most of the
 * product is concerned — the avatar, the exports and every renderer ask for
 * that one first. So removing it is allowed only when something can take its
 * place: the next variant is promoted and the caller is told which, and when
 * there is nothing to promote the removal is refused rather than quietly
 * leaving the brand empty.
 */
export function removeVariant(logos: BrandLogo[], id: string): RemoveOutcome {
  const target = logos.find((l) => l.id === id);
  if (!target) return { ok: true, logos };

  const rest = logos.filter((l) => l.id !== id);
  const isPrimary = target.role === 'primary' || logos[0]?.id === id;
  if (!isPrimary) return { ok: true, logos: rest };
  if (rest.length === 0) return { ok: false, reason: 'only-logo' };

  const [heir, ...others] = rest;
  const promoted: BrandLogo = {
    ...heir,
    id: 'primary',
    label: 'Primary',
    variant: 'light',
    role: 'primary',
    svg: reground(heir.svg, 'light'),
  };
  return { ok: true, logos: [promoted, ...others], promoted };
}

/**
 * Reassign a tile to a different variant — the swap behind "Change logo type".
 *
 * When another tile already holds the target role the two TRADE, for the same
 * reason `setPrimary` trades: neither artwork is being deleted, only renamed.
 */
export function changeRole(
  logos: BrandLogo[],
  id: string,
  target: { id: string; label: string; variant: 'light' | 'dark'; role: LogoRole },
): BrandLogo[] {
  const next = logos.slice();
  const idx = next.findIndex((l) => l.id === id);
  if (idx < 0 || next[idx].id === target.id) return logos;

  const current = next[idx];
  const vacated = {
    id: current.id,
    label: current.label,
    variant: current.variant,
    role: current.role,
  };
  const occupied = next.findIndex((l, i) => i !== idx && l.id === target.id);

  next[idx] = {
    ...current,
    id: target.id,
    label: target.label,
    variant: target.variant,
    role: target.role,
    svg: reground(current.svg, target.variant),
  };
  if (occupied >= 0) {
    next[occupied] = {
      ...next[occupied],
      ...vacated,
      svg: reground(next[occupied].svg, vacated.variant),
    };
  }

  const pIdx = next.findIndex((l) => l.id === 'primary');
  if (pIdx > 0) {
    const [p] = next.splice(pIdx, 1);
    next.unshift(p);
  }
  return next;
}
