import type { FamilyCuration } from './types';

/**
 * Envelope — thirty designs offered, a hundred still archived.
 *
 * ## What the first pass did, and why it had to be undone
 *
 * The 2026-08 pass cut 130 variants to 16. Fourteen wave-1 ids went into
 * `archived` below — and the same commit deleted their drawings from
 * `EnvelopeExtended.tsx`'s `DESIGNS` record. Archiving is supposed to
 * HIDE an id, not empty it: measured 2026-09-09 through the real
 * dispatch, all fourteen were rendering design 0, so the card was
 * offering one picture under fifteen numbers and the record that they had
 * ever been anything else was this comment.
 *
 * ## The fourteen that are back
 *
 * Re-authored at their own reserved indices, in the bound architecture —
 * same ids, same anatomy, every word through `<Bind>`. The old names are
 * history; where the old IDEA was sound it is kept, and where the reason
 * for the cull was real the slot carries a different reading of the same
 * intent:
 *
 *   • **Kept the idea.** `ext-8` Diagonal Cut, `ext-11` Centred Mark,
 *     `ext-15` Brand Wash, `ext-17` Side Flap, `ext-18` Type Stack,
 *     `ext-23` Striped Edge, `ext-28` Big Mark, `ext-29` Mosaic Corner —
 *     each one now gives the address a block of its own first and takes
 *     what is left for the device.
 *   • **Changed the reading.** `ext-5` Wax Seal and `ext-13` Corner Seal
 *     put the seal on the closing edge and in the corner rather than over
 *     the address. `ext-10` Airmail Border makes the stripes a RING with
 *     flat paper inside, because the old border-image ran type over a
 *     repeating gradient. `ext-19` Brand Tape is square to the sheet and
 *     solid, for the same reason. `ext-22` Hand Ruled draws the hand in
 *     the RULING — the old one was welded to `Caveat, cursive`. `ext-24`
 *     Monogram Plate is a struck mark on elevated stock rather than a
 *     second copy of `ext-21`'s colour block.
 *
 * Where a restored design sits close to a kept sibling, its comment in
 * `EnvelopeExtended.tsx` names the sibling and says what differs.
 *
 * ## What stays archived, and why that is not the same mistake
 *
 * All hundred of wave 2 (`ext-31 … ext-130`). Generated, named by loop
 * index, "Jane Smith" in roughly seventy of them, 99 hardcoded hexes, and
 * ten of them were the "Pentagram" block this repo pasted into four
 * stationery families at once. Their artwork is gone too — every one of
 * them draws design 0 — so un-archiving them would put `Classic Return`
 * on the shelf a hundred more times under a hundred more names. Nothing
 * is hidden here that a customer cannot otherwise see.
 *
 * Archived ids remain valid persistence keys: a saved customization filed
 * under one still loads, and `variantsForCard` simply stops offering it.
 * Nothing here renumbers anything.
 *
 * `tags` are the drilldown's filter chips — style first, then intent.
 */
export const curation: FamilyCuration = {
  names: {
    'envelope-ext-1': 'Classic Return',
    'envelope-ext-2': 'Brand Band',
    'envelope-ext-3': 'Top Flap',
    'envelope-ext-4': 'Mono Minimal',
    'envelope-ext-5': 'Wax Seal',
    'envelope-ext-6': 'Window Frame',
    'envelope-ext-7': 'Stamp Panel',
    'envelope-ext-8': 'Diagonal Cut',
    'envelope-ext-9': 'Editorial Index',
    'envelope-ext-10': 'Airmail Border',
    'envelope-ext-11': 'Centred Mark',
    'envelope-ext-12': 'Half Colour',
    'envelope-ext-13': 'Corner Seal',
    'envelope-ext-14': 'Tracked Bar',
    'envelope-ext-15': 'Brand Wash',
    'envelope-ext-16': 'Postage Square',
    'envelope-ext-17': 'Side Flap',
    'envelope-ext-18': 'Type Stack',
    'envelope-ext-19': 'Brand Tape',
    'envelope-ext-20': 'Bordered',
    'envelope-ext-21': 'Initial Block',
    'envelope-ext-22': 'Hand Ruled',
    'envelope-ext-23': 'Striped Edge',
    'envelope-ext-24': 'Monogram Plate',
    'envelope-ext-25': 'Two Tone',
    'envelope-ext-26': 'Ticket Edge',
    'envelope-ext-27': 'Mono Address',
    'envelope-ext-28': 'Big Mark',
    'envelope-ext-29': 'Mosaic Corner',
    'envelope-ext-30': 'Subtle Lux',
  },
  tags: {
    'envelope-ext-1': ['Minimal', 'Corporate', 'Everyday'],
    'envelope-ext-2': ['Bold', 'Retail', 'Direct mail'],
    'envelope-ext-3': ['Bold', 'Studio', 'Invitation'],
    'envelope-ext-4': ['Minimal', 'Professional services'],
    'envelope-ext-5': ['Lux', 'Hospitality', 'Invitation'],
    'envelope-ext-6': ['Modern', 'Finance', 'Statement'],
    'envelope-ext-7': ['Bold', 'Logistics', 'Direct mail'],
    'envelope-ext-8': ['Bold', 'Studio', 'Announcement'],
    'envelope-ext-9': ['Editorial', 'Publishing'],
    'envelope-ext-10': ['Editorial', 'Events', 'Direct mail'],
    'envelope-ext-11': ['Minimal', 'Studio', 'Invitation'],
    'envelope-ext-12': ['Bold', 'Retail', 'Announcement'],
    'envelope-ext-13': ['Modern', 'Professional services', 'Everyday'],
    'envelope-ext-14': ['Modern', 'Logistics', 'Statement'],
    'envelope-ext-15': ['Bold', 'Retail', 'Direct mail'],
    'envelope-ext-16': ['Modern', 'Studio', 'Everyday'],
    'envelope-ext-17': ['Bold', 'Events', 'Invitation'],
    'envelope-ext-18': ['Editorial', 'Publishing', 'Announcement'],
    'envelope-ext-19': ['Modern', 'Logistics', 'Direct mail'],
    'envelope-ext-20': ['Minimal', 'Hospitality', 'Invitation'],
    'envelope-ext-21': ['Bold', 'Studio', 'Announcement'],
    'envelope-ext-22': ['Minimal', 'Events', 'Invitation'],
    'envelope-ext-23': ['Modern', 'Technology', 'Everyday'],
    'envelope-ext-24': ['Lux', 'Professional services', 'Statement'],
    'envelope-ext-25': ['Bold', 'Technology'],
    'envelope-ext-26': ['Modern', 'Events', 'Invitation'],
    'envelope-ext-27': ['Minimal', 'Technology', 'Statement'],
    'envelope-ext-28': ['Bold', 'Technology', 'Announcement'],
    'envelope-ext-29': ['Modern', 'Retail', 'Everyday'],
    'envelope-ext-30': ['Lux', 'Hospitality', 'Invitation'],
  },
  archived: [
    // Wave 2 — all hundred. Generated, and their artwork is gone: every
    // one of them draws design 0, which the kit already offers as
    // `envelope-ext-1`.
    ...Array.from({ length: 100 }, (_, i) => `envelope-ext-${i + 31}`),
  ],
};
