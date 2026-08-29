import type { FamilyCuration } from './types';

/**
 * Notecard — 130 variants curated down to 12.
 *
 * The whole of wave 2 goes, for the reasons its own file records. Of
 * wave 1's thirty, eighteen go: the ones whose idea was a texture rather
 * than a card (Confetti, Stripes Pattern, Soft Gradient, Brand Glow, Half
 * Tone, Brushstroke), the ones that were a decoration with no room for a
 * message (Floral Frame, Colour Swatches, Twin Initials, Pen Nib, Big
 * Period, Letter Stack), the ones that invented facts a note does not
 * have — a date (Calendar Day), an issue number and a ticket stub
 * (Ticket), a bookplate (Ex Libris), a banner (Folded Banner) — and
 * Hand-Drawn and Diagonal Stripe, drawn in `Caveat, cursive` and in a
 * gradient nothing could be read against.
 *
 * The twelve kept are the ones where the three things a note actually
 * contains — a greeting, a message and a sign-off — have somewhere to go.
 *
 * Archived ids stay reserved. Nothing here renumbers anything.
 */
export const curation: FamilyCuration = {
  names: {
    'notecard-ext-1': 'Centred Mark',
    'notecard-ext-2': 'Open Greeting',
    'notecard-ext-3': 'Colour Block',
    'notecard-ext-5': 'Embossed Initial',
    'notecard-ext-8': 'Folded Edge',
    'notecard-ext-10': 'Postcard Stripe',
    'notecard-ext-15': 'Window Cut',
    'notecard-ext-18': 'Pull Quote',
    'notecard-ext-19': 'Round Frame',
    'notecard-ext-23': 'Card Wrap',
    'notecard-ext-25': 'Colour Wedge',
    'notecard-ext-30': 'Solid Brand',
  },
  tags: {
    'notecard-ext-1': ['Minimal', 'Hospitality', 'Thank you'],
    'notecard-ext-2': ['Editorial', 'Studio', 'Welcome'],
    'notecard-ext-3': ['Bold', 'Retail', 'With order'],
    'notecard-ext-5': ['Lux', 'Hospitality', 'Thank you'],
    'notecard-ext-8': ['Minimal', 'Professional services'],
    'notecard-ext-10': ['Bold', 'Retail', 'With order'],
    'notecard-ext-15': ['Modern', 'Events', 'Invitation'],
    'notecard-ext-18': ['Editorial', 'Publishing', 'Welcome'],
    'notecard-ext-19': ['Lux', 'Events', 'Invitation'],
    'notecard-ext-23': ['Modern', 'Retail', 'Thank you'],
    'notecard-ext-25': ['Bold', 'Studio', 'Announcement'],
    'notecard-ext-30': ['Bold', 'Technology', 'Welcome'],
  },
  archived: [
    // Wave 1 — texture, decoration, or an invented fact.
    'notecard-ext-4',
    'notecard-ext-6',
    'notecard-ext-7',
    'notecard-ext-9',
    'notecard-ext-11',
    'notecard-ext-12',
    'notecard-ext-13',
    'notecard-ext-14',
    'notecard-ext-16',
    'notecard-ext-17',
    'notecard-ext-20',
    'notecard-ext-21',
    'notecard-ext-22',
    'notecard-ext-24',
    'notecard-ext-26',
    'notecard-ext-27',
    'notecard-ext-28',
    'notecard-ext-29',
    // Wave 2 — all hundred.
    ...Array.from({ length: 100 }, (_, i) => `notecard-ext-${i + 31}`),
  ],
};
