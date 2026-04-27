/**
 * EditContext — wraps the deck tree so any descendant `<SlotText>` /
 * `<SlotImage>` / future block primitive can write back into the deck
 * store without each layout having to thread setters through props.
 *
 * The context exposes:
 *   - `enabled`: when falsy, primitives render in present mode (no
 *     contentEditable, no picker triggers). DeckRenderer's `mode` prop
 *     is the user-facing knob; the context just reflects it for the
 *     leaf primitives.
 *   - `setBlock(slideId, slotId, block)`: updates a single block on
 *     a slide. Slot wrappers capture (slideId, slotId) from the
 *     LayoutComponentProps and call this with the new Block.
 *
 * Phase 5 will add a top-bar Edit/Present toggle that flips
 * `enabled` and the deck-renderer mode together.
 */

import { createContext, useContext } from 'react';
import type { Block, SlotId } from '../types';

export interface EditContextValue {
  /** When falsy, components render in present mode. */
  enabled: boolean;
  /** Update a single block. The slide id is captured in the slot wrapper. */
  setBlock: (slideId: string, slotId: SlotId, block: Block) => void;
}

const EditCtx = createContext<EditContextValue | null>(null);

export const EditContextProvider = EditCtx.Provider;

export function useEditContext(): EditContextValue | null {
  return useContext(EditCtx);
}
