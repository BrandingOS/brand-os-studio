/**
 * Every card the Brand Kit offers, as `resolveLegacyCard` keys them.
 *
 * A plain module rather than a const inside a test, because two guards
 * and the contact-sheet generator all sweep the same set and a second
 * copy is a copy that drifts the first time a card is added.
 */
export const ALL_CARDS: Array<[string, string]> = [
  ['stationery', 'Business Card'],
  ['stationery', 'Letterhead'],
  ['stationery', 'Envelope'],
  ['stationery', 'Invoice'],
  ['social', 'Profile'],
  ['social', 'Cover'],
  ['social', 'Post'],
  ['social', 'Story'],
  ['web', 'Favicon'],
  ['web', 'Website'],
  ['web', 'Email Signature'],
  ['web', 'Landing Page'],
  ['brand-guides', 'Logo Guide'],
  ['brand-guides', 'Color Guide'],
  ['brand-guides', 'Typography Guide'],
  ['brand-guides', 'Voice Guide'],
  ['brand-guides', 'Imagery Guide'],
  ['presentations', 'Pitch Deck'],
  ['presentations', 'Business Plan'],
  ['presentations', 'Proposal'],
  ['presentations', 'Case Studies'],
  ['animations', 'Logo Reveal'],
  ['animations', 'Slide In'],
  ['animations', 'Fade'],
  ['animations', 'Rotate'],
  ['mockups', 'Signage'],
  ['mockups', 'Apparel'],
  ['mockups', 'Mug'],
  ['mockups', 'Tote'],
  ['mockups', 'Sticker'],
  ['mockups', 'Business Card Stack'],
  ['mockups', 'Device Screen'],
  ['mockups', 'Billboard'],
];

/** The cards whose designs carry a customer's own words. */
export const CONTENT_CARDS = ALL_CARDS.filter(([section]) =>
  ['stationery', 'social', 'web'].includes(section),
);
