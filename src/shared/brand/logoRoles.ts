/**
 * The ONE vocabulary of logo variants.
 *
 * A brand's logo variants are named in four places — the onboarding review's
 * board, Setup's logo section, the canonical `LogoSystemRefs`, and the legacy
 * `logoAssets` dict — and each of them had grown its own list. The review
 * offered six variants, Setup offered a different six, one called the same
 * artwork "Icon" and the other "Brand Icon", and the two mapped to canonical
 * roles through separate hand-written tables that had already drifted.
 *
 * So the vocabulary lives here, once, and every surface reads it. A variant
 * added here appears in both boards; a label reworded here is reworded in both.
 *
 * Two naming traps this module exists to keep straight:
 *
 *   `tone` is the GROUND a variant is previewed on, never a claim about the
 *   artwork. "On dark" means the tile behind it is dark, because that is what
 *   the variant was drawn for — the drawing itself is shown exactly as it was
 *   uploaded, never inverted.
 *
 *   `mono.white` is the WHITE artwork, which is the one you place on a dark
 *   ground. The canonical role names the ink; the label names the use. They
 *   read as opposites and both are correct.
 */
import type { LogoRef, LogoRole, LogoSystemRefs } from '@/shared/types/brandAssets';

export interface LogoRoleDef {
  /** The canonical role. What persists, in `logoSystem`. */
  role: LogoRole;
  /** The name a person reads. One name per role, in every surface. */
  label: string;
  /** One line of "what is this for", shown where there is room. */
  hint: string;
  /** The ground to preview it on — NOT a property of the artwork. */
  tone: 'light' | 'dark';
  /** Onboarding's own slot key, so the frozen board can share this list. */
  slot: string;
}

/**
 * Every variant the product knows, in board order.
 *
 * The order is deliberate and shared: tiles must not shuffle between the review
 * and Setup, or between two visits to either.
 */
export const LOGO_ROLE_DEFS: readonly LogoRoleDef[] = [
  {
    role: 'primary',
    slot: 'primary',
    label: 'Primary',
    hint: 'Your main logo',
    tone: 'light',
  },
  {
    role: 'secondary',
    slot: 'secondary',
    label: 'Secondary',
    hint: 'An alternate lockup',
    tone: 'light',
  },
  {
    role: 'iconmark',
    slot: 'mark',
    label: 'Brand Icon',
    hint: 'The symbol or monogram on its own',
    tone: 'light',
  },
  {
    role: 'wordmark',
    slot: 'wordmark',
    label: 'Wordmark',
    hint: 'The name, set as type',
    tone: 'light',
  },
  {
    role: 'mono.white',
    slot: 'dark',
    label: 'On dark',
    hint: 'The light version, for dark backgrounds',
    tone: 'dark',
  },
  {
    role: 'mono.black',
    slot: 'light',
    label: 'On light',
    hint: 'The dark version, for light backgrounds',
    tone: 'light',
  },
  {
    role: 'horizontal',
    slot: 'horizontal',
    label: 'Horizontal',
    hint: 'Wide lockup',
    tone: 'light',
  },
  {
    role: 'stacked',
    slot: 'vertical',
    label: 'Vertical',
    hint: 'Stacked lockup',
    tone: 'light',
  },
];

/**
 * The variants a user may ADD.
 *
 * "On light" is absent, as it has been in onboarding since the board was
 * redesigned: a logo on a light background is the ordinary case, not a variant.
 * A brand that already has one still renders it — `LOGO_ROLE_DEFS` describes
 * it — but nothing offers it, because a slot for the default never says
 * anything.
 */
export const ADDABLE_LOGO_ROLES: readonly LogoRoleDef[] = LOGO_ROLE_DEFS.filter(
  (d) => d.role !== 'mono.black',
);

const BY_ROLE = new Map(LOGO_ROLE_DEFS.map((d) => [d.role, d]));
const BY_SLOT = new Map(LOGO_ROLE_DEFS.map((d) => [d.slot, d]));

export function logoRoleDef(role: LogoRole | undefined): LogoRoleDef | undefined {
  return role ? BY_ROLE.get(role) : undefined;
}

/** The name a person reads for a role. Falls back to the raw role. */
export function logoRoleLabel(role: LogoRole | undefined): string {
  return logoRoleDef(role)?.label ?? String(role ?? '');
}

/**
 * Onboarding's slot key → the canonical role.
 *
 * `custom:<name>` is deliberately unmapped. It is a variant the user invented,
 * so the model has no role for it: the file is kept as a brand logo in the
 * Library and claims no slot, rather than being forced into one nobody asked
 * for.
 */
export function roleForSlot(slot: string | undefined): LogoRole | undefined {
  return slot ? BY_SLOT.get(slot)?.role : undefined;
}

/** The canonical role → onboarding's slot key. */
export function slotForRole(role: LogoRole | undefined): string | undefined {
  return logoRoleDef(role)?.slot;
}

/** The ref a brand holds for a role, wherever the system files it. */
export function logoRefByRole(
  brand: { logoSystem?: LogoSystemRefs } | undefined,
  role: LogoRole,
): LogoRef | undefined {
  const ls = brand?.logoSystem;
  if (!ls) return undefined;
  switch (role) {
    case 'primary': return ls.primary;
    case 'secondary': return ls.secondary;
    case 'wordmark': return ls.wordmark;
    case 'iconmark': return ls.iconmark;
    case 'mono.black': return ls.mono?.black;
    case 'mono.white': return ls.mono?.white;
    case 'horizontal': return ls.orientations?.horizontal;
    case 'stacked': return ls.orientations?.stacked;
    default: return undefined;
  }
}
