/**
 * Naming a logo dropped into Setup, by looking at it.
 *
 * The same detector onboarding uses, and deliberately the same one rather than
 * a second opinion: a file that the review called the wordmark must not become
 * "Logo" the moment it is uploaded from Setup instead. `artwork.ts` answers two
 * questions about the picture — what it is made of, and how the pieces sit —
 * and those answers name the role:
 *
 *     a symbol on its own          the icon
 *     the name set as type         the wordmark
 *     symbol beside the name       the primary logo
 *     symbol above the name        the vertical lockup
 *     light artwork                made for dark grounds
 *
 * Tone is checked FIRST because it describes the variant rather than the
 * composition: a white copy of the primary logo is still a symbol beside a
 * name, and calling it Primary would put it in the slot its dark twin holds.
 *
 * A role another tile already holds is not taken from it — the upload falls
 * through to the next free role, and to `Alternate` when the board is full.
 * Re-classification never overwrites a placement, here or in onboarding.
 */
import { readArtwork } from '@/features/onboarding/understanding/artwork';
import { roleFromArtwork } from '@/features/onboarding/understanding/logoClassify';
import { LOGO_ROLES } from '../components/SetupBoard';

/** Onboarding's slot vocabulary → the tile ids this board uses. */
const SLOT_TO_TILE: Record<string, string> = {
  primary: 'primary',
  wordmark: 'wordmark',
  mark: 'mark',
  vertical: 'vertical',
  horizontal: 'horizontal',
  dark: 'on-dark',
};

export interface ClassifiedLogo {
  id: string;
  label: string;
  variant: 'light' | 'dark';
  role: (typeof LOGO_ROLES)[number]['role'];
}

/** The role for a tile id, or the fallback when nothing fits. */
function roleById(id: string): ClassifiedLogo {
  const r = LOGO_ROLES.find((x) => x.id === id) ?? LOGO_ROLES[0];
  return { id: r.id, label: r.label, variant: r.variant, role: r.role };
}

/**
 * What the picture says this is — the slow half, done once per upload.
 *
 * Split from the placement below because reading is asynchronous (it renders
 * to a canvas) while "which slots are free" is only knowable at the moment of
 * the write. Deciding both at once meant answering the second question from a
 * board that had already moved on.
 *
 * Never throws: an unreadable picture is still a logo.
 */
export async function readLogoRole(url: string): Promise<string | undefined> {
  try {
    const art = await readArtwork(url);
    // Tone names the VARIANT rather than the composition: a white copy of the
    // primary logo is still a symbol beside a name, and calling it Primary
    // would put it in the slot its dark twin holds.
    if (art?.tone === 'light') return 'on-dark';
    const role = roleFromArtwork(art);
    return role ? SLOT_TO_TILE[role.slot] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Where it goes, given what the board already holds.
 *
 * A role another tile holds is not taken from it — the upload falls through to
 * the next free role, and to `Alternate` when the board is full.
 * Re-classification never overwrites a placement, here or in onboarding.
 */
export function placeLogo(wanted: string | undefined, taken: ReadonlySet<string>): ClassifiedLogo {
  if (wanted && !taken.has(wanted)) return roleById(wanted);
  const free = LOGO_ROLES.find((r) => !taken.has(r.id));
  return roleById(free?.id ?? 'alternate');
}
