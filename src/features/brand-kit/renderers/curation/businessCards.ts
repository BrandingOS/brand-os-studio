import type { FamilyCuration } from './types';
import { BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS } from '../BusinessCardsExtended2';

/**
 * Owned by the businessCards family. Names, archived ids and tags — nothing
 * else.
 *
 * The family shipped 130 variants and offers 24. What was culled, and why:
 *
 *   • **The legacy twelve** (`business-cards-1` … `-12`) were nine designs
 *     shown by `templateIndex % 9`, seven of them printing the same
 *     invented person — "Jane Smith", "Vice President", "+1 234 56789",
 *     "jane@<brand>.com". They reach the artwork through
 *     `renderTemplateDesign`, which carries no content, so nothing a
 *     customer typed could ever appear on one. See
 *     `brandkit/components/renderers/BusinessCardRenderer.tsx`.
 *   • **94 of the hundred in Wave 2** (`business-cards-ext-25` …
 *     `-ext-118`). They were generated in one function body from
 *     `brand.name`: `.audit/CODE.md` §2 counted ~55 printing the string
 *     "VP" OVER the bound job title, five tiling the letters "JN / SM /
 *     XX", one printing `> jane_smith`, one an issue number "N° 013", and
 *     one a founding year computed from the LENGTH of the brand's name.
 *     They reached the picker as "Wave 2 · 95" — and one of them,
 *     `-ext-113`, was FEATURED on the Brand Kit page. The six that stayed
 *     (`-ext-19` … `-ext-24`) were rebuilt from Wave 1's machinery; they
 *     keep their ids and nothing of their old artwork.
 *
 * Archiving, not deleting: every id above stays a valid persistence key, so
 * a customer who saved a customization against one still has it, and the
 * `-ext-N` → design index arithmetic in `renderers/index.tsx` is untouched.
 */
export const curation: FamilyCuration = {
  archived: [
    ...Array.from({ length: 12 }, (_, i) => `business-cards-${i + 1}`),
    ...BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS,
  ],

  names: {
    'business-cards-ext-1': 'Editorial Rule',
    'business-cards-ext-2': 'Colour Block',
    'business-cards-ext-3': 'Brute Slab',
    'business-cards-ext-4': 'Soft Layer',
    'business-cards-ext-5': 'Centre Stack',
    'business-cards-ext-6': 'Corner Mark',
    'business-cards-ext-7': 'Full Brand',
    'business-cards-ext-8': 'Drafting Grid',
    'business-cards-ext-9': 'Spine',
    'business-cards-ext-10': 'Base Band',
    'business-cards-ext-11': 'Monogram Tile',
    'business-cards-ext-12': 'Ledger',
    'business-cards-ext-13': 'Seal',
    'business-cards-ext-14': 'Banner',
    'business-cards-ext-15': 'Quiet Type',
    'business-cards-ext-16': 'Duo Tone',
    'business-cards-ext-17': 'Framed',
    'business-cards-ext-18': 'Tag',
    'business-cards-ext-19': 'Diagonal Cut',
    'business-cards-ext-20': 'Contact Rail',
    'business-cards-ext-21': 'Centre Split',
    'business-cards-ext-22': 'Three Panels',
    'business-cards-ext-23': 'Perforation',
    'business-cards-ext-24': 'Edge Type',
  },

  /**
   * Three chips per design: the trade it suits, who on the team hands it
   * over, and how it looks. `Studio` / `Agency` / `Tech` / `Retail` /
   * `Trades` / `Legal` / `Hospitality` are the industry read; `Founder`,
   * `Executive`, `Team`, `Freelance`, `Client-facing` the intent.
   */
  tags: {
    'business-cards-ext-1': ['Studio', 'Executive', 'Editorial'],
    'business-cards-ext-2': ['Agency', 'Team', 'Modern'],
    'business-cards-ext-3': ['Tech', 'Founder', 'Bold'],
    'business-cards-ext-4': ['Hospitality', 'Client-facing', 'Warm'],
    'business-cards-ext-5': ['Legal', 'Executive', 'Classic'],
    'business-cards-ext-6': ['Studio', 'Freelance', 'Minimal'],
    'business-cards-ext-7': ['Retail', 'Team', 'Bold'],
    'business-cards-ext-8': ['Trades', 'Team', 'Technical'],
    'business-cards-ext-9': ['Agency', 'Team', 'Modern'],
    'business-cards-ext-10': ['Retail', 'Client-facing', 'Bold'],
    'business-cards-ext-11': ['Studio', 'Founder', 'Modern'],
    'business-cards-ext-12': ['Trades', 'Freelance', 'Technical'],
    'business-cards-ext-13': ['Legal', 'Executive', 'Lux'],
    'business-cards-ext-14': ['Retail', 'Team', 'Bold'],
    'business-cards-ext-15': ['Studio', 'Freelance', 'Minimal'],
    'business-cards-ext-16': ['Agency', 'Client-facing', 'Modern'],
    'business-cards-ext-17': ['Hospitality', 'Executive', 'Lux'],
    'business-cards-ext-18': ['Tech', 'Team', 'Modern'],
    'business-cards-ext-19': ['Tech', 'Founder', 'Bold'],
    'business-cards-ext-20': ['Agency', 'Client-facing', 'Modern'],
    'business-cards-ext-21': ['Legal', 'Team', 'Minimal'],
    'business-cards-ext-22': ['Retail', 'Client-facing', 'Modern'],
    'business-cards-ext-23': ['Hospitality', 'Client-facing', 'Editorial'],
    'business-cards-ext-24': ['Studio', 'Founder', 'Lux'],
  },
};
