import type { FamilyCuration } from './types';

/**
 * Letterhead — twenty kept designs, one hundred and ten reserved ids.
 *
 * The family shipped 130 variants. `.audit/CODE.md` §2 measured what they
 * actually were: 128 of them bound exactly ONE of the letter kind's eight
 * fields, 100 were named by their generator ("Wave 2 · 43" — two of which
 * the kit FEATURED), and two rendered a page with nothing on it. The twenty
 * kept here are the distinct, readable, fully-bound ones.
 *
 * Kept ids keep their POSITION in the family, so `ext-6` is still the design
 * whose contacts sit in a heavy footer and `ext-1` is still the one with the
 * header band. `LetterheadExtended.tsx` records what each id used to be.
 *
 * Archived is not deleted. Every archived id stays reserved for ever — it is
 * the key a saved customization, a Design snapshot and an export filename are
 * written under — so nothing a customer saved is orphaned, and no future
 * design may claim one of these numbers.
 *
 * `tags` are industry · intent · style, and feed the drilldown filter chips.
 */
export const curation: FamilyCuration = {
  names: {
    'letterhead-ext-1': 'Header Bar',
    'letterhead-ext-2': 'Side Stripe',
    'letterhead-ext-3': 'Right Rail',
    'letterhead-ext-4': 'Rule Under',
    'letterhead-ext-5': 'Typewriter',
    'letterhead-ext-6': 'Bottom Block',
    'letterhead-ext-7': 'Ring Mark',
    'letterhead-ext-8': 'Diagonal Header',
    'letterhead-ext-9': 'Tinted Well',
    'letterhead-ext-10': 'Left Rail',
    'letterhead-ext-11': 'Two-Tone',
    'letterhead-ext-12': 'Framed',
    'letterhead-ext-13': 'Footer Column',
    'letterhead-ext-14': 'Display Subject',
    'letterhead-ext-15': 'Swiss Grid',
    'letterhead-ext-16': 'Corner Block',
    'letterhead-ext-17': 'Reversed',
    'letterhead-ext-18': 'Duo Band',
    'letterhead-ext-19': 'Editorial Masthead',
    'letterhead-ext-20': 'Stacked Masthead',
  },

  tags: {
    'letterhead-ext-1': ['Corporate', 'Announcement', 'Colour block'],
    'letterhead-ext-2': ['Agency', 'Correspondence', 'Colour block'],
    'letterhead-ext-3': ['Agency', 'Correspondence', 'Two column'],
    'letterhead-ext-4': ['Consulting', 'Correspondence', 'Minimal'],
    'letterhead-ext-5': ['Internal', 'Memo', 'Mono'],
    'letterhead-ext-6': ['Corporate', 'Announcement', 'Colour block'],
    'letterhead-ext-7': ['Studio', 'Correspondence', 'Geometric'],
    'letterhead-ext-8': ['Tech', 'Announcement', 'Geometric'],
    'letterhead-ext-9': ['Healthcare', 'Correspondence', 'Soft'],
    'letterhead-ext-10': ['Agency', 'Proposal', 'Two column'],
    'letterhead-ext-11': ['Retail', 'Announcement', 'Colour block'],
    'letterhead-ext-12': ['Hospitality', 'Invitation', 'Classic'],
    'letterhead-ext-13': ['Corporate', 'Correspondence', 'Structured'],
    'letterhead-ext-14': ['Consulting', 'Proposal', 'Editorial'],
    'letterhead-ext-15': ['Consulting', 'Correspondence', 'Minimal'],
    'letterhead-ext-16': ['Studio', 'Correspondence', 'Geometric'],
    'letterhead-ext-17': ['Tech', 'Announcement', 'Dark'],
    'letterhead-ext-18': ['Retail', 'Announcement', 'Colour block'],
    'letterhead-ext-19': ['Law', 'Correspondence', 'Classic'],
    'letterhead-ext-20': ['Hospitality', 'Invitation', 'Centred'],
  },

  /**
   * `ext-21` … `ext-30` are the ten wave-1 designs curation dropped — among
   * them the page framed by four brackets and nothing else, the ledger of
   * empty ruled lines, and the memo whose "TO · Team / RE · Quarterly Brief /
   * DATE 27 · 04 · 2026" header was three literals. `ext-31` … `ext-130` are
   * the whole of wave 2.
   */
  archived: [
    'letterhead-ext-21', 'letterhead-ext-22', 'letterhead-ext-23', 'letterhead-ext-24',
    'letterhead-ext-25', 'letterhead-ext-26', 'letterhead-ext-27', 'letterhead-ext-28',
    'letterhead-ext-29', 'letterhead-ext-30', 'letterhead-ext-31', 'letterhead-ext-32',
    'letterhead-ext-33', 'letterhead-ext-34', 'letterhead-ext-35', 'letterhead-ext-36',
    'letterhead-ext-37', 'letterhead-ext-38', 'letterhead-ext-39', 'letterhead-ext-40',
    'letterhead-ext-41', 'letterhead-ext-42', 'letterhead-ext-43', 'letterhead-ext-44',
    'letterhead-ext-45', 'letterhead-ext-46', 'letterhead-ext-47', 'letterhead-ext-48',
    'letterhead-ext-49', 'letterhead-ext-50', 'letterhead-ext-51', 'letterhead-ext-52',
    'letterhead-ext-53', 'letterhead-ext-54', 'letterhead-ext-55', 'letterhead-ext-56',
    'letterhead-ext-57', 'letterhead-ext-58', 'letterhead-ext-59', 'letterhead-ext-60',
    'letterhead-ext-61', 'letterhead-ext-62', 'letterhead-ext-63', 'letterhead-ext-64',
    'letterhead-ext-65', 'letterhead-ext-66', 'letterhead-ext-67', 'letterhead-ext-68',
    'letterhead-ext-69', 'letterhead-ext-70', 'letterhead-ext-71', 'letterhead-ext-72',
    'letterhead-ext-73', 'letterhead-ext-74', 'letterhead-ext-75', 'letterhead-ext-76',
    'letterhead-ext-77', 'letterhead-ext-78', 'letterhead-ext-79', 'letterhead-ext-80',
    'letterhead-ext-81', 'letterhead-ext-82', 'letterhead-ext-83', 'letterhead-ext-84',
    'letterhead-ext-85', 'letterhead-ext-86', 'letterhead-ext-87', 'letterhead-ext-88',
    'letterhead-ext-89', 'letterhead-ext-90', 'letterhead-ext-91', 'letterhead-ext-92',
    'letterhead-ext-93', 'letterhead-ext-94', 'letterhead-ext-95', 'letterhead-ext-96',
    'letterhead-ext-97', 'letterhead-ext-98', 'letterhead-ext-99', 'letterhead-ext-100',
    'letterhead-ext-101', 'letterhead-ext-102', 'letterhead-ext-103', 'letterhead-ext-104',
    'letterhead-ext-105', 'letterhead-ext-106', 'letterhead-ext-107', 'letterhead-ext-108',
    'letterhead-ext-109', 'letterhead-ext-110', 'letterhead-ext-111', 'letterhead-ext-112',
    'letterhead-ext-113', 'letterhead-ext-114', 'letterhead-ext-115', 'letterhead-ext-116',
    'letterhead-ext-117', 'letterhead-ext-118', 'letterhead-ext-119', 'letterhead-ext-120',
    'letterhead-ext-121', 'letterhead-ext-122', 'letterhead-ext-123', 'letterhead-ext-124',
    'letterhead-ext-125', 'letterhead-ext-126', 'letterhead-ext-127', 'letterhead-ext-128',
    'letterhead-ext-129', 'letterhead-ext-130',
  ],
};
