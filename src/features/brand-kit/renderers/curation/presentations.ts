import type { FamilyCuration } from './types';

/**
 * Owned by the presentations family. Names, archived ids and tags — nothing else.
 *
 * ## Why 30 became 10
 *
 * `PresentationsExtended.tsx` held ten slides per deck and then wrote
 * `[...slides, ...slides, ...slides]`, so every family advertised thirty
 * variants and shipped ten. Tiles 11–20 and 21–30 were pixel-identical to
 * 1–10; a customer choosing between "Pitch 4", "Pitch 14" and "Pitch 24"
 * was choosing between three copies of the same slide.
 *
 * So twenty ids per family are archived. They are NOT deleted: a template
 * id is a persistence key (`brandos:brand-kit:state` and the kit's saved
 * customizations are filed under it), and an id that stops resolving is
 * somebody's saved work stopping resolving with it. Archived ids vanish
 * from the drilldown, the picker, the featured set and every export, and
 * stay valid for anything already pointing at them.
 *
 * ## Why the names read like a deck
 *
 * One variant is one SLIDE — `pres-pitch-ext-3` is slide three — so a
 * design name here names a slot in a document, the way a deck's own
 * outline does. The four families do not share a name list, because a
 * proposal's third page and a case study's third page are not the same
 * page: the slot is the same, what it is FOR is not.
 *
 * ## Tags
 *
 * Three per design, and the same three axes everywhere: the document
 * (Pitch · Plan · Proposal · Case study · Portfolio), the slot (Cover ·
 * Divider · Statement · List · Data · Closing), and the tone the family's
 * surfaces give it (Bold · Editorial · Document · Quiet). They feed the
 * drilldown's chip row, so they have to be worth filtering by.
 */

/** The ten slides a deck card keeps. Ids 11–30 are the tripled copies. */
const KEPT = 10;
const TOTAL = 30;

const FAMILIES = ['pres-pitch', 'pres-plan', 'pres-proposal', 'pres-case', 'pres-portfolio'] as const;

/** Slot names, in slide order, per family. */
const NAMES: Record<(typeof FAMILIES)[number], string[]> = {
  'pres-pitch': [
    'Cover',
    'Opening divider',
    'The one-line pitch',
    'Why we exist',
    'Offer divider',
    'What we make',
    "Who it's for",
    'Where we stand',
    'What we value',
    'Closing',
  ],
  'pres-plan': [
    'Cover',
    'Summary divider',
    'Executive summary',
    'Mission',
    'Operations divider',
    'Products and services',
    'Market and audience',
    'Positioning',
    'Operating principles',
    'Closing',
  ],
  'pres-proposal': [
    'Cover',
    'Introduction divider',
    'The brief in one line',
    'Why us',
    'Scope divider',
    'Scope of work',
    'Who it serves',
    'Our approach',
    'How we work',
    'Sign-off',
  ],
  'pres-case': [
    'Cover',
    'Context divider',
    'The client in one line',
    'Why it mattered',
    'Work divider',
    'What we made',
    'Who it reached',
    'The position it won',
    'What we held to',
    'Closing',
  ],
  'pres-portfolio': [
    'Cover',
    'Studio divider',
    'The studio in one line',
    'Why we make',
    'Work divider',
    'Selected work',
    'Who we work with',
    'Where we sit',
    'What we value',
    'Closing',
  ],
};

/** The slot each slide occupies, in slide order. Shared by every family. */
const SLOTS = [
  'Cover',
  'Divider',
  'Statement',
  'Statement',
  'Divider',
  'List',
  'Statement',
  'Statement',
  'List',
  'Closing',
];

const DOCUMENT: Record<(typeof FAMILIES)[number], string> = {
  'pres-pitch': 'Pitch',
  'pres-plan': 'Plan',
  'pres-proposal': 'Proposal',
  'pres-case': 'Case study',
  'pres-portfolio': 'Portfolio',
};

const TONE: Record<(typeof FAMILIES)[number], string> = {
  'pres-pitch': 'Bold',
  'pres-plan': 'Document',
  'pres-proposal': 'Editorial',
  'pres-case': 'Bold',
  'pres-portfolio': 'Quiet',
};

const names: Record<string, string> = {};
const tags: Record<string, string[]> = {};
const archived: string[] = [];

for (const family of FAMILIES) {
  NAMES[family].forEach((name, i) => {
    const id = `${family}-ext-${i + 1}`;
    names[id] = name;
    tags[id] = [DOCUMENT[family], SLOTS[i]!, TONE[family]];
  });
  for (let n = KEPT + 1; n <= TOTAL; n += 1) archived.push(`${family}-ext-${n}`);
}

export const curation: FamilyCuration = { names, tags, archived };

/** The ids a deck card shows, in order. Read by the Presentation System view. */
export function deckSlideIds(family: (typeof FAMILIES)[number]): string[] {
  return Array.from({ length: KEPT }, (_, i) => `${family}-ext-${i + 1}`);
}

/** The curated name of a deck slide, by family and 1-based position. */
export function deckSlideName(family: (typeof FAMILIES)[number], position: number): string {
  return NAMES[family][position - 1] ?? `Slide ${position}`;
}
