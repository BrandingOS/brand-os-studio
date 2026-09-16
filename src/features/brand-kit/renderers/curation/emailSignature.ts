import type { FamilyCuration } from './types';
import {
  EMAIL_SIG_ARCHIVED_IDS,
  EMAIL_SIG_NAMES,
  EMAIL_SIG_TAGS,
} from '../WebEmailSignatureExtended';

/**
 * Owned by the emailSignature family. Names, archived ids and tags — nothing else.
 *
 * Thirty generated designs became sixteen signature blocks, and the
 * fourteen culled ids (`email-sig-ext-17..30`) were archived. Archiving
 * them also deleted their artwork, so each of the fourteen rendered
 * design 1 under its own number — a hidden id that drew a picture already
 * on the shelf. They have been re-authored at those same indices, so the
 * family is thirty designs again and `archived` is empty. The ids never
 * moved, which is the point: a saved customization still resolves.
 *
 * The three maps are READ FROM THE RENDERER rather than retyped here. A
 * design's name is part of the design — the file that draws "Reverse
 * Panel" is the file that should say so — and a second hand-kept copy of
 * thirty names and ninety tags is a copy that drifts the first time one is
 * renamed. `curation/index.ts` still sees a plain `FamilyCuration`, so
 * nothing downstream knows or cares.
 */
export const curation: FamilyCuration = {
  names: EMAIL_SIG_NAMES,
  tags: EMAIL_SIG_TAGS,
  archived: EMAIL_SIG_ARCHIVED_IDS,
};
