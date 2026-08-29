// formatBriefs — what a deliverable IS, beyond its aspect ratio.
//
// Why this exists
// ───────────────
// The brief used to carry the format as two facts: a noun in the header line
// and a ratio string. Everything after them was identical, so an Instagram post
// and a billboard — a thing read at 12 cm on a phone in under two seconds, and a
// thing read at 80 m from a moving car — received the same instruction about
// hierarchy, type size, logo placement and word count. Twenty-five deliverables
// were recognised by name and then treated as one.
//
// A format is a set of CONVENTIONS, and they are the least negotiable part of
// any real brief: a billboard carries at most seven words; a business card has
// an information block; packaging has a face; a story must dodge the platform's
// own chrome. None of that is a creative choice, which is exactly why it belongs
// in code rather than in a model's discretion.
//
// This table is deterministic, free, and the single highest-leverage input to
// the brief. Adding a deliverable = one entry.

export interface FormatContract {
  /** How this piece is actually encountered. Sets the whole reading. */
  readAs: string;
  /** Layout archetypes that suit it. The first is the safe default. */
  archetypes: string[];
  /** Maximum words that may appear in the frame at all. */
  wordBudget: number;
  /** Logo size as a share of frame width, and which edge it belongs on. */
  logoScalePct: [number, number];
  logoEdge: string;
  /** Smallest type as a share of frame height — the legibility floor. */
  typeFloorPct: number;
  /** Regions that must stay clear, e.g. platform chrome. */
  safeAreas?: string;
  /** What this deliverable conventionally contains. */
  conventions: string[];
  /** The finish it should read as — printed, screen, painted, moulded. */
  finish: string;
}

/**
 * The fallback. Deliberately unopinionated: when we do not recognise the
 * deliverable it is better to say little than to impose a poster's grammar on
 * something that is not a poster.
 */
export const GENERIC_CONTRACT: FormatContract = {
  readAs: 'read close, with attention',
  archetypes: ['image-dominant with a type block', 'type-dominant over a field', 'split field'],
  wordBudget: 14,
  logoScalePct: [10, 14],
  logoEdge: 'a bottom corner',
  typeFloorPct: 3,
  conventions: ['one clear message', 'one focal point'],
  finish: 'a professionally finished piece, screen or print',
};

const CONTRACTS: Record<string, FormatContract> = {
  'instagram post': {
    readAs: 'read at about 150 px in a scrolling feed, in under two seconds',
    archetypes: ['image-dominant with a type block', 'split field', 'full-bleed with type reversed out of the subject', 'type-dominant over a field'],
    wordBudget: 12,
    logoScalePct: [10, 14],
    logoEdge: 'a bottom corner',
    typeFloorPct: 4.5,
    safeAreas: 'the composition must survive a centre crop to 1:1 in a profile grid; keep the subject off the exact centre so the crop stays interesting',
    conventions: ['one idea only', 'the headline readable at thumbnail size', 'the subject recognisable in silhouette'],
    finish: 'screen-native, clean, no print artefacts',
  },
  'instagram story': {
    readAs: 'read full-screen on a phone, held vertically, for three to five seconds',
    archetypes: ['full-bleed with type reversed out of the subject', 'stacked vertical column', 'type-dominant over a field'],
    wordBudget: 10,
    logoScalePct: [9, 12],
    logoEdge: 'the lower third, centred or left',
    typeFloorPct: 4,
    safeAreas: 'keep the top 12% and the bottom 20% free of anything important — the platform draws its own controls there',
    conventions: ['built on a vertical axis', 'one message', 'thumb-reachable action in the lower third'],
    finish: 'screen-native, high contrast',
  },
  'social post': {
    readAs: 'read small in a scrolling feed, in under two seconds',
    archetypes: ['image-dominant with a type block', 'split field', 'type-dominant over a field'],
    wordBudget: 12,
    logoScalePct: [10, 14],
    logoEdge: 'a bottom corner',
    typeFloorPct: 4.5,
    conventions: ['one idea only', 'readable at thumbnail size'],
    finish: 'screen-native, clean',
  },
  poster: {
    readAs: 'read from about two metres, on a wall, by someone walking past',
    archetypes: ['image-dominant with a bottom information band', 'type-dominant over a field', 'centred symmetrical', 'edge-anchored diagonal'],
    wordBudget: 16,
    logoScalePct: [8, 12],
    logoEdge: 'the bottom edge, in the information band',
    typeFloorPct: 3,
    conventions: ['one idea, one image', 'the headline set large enough to read across a room', 'secondary information gathered into a single band, not scattered'],
    finish: 'ink on uncoated paper — matte, slightly absorbed, no screen glow',
  },
  billboard: {
    readAs: 'read from 30 to 150 metres, in four to six seconds, often from a moving vehicle',
    archetypes: ['image two thirds with type one third on the horizontal axis', 'type-dominant over a flat field', 'edge-anchored with a single subject'],
    wordBudget: 7,
    logoScalePct: [7, 10],
    logoEdge: 'the trailing edge in the reading direction — the right side',
    typeFloorPct: 8,
    conventions: [
      'at most seven words in the entire frame',
      'one image, one message, no secondary information',
      'no detail smaller than 3% of the frame height — it will not survive the distance',
      'contrast built for daylight glare',
    ],
    finish: 'large-format print, flat and bold, no fine texture',
  },
  advert: {
    readAs: 'read once, quickly, in competition with everything around it',
    archetypes: ['image-dominant with a type block', 'type-dominant over a field', 'split field'],
    wordBudget: 14,
    logoScalePct: [9, 13],
    logoEdge: 'a bottom corner',
    typeFloorPct: 4,
    conventions: ['one proposition', 'the product or its result visible', 'a clear next step if one was supplied'],
    finish: 'commercial-grade finish, art-directed, not a stock photo',
  },
  'business card': {
    readAs: 'held in the hand at about 30 cm, turned over, kept or discarded',
    archetypes: ['mark-dominant with an information block', 'centred symmetrical', 'edge-anchored'],
    wordBudget: 18,
    logoScalePct: [18, 28],
    logoEdge: 'the optical centre or the leading edge',
    typeFloorPct: 5,
    conventions: ['the mark is the subject', 'information gathered in one block, never scattered', 'generous margins — a card with tight margins reads cheap'],
    finish: 'thick uncoated card stock, crisp impression, real paper edge',
  },
  'packaging design': {
    readAs: 'seen on a shelf among competitors, then held and turned',
    archetypes: ['face-forward product render', 'mark-dominant on a flat field', 'image-dominant with a type band'],
    wordBudget: 14,
    logoScalePct: [16, 26],
    logoEdge: 'the face, in the upper or optical centre',
    typeFloorPct: 4,
    conventions: ['a clear front face', 'the product name dominant', 'the mark placed as it would really be printed on the substrate'],
    finish: 'real substrate — carton, glass, foil or plastic — with correct material behaviour and shelf lighting',
  },
  signage: {
    readAs: 'read from across a street, in daylight and at night',
    archetypes: ['mark-dominant on a built surface', 'type-dominant over a field'],
    wordBudget: 8,
    logoScalePct: [20, 34],
    logoEdge: 'the centre of the sign face',
    typeFloorPct: 7,
    conventions: ['the mark or the name, and almost nothing else', 'physically plausible mounting and depth', 'legible against its real surroundings'],
    finish: 'fabricated signage — real materials, real shadow, real environment',
  },
  'merchandise design': {
    readAs: 'worn or carried, seen in motion at conversational distance',
    archetypes: ['mark-dominant centred', 'edge-anchored graphic', 'all-over pattern'],
    wordBudget: 8,
    logoScalePct: [18, 30],
    logoEdge: 'the chest or the centre of the printable area',
    typeFloorPct: 5,
    conventions: ['printable as flat colour', 'reads at a glance on a moving body', 'respects the garment or object it sits on'],
    finish: 'screen print or embroidery on real fabric, with the weave visible',
  },
  'presentation slide': {
    readAs: 'projected and read from the back of a room in about ten seconds',
    archetypes: ['type-dominant with a supporting image', 'split field', 'image-dominant with a caption'],
    wordBudget: 16,
    logoScalePct: [6, 9],
    logoEdge: 'a bottom corner, small',
    typeFloorPct: 4.5,
    conventions: ['one point per slide', 'nothing that needs to be squinted at', 'generous margins'],
    finish: 'screen-native, flat, projector-safe contrast',
  },
  flyer: {
    readAs: 'held at arm’s length, scanned in a few seconds, then kept or binned',
    archetypes: ['image-dominant with a bottom information band', 'type-dominant over a field', 'split field'],
    wordBudget: 20,
    logoScalePct: [9, 13],
    logoEdge: 'the bottom edge',
    typeFloorPct: 3.5,
    conventions: ['one offer or event', 'the essential information in one block'],
    finish: 'ink on paper, matte',
  },
  banner: {
    readAs: 'read in passing, on a wide horizontal strip',
    archetypes: ['type one third with image two thirds on the horizontal axis', 'type-dominant over a field'],
    wordBudget: 10,
    logoScalePct: [7, 11],
    logoEdge: 'the trailing edge',
    typeFloorPct: 8,
    conventions: ['built on a horizontal axis', 'very few words', 'nothing small'],
    finish: 'large-format print, flat and bold',
  },
  cover: {
    readAs: 'seen as a thumbnail first, then full size',
    archetypes: ['type-dominant over a field', 'image-dominant with a title block', 'centred symmetrical'],
    wordBudget: 10,
    logoScalePct: [8, 12],
    logoEdge: 'a corner, small',
    typeFloorPct: 5,
    conventions: ['the title dominant', 'survives being shrunk to a thumbnail'],
    finish: 'clean, considered, editorial',
  },
  thumbnail: {
    readAs: 'read at roughly 120 px wide, in a grid of competitors',
    archetypes: ['single subject, very tight crop', 'type-dominant over a field'],
    wordBudget: 5,
    logoScalePct: [8, 12],
    logoEdge: 'a corner',
    typeFloorPct: 10,
    conventions: ['at most a few enormous words', 'one high-contrast subject', 'nothing that disappears when shrunk'],
    finish: 'screen-native, saturated, very high contrast',
  },
  menu: {
    readAs: 'held and read carefully, in low light, for a minute or more',
    archetypes: ['stacked column with clear sections', 'split field'],
    wordBudget: 40,
    logoScalePct: [10, 16],
    logoEdge: 'the top, centred',
    typeFloorPct: 2.5,
    conventions: ['clear sections with real hierarchy', 'generous leading', 'legible in restaurant light'],
    finish: 'print on textured stock',
  },
  invitation: {
    readAs: 'held, read once, kept',
    archetypes: ['centred symmetrical', 'stacked column', 'mark-dominant'],
    wordBudget: 24,
    logoScalePct: [10, 16],
    logoEdge: 'the top, centred',
    typeFloorPct: 3,
    conventions: ['formal balance', 'generous margins', 'one decorative idea, not several'],
    finish: 'fine print on heavy stock',
  },
  letterhead: {
    readAs: 'seen at the top of a printed page, mostly ignored, never wrong',
    archetypes: ['mark-dominant header with an information rule'],
    wordBudget: 22,
    logoScalePct: [14, 22],
    logoEdge: 'the top left or top centre',
    typeFloorPct: 2.5,
    conventions: ['most of the page stays empty — it is for a letter', 'the mark and the contact block only'],
    finish: 'print on business paper',
  },
  'email signature': {
    readAs: 'read at the bottom of an email, small, on any client',
    archetypes: ['horizontal information block beside the mark'],
    wordBudget: 20,
    logoScalePct: [14, 22],
    logoEdge: 'the left, beside the text',
    typeFloorPct: 6,
    conventions: ['compact horizontal block', 'nothing decorative'],
    finish: 'screen-native, flat, tiny',
  },
  'landing page': {
    readAs: 'seen as a hero section at the top of a browser window',
    archetypes: ['split field', 'type-dominant with a product image', 'centred symmetrical'],
    wordBudget: 18,
    logoScalePct: [6, 10],
    logoEdge: 'the top left',
    typeFloorPct: 3.5,
    conventions: ['a headline, a supporting line and one action', 'a clear hero subject'],
    finish: 'screen-native web design, flat and current',
  },
  brochure: {
    readAs: 'held open, read section by section',
    archetypes: ['split field', 'image-dominant with a type block', 'stacked column'],
    wordBudget: 30,
    logoScalePct: [9, 14],
    logoEdge: 'a top or bottom corner',
    typeFloorPct: 2.5,
    conventions: ['clear sections', 'a real grid'],
    finish: 'print on coated stock',
  },
  certificate: {
    readAs: 'framed and read from a metre away',
    archetypes: ['centred symmetrical'],
    wordBudget: 30,
    logoScalePct: [12, 20],
    logoEdge: 'the top, centred',
    typeFloorPct: 3,
    conventions: ['formal symmetry', 'a clear name line', 'a border or rule that reads as authority'],
    finish: 'fine print on heavy stock',
  },
};

/** Longest-first aliasing so "instagram story" wins over "story". */
export function contractFor(deliverableNoun: string): FormatContract {
  return CONTRACTS[deliverableNoun.toLowerCase()] ?? GENERIC_CONTRACT;
}

/** True when we have real conventions for this noun, rather than the fallback. */
export function hasContract(deliverableNoun: string): boolean {
  return deliverableNoun.toLowerCase() in CONTRACTS;
}

export const CONTRACT_NOUNS = Object.keys(CONTRACTS);
