import type { FamilyCuration } from './types';
import {
  ANIMATION_ARCHIVED_IDS,
  ANIMATION_NAMES,
  ANIMATION_TAGS,
} from '../AnimationsExtended';

/**
 * Owned by the animations family. Names, archived ids and tags — nothing else.
 *
 * Each of the four cards advertised thirty designs and held ten: the
 * template list was literally `[...stills, ...stills, ...stills]`, so a
 * customer browsing "Logo Reveal" was choosing between the same picture
 * three times over (`.audit/CODE.md` §7). The eighty duplicate ids
 * (`-ext-11` … `-ext-30` in each family) are ARCHIVED rather than deleted:
 * a template id is a persistence key, and someone who saved
 * `anim-fade-ext-23` must still be able to open their card.
 *
 * The three maps are READ FROM THE RENDERER rather than retyped here. A
 * design's name is part of the design — the file that draws "Curtain Wipe"
 * is the file that should say so — and a second hand-kept copy of forty
 * names and a hundred and twenty tags is a copy that drifts the first time
 * one is renamed.
 */
export const curation: FamilyCuration = {
  names: ANIMATION_NAMES,
  tags: ANIMATION_TAGS,
  archived: ANIMATION_ARCHIVED_IDS,
};
