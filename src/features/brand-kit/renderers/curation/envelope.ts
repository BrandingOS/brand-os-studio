import type { FamilyCuration } from './types';

/**
 * Envelope — 130 variants curated down to 16.
 *
 * What was culled, and why:
 *
 *   • **All hundred of wave 2** (`ext-31 … ext-130`). Generated, named by
 *     loop index, "Jane Smith" in roughly seventy of them, 99 hardcoded
 *     hexes, and ten of them were the "Pentagram" block this repo pasted
 *     into four stationery families at once.
 *   • **Fourteen of wave 1.** Three groups: designs whose whole idea was a
 *     decoration with nowhere to put an address (Wax Sealed, Sealed
 *     Sticker, Centered Mark, Logo Big, Mosaic); designs that repeated one
 *     already kept better (Triangle Flap ≈ Top Flap, Stripes Corner ≈
 *     Postage Square, Embossed Initial ≈ Big Initial, Brand Wash ≈ Half
 *     Color); and designs that could not be made to read — Vintage
 *     Airmail's border-image stripes and Brand Tape's rotated strip both
 *     ran type over a repeating gradient, Hand-Drawn was drawn in
 *     `Caveat, cursive`, and Type Stack spelled the brand name vertically
 *     one letter per line, which is not a name, it is a column of letters.
 *
 * Archived ids are still valid persistence keys: a saved customization
 * filed under one loads, and `variantsForCard` simply stops offering it.
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
    'envelope-ext-6': 'Window Frame',
    'envelope-ext-7': 'Stamp Panel',
    'envelope-ext-9': 'Editorial Index',
    'envelope-ext-12': 'Half Colour',
    'envelope-ext-14': 'Tracked Bar',
    'envelope-ext-16': 'Postage Square',
    'envelope-ext-20': 'Bordered',
    'envelope-ext-21': 'Initial Block',
    'envelope-ext-25': 'Two Tone',
    'envelope-ext-26': 'Ticket Edge',
    'envelope-ext-27': 'Mono Address',
    'envelope-ext-30': 'Subtle Lux',
  },
  tags: {
    'envelope-ext-1': ['Minimal', 'Corporate', 'Everyday'],
    'envelope-ext-2': ['Bold', 'Retail', 'Direct mail'],
    'envelope-ext-3': ['Bold', 'Studio', 'Invitation'],
    'envelope-ext-4': ['Minimal', 'Professional services'],
    'envelope-ext-6': ['Modern', 'Finance', 'Statement'],
    'envelope-ext-7': ['Bold', 'Logistics', 'Direct mail'],
    'envelope-ext-9': ['Editorial', 'Publishing'],
    'envelope-ext-12': ['Bold', 'Retail', 'Announcement'],
    'envelope-ext-14': ['Modern', 'Logistics', 'Statement'],
    'envelope-ext-16': ['Modern', 'Studio', 'Everyday'],
    'envelope-ext-20': ['Minimal', 'Hospitality', 'Invitation'],
    'envelope-ext-21': ['Bold', 'Studio', 'Announcement'],
    'envelope-ext-25': ['Bold', 'Technology'],
    'envelope-ext-26': ['Modern', 'Events', 'Invitation'],
    'envelope-ext-27': ['Minimal', 'Technology', 'Statement'],
    'envelope-ext-30': ['Lux', 'Hospitality', 'Invitation'],
  },
  archived: [
    // Wave 1 — decoration with no room for an address, duplicates of a
    // better sibling, or type that could not be made to read.
    'envelope-ext-5',
    'envelope-ext-8',
    'envelope-ext-10',
    'envelope-ext-11',
    'envelope-ext-13',
    'envelope-ext-15',
    'envelope-ext-17',
    'envelope-ext-18',
    'envelope-ext-19',
    'envelope-ext-22',
    'envelope-ext-23',
    'envelope-ext-24',
    'envelope-ext-28',
    'envelope-ext-29',
    // Wave 2 — all hundred.
    ...Array.from({ length: 100 }, (_, i) => `envelope-ext-${i + 31}`),
  ],
};
