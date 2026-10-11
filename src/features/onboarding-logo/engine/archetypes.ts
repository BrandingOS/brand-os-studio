/**
 * The direction library.
 *
 * A direction is a strategist's POSITION, not a colour scheme: what the brand
 * should feel like, and every visual and verbal choice that follows from it.
 * Each archetype states what it is good for (industries, personalities,
 * positions, the kind of mark it flatters) so the generator can rank them
 * against the owner's answers and the logo read — and so every rationale it
 * writes can name the reason instead of reciting adjectives.
 *
 * Adding a direction = one entry here. Typefaces are Google families, loaded
 * on demand by `loadFontFamily`.
 */
import type { CornerStyle, Geometry, PatternKind, ShapeMotif, TypePairing, Weight } from '../model/types';
import type { PaletteSpec } from './palette';

export interface VoiceSeed {
  tone: string;
  principles: Array<{ title: string; detail: string }>;
  doList: string[];
  dontList: string[];
  /** `{name}`, `{industry}`, `{audience}` are filled in. */
  samples: string[];
}

export interface Archetype {
  id: string;
  name: string;
  essence: string;
  palette: PaletteSpec;
  pairings: TypePairing[];
  corner: CornerStyle;
  motif: ShapeMotif;
  patterns: PatternKind[];
  descriptors: string[];
  contrast: 'low' | 'medium' | 'high';
  density: 'tight' | 'balanced' | 'airy';
  fits: {
    industries: string[];
    personality: string[];
    positioning: string[];
    audience: string[];
    geometry: Geometry[];
    weight: Weight[];
    neutralLover?: boolean;
  };
  /** How a fit is phrased in the rationale. */
  feel: string;
  voice: VoiceSeed;
}

const P = (heading: string, body: string, headingWeight = 600): TypePairing => ({ heading, body, headingWeight });

export const ARCHETYPES: Archetype[] = [
  {
    id: 'quiet-authority',
    name: 'Quiet Authority',
    essence: 'Assured, considered, built to be trusted for decades.',
    palette: {
      hues: [218, 205, 160, 232],
      sat: [38, 55],
      light: [24, 32],
      secondary: { dh: 0, s: 28, l: 62 },
      accent: { h: 40, s: 62, l: 54 },
      anchorRole: 'primary',
    },
    pairings: [P('Libre Baskerville', 'Inter', 700), P('Playfair Display', 'Source Sans 3'), P('Cormorant Garamond', 'Inter'), P('Inter', 'Inter', 700)],
    corner: 'sharp',
    motif: 'line',
    patterns: ['grid', 'rings', 'mark', 'diagonal'],
    descriptors: ['classic', 'corporate', 'elegant'],
    contrast: 'high',
    density: 'balanced',
    fits: {
      industries: ['finance', 'legal', 'professional-services', 'real-estate', 'construction', 'energy'],
      personality: ['professional', 'trustworthy', 'authoritative', 'reliable', 'sophisticated'],
      positioning: ['premium', 'market-leader', 'heritage', 'specialist'],
      audience: ['professionals', 'enterprise', 'institutions', 'luxury-buyers'],
      geometry: ['geometric', 'balanced'],
      weight: ['regular', 'heavy'],
    },
    feel: 'steady and credible',
    voice: {
      tone: 'formal',
      principles: [
        { title: 'Precise, never pompous', detail: 'Say exactly what is true. Confidence comes from accuracy, not adjectives.' },
        { title: 'Earned calm', detail: 'Short sentences, no exclamation marks. Let the record speak.' },
        { title: 'Respect the reader’s time', detail: 'Lead with the answer, then the reasoning.' },
      ],
      doList: ['Use plain, exact language', 'Cite specifics — numbers, dates, outcomes', 'Write in complete sentences'],
      dontList: ['Hype words (“revolutionary”, “game-changing”)', 'Exclamation marks', 'Slang or emoji'],
      samples: ['{name}. Clarity you can build on.', 'Every decision, accounted for.', 'Trusted by {audience} who cannot afford to guess.'],
    },
  },
  {
    id: 'precision-tech',
    name: 'Precision',
    essence: 'Clear, engineered and quietly brilliant.',
    palette: {
      hues: [212, 196, 228, 250],
      sat: [70, 86],
      light: [44, 52],
      secondary: { dh: -24, s: 78, l: 72 },
      accent: { dh: 150, s: 82, l: 52 },
      anchorRole: 'primary',
    },
    pairings: [P('Space Grotesk', 'Inter'), P('Manrope', 'Manrope', 700), P('IBM Plex Sans', 'IBM Plex Sans'), P('Sora', 'Inter')],
    corner: 'rounded',
    motif: 'block',
    patterns: ['dots', 'grid', 'mark', 'rings'],
    descriptors: ['modern', 'technical', 'minimal'],
    contrast: 'medium',
    density: 'balanced',
    fits: {
      industries: ['technology', 'saas', 'finance', 'logistics', 'energy', 'manufacturing', 'automotive'],
      personality: ['innovative', 'reliable', 'professional', 'confident'],
      positioning: ['innovator', 'specialist', 'market-leader'],
      audience: ['developers', 'startups', 'small-business', 'enterprise', 'professionals', 'early-adopters'],
      geometry: ['geometric'],
      weight: ['regular', 'heavy'],
    },
    feel: 'clear and engineered',
    voice: {
      tone: 'direct',
      principles: [
        { title: 'Show the mechanism', detail: 'Explain how it works, not just that it works.' },
        { title: 'Plain over clever', detail: 'If a smart line needs a second read, rewrite it.' },
        { title: 'Confident by default', detail: 'State capabilities without hedging; quantify where you can.' },
      ],
      doList: ['Use active verbs', 'Name the outcome in the first line', 'Prefer numbers to adjectives'],
      dontList: ['Jargon for its own sake', 'Vague promises (“powerful”, “seamless”)', 'Passive voice'],
      samples: ['{name} does the hard part.', 'Built for {audience}. Measured in minutes saved.', 'Fewer steps. Better answers.'],
    },
  },
  {
    id: 'electric-challenger',
    name: 'Electric Challenger',
    essence: 'Loud on purpose. The brand that changes the category’s mind.',
    palette: {
      hues: [264, 8, 150, 330, 22],
      sat: [80, 94],
      light: [50, 56],
      secondary: { dh: 0, s: 30, l: 13 },
      accent: { dh: 110, s: 90, l: 60 },
      anchorRole: 'primary',
    },
    pairings: [P('Archivo Black', 'Archivo', 400), P('Syne', 'Inter', 700), P('Bricolage Grotesque', 'Inter', 700), P('Space Grotesk', 'Space Grotesk', 700)],
    corner: 'pill',
    motif: 'diagonal',
    patterns: ['diagonal', 'confetti', 'mark', 'dots'],
    descriptors: ['bold', 'modern', 'futuristic'],
    contrast: 'high',
    density: 'tight',
    fits: {
      industries: ['technology', 'saas', 'media', 'entertainment', 'fitness', 'marketing', 'fashion', 'food-beverage'],
      personality: ['bold', 'confident', 'innovative', 'creative', 'playful'],
      positioning: ['challenger', 'innovator', 'accessible'],
      audience: ['young-adults', 'early-adopters', 'creatives', 'startups', 'consumers'],
      geometry: ['geometric', 'balanced'],
      weight: ['heavy'],
    },
    feel: 'loud and certain',
    voice: {
      tone: 'energetic',
      principles: [
        { title: 'Pick a fight with the status quo', detail: 'Name what is broken in the category, then show the alternative.' },
        { title: 'Short. Then shorter.', detail: 'Headlines under seven words. Rhythm over explanation.' },
        { title: 'Swagger with substance', detail: 'Every bold claim gets a proof point right behind it.' },
      ],
      doList: ['Write punchy, rhythmic headlines', 'Use direct address (“you”)', 'Back claims with proof'],
      dontList: ['Corporate filler', 'Long preambles', 'Apologising for being different'],
      samples: ['Meet {name}. Finally.', 'The {industry} you were promised.', 'Less waiting. More {name}.'],
    },
  },
  {
    id: 'warm-craft',
    name: 'Warm Craft',
    essence: 'Made by hand, with care you can feel.',
    palette: {
      hues: [18, 28, 38, 8],
      sat: [52, 68],
      light: [44, 52],
      secondary: { dh: 158, s: 24, l: 34 },
      accent: { dh: 24, s: 74, l: 68 },
      anchorRole: 'primary',
    },
    pairings: [P('Fraunces', 'DM Sans'), P('DM Serif Display', 'DM Sans', 400), P('Lora', 'Nunito Sans'), P('Young Serif', 'Inter', 400)],
    corner: 'soft',
    motif: 'blob',
    patterns: ['dots', 'waves', 'mark', 'confetti'],
    descriptors: ['artisanal', 'organic', 'classic'],
    contrast: 'medium',
    density: 'airy',
    fits: {
      industries: ['food-beverage', 'hospitality', 'beauty', 'retail', 'agriculture', 'fashion'],
      personality: ['warm', 'friendly', 'approachable', 'creative'],
      positioning: ['boutique', 'heritage', 'sustainable', 'everyday'],
      audience: ['consumers', 'families', 'local-community', 'creatives'],
      geometry: ['organic', 'balanced'],
      weight: ['regular', 'heavy', 'light'],
    },
    feel: 'warm and hand-made',
    voice: {
      tone: 'warm',
      principles: [
        { title: 'Talk like the maker', detail: 'First person, specific details about how things are made.' },
        { title: 'Generous, not gushing', detail: 'Warmth comes from specifics, not superlatives.' },
        { title: 'Invite, don’t sell', detail: 'Write as if welcoming someone in.' },
      ],
      doList: ['Use sensory, specific detail', 'Write in first person (“we”)', 'Credit the people behind it'],
      dontList: ['Cold corporate phrasing', 'Pushy urgency (“Buy now!”)', 'Generic praise (“amazing quality”)'],
      samples: ['Made slowly, at {name}.', 'Good things take a little longer.', 'For {audience} who notice the details.'],
    },
  },
  {
    id: 'natural-care',
    name: 'Natural Care',
    essence: 'Calm, restorative and honest — care without clinical coldness.',
    palette: {
      hues: [142, 122, 165, 96],
      sat: [22, 36],
      light: [36, 44],
      secondary: { dh: -112, s: 42, l: 76 },
      accent: { dh: -100, s: 58, l: 58 },
      anchorRole: 'primary',
    },
    pairings: [P('DM Serif Display', 'Nunito Sans', 400), P('Lora', 'Lato'), P('Fraunces', 'Nunito Sans', 500), P('Nunito', 'Nunito', 700)],
    corner: 'rounded',
    motif: 'arc',
    patterns: ['waves', 'rings', 'dots', 'mark'],
    descriptors: ['organic', 'minimal', 'elegant'],
    contrast: 'low',
    density: 'airy',
    fits: {
      industries: ['health-wellness', 'beauty', 'agriculture', 'non-profit', 'fitness', 'education'],
      personality: ['warm', 'trustworthy', 'approachable', 'friendly', 'reliable'],
      positioning: ['sustainable', 'accessible', 'boutique', 'premium'],
      audience: ['consumers', 'families', 'local-community', 'professionals'],
      geometry: ['organic', 'balanced'],
      weight: ['light', 'regular'],
    },
    feel: 'calm and restorative',
    voice: {
      tone: 'calm',
      principles: [
        { title: 'Reassure first', detail: 'Acknowledge how the reader feels before telling them what to do.' },
        { title: 'Honest about what we do', detail: 'No miracle claims. Explain plainly.' },
        { title: 'Gentle momentum', detail: 'Encourage small next steps rather than urgency.' },
      ],
      doList: ['Use soft, inclusive language', 'Explain benefits plainly', 'Leave room — short paragraphs'],
      dontList: ['Fear-based messaging', 'Clinical jargon', 'Overpromising results'],
      samples: ['Breathe. {name} has you.', 'Care that feels like care.', 'Made for {audience}, one calm step at a time.'],
    },
  },
  {
    id: 'editorial',
    name: 'Editorial Calm',
    essence: 'Restraint as a statement. Typography does the talking.',
    palette: {
      hues: [24, 0, 214, 350],
      sat: [6, 12],
      light: [13, 18],
      secondary: { dh: 0, s: 12, l: 82 },
      accent: { dh: 0, s: 74, l: 50 },
      anchorRole: 'accent',
    },
    pairings: [P('Playfair Display', 'Inter'), P('Instrument Serif', 'Inter', 400), P('Bodoni Moda', 'Work Sans', 500), P('Libre Baskerville', 'Work Sans', 700)],
    corner: 'sharp',
    motif: 'line',
    patterns: ['grid', 'diagonal', 'mark', 'rings'],
    descriptors: ['editorial', 'minimal', 'elegant'],
    contrast: 'high',
    density: 'airy',
    fits: {
      industries: ['media', 'fashion', 'marketing', 'professional-services', 'education', 'real-estate', 'legal'],
      personality: ['sophisticated', 'elegant', 'creative', 'confident', 'authoritative'],
      positioning: ['premium', 'boutique', 'specialist', 'luxury'],
      audience: ['creatives', 'professionals', 'agencies', 'luxury-buyers'],
      geometry: ['balanced', 'geometric', 'organic'],
      weight: ['light', 'regular'],
      neutralLover: true,
    },
    feel: 'restrained and editorial',
    voice: {
      tone: 'inspiring',
      principles: [
        { title: 'Write like a good magazine', detail: 'A point of view in every headline; craft in every caption.' },
        { title: 'Restraint is the luxury', detail: 'Fewer words, chosen carefully. White space is part of the sentence.' },
        { title: 'Curious, not cool', detail: 'Share what interests you; never talk down.' },
      ],
      doList: ['Use considered, precise wording', 'Let headlines have an opinion', 'Edit ruthlessly'],
      dontList: ['Marketing clichés', 'Exclamation marks', 'Walls of copy'],
      samples: ['{name}, considered.', 'Notes on {industry}, done properly.', 'Fewer things, better made.'],
    },
  },
  {
    id: 'playful-pop',
    name: 'Playful Pop',
    essence: 'Bright, friendly and impossible not to smile at.',
    palette: {
      hues: [330, 262, 44, 176, 14],
      sat: [74, 90],
      light: [56, 62],
      secondary: { dh: 140, s: 72, l: 62 },
      accent: { dh: -72, s: 90, l: 58 },
      anchorRole: 'primary',
    },
    pairings: [P('Fredoka', 'Nunito'), P('Baloo 2', 'Nunito', 700), P('Sora', 'DM Sans', 700), P('Poppins', 'Poppins', 700)],
    corner: 'pill',
    motif: 'circle',
    patterns: ['confetti', 'dots', 'waves', 'mark'],
    descriptors: ['playful', 'bold', 'modern'],
    contrast: 'medium',
    density: 'balanced',
    fits: {
      industries: ['education', 'entertainment', 'food-beverage', 'retail', 'fitness', 'non-profit', 'travel'],
      personality: ['playful', 'friendly', 'approachable', 'creative', 'warm'],
      positioning: ['accessible', 'everyday', 'challenger', 'value'],
      audience: ['families', 'students', 'young-adults', 'consumers'],
      geometry: ['organic', 'balanced', 'geometric'],
      weight: ['heavy', 'regular'],
    },
    feel: 'bright and friendly',
    voice: {
      tone: 'witty',
      principles: [
        { title: 'Smile, then inform', detail: 'A light touch up front, the useful bit right after.' },
        { title: 'Talk like a friend', detail: 'Contractions, everyday words, short sentences.' },
        { title: 'Inclusive by default', detail: 'Jokes that everyone is in on — never at someone’s expense.' },
      ],
      doList: ['Use everyday words', 'Add a little wit to headlines', 'Celebrate the reader'],
      dontList: ['Sarcasm', 'Inside jokes', 'Stiff formality'],
      samples: ['Hello, {name}!', 'Good times, served daily.', '{audience}, this one’s for you.'],
    },
  },
  {
    id: 'luxe-noir',
    name: 'Luxe Noir',
    essence: 'Dark, precise and rare. Luxury that never raises its voice.',
    palette: {
      hues: [38, 28, 0],
      sat: [8, 14],
      light: [9, 12],
      secondary: { h: 38, s: 44, l: 58 },
      accent: { h: 32, s: 22, l: 82 },
      anchorRole: 'accent',
    },
    pairings: [P('Cormorant Garamond', 'Montserrat', 500), P('Bodoni Moda', 'Montserrat', 500), P('Cinzel', 'Lato', 500), P('Italiana', 'Inter', 400)],
    corner: 'sharp',
    motif: 'line',
    patterns: ['mark', 'diagonal', 'rings', 'grid'],
    descriptors: ['luxury', 'elegant', 'minimal'],
    contrast: 'high',
    density: 'airy',
    fits: {
      industries: ['fashion', 'beauty', 'hospitality', 'real-estate', 'automotive', 'travel'],
      personality: ['elegant', 'sophisticated', 'confident', 'authoritative'],
      positioning: ['luxury', 'premium', 'boutique', 'heritage'],
      audience: ['luxury-buyers', 'professionals'],
      geometry: ['balanced', 'geometric', 'organic'],
      weight: ['light', 'regular'],
      neutralLover: true,
    },
    feel: 'dark, rare and precise',
    voice: {
      tone: 'authoritative',
      principles: [
        { title: 'Say less', detail: 'Every word is placed. Silence is part of the voice.' },
        { title: 'Never chase', detail: 'No discounts in headlines, no urgency, no pleading.' },
        { title: 'Craft over claims', detail: 'Describe materials, process and provenance, not superlatives.' },
      ],
      doList: ['Use short, poised sentences', 'Name materials and process', 'Leave room for the image'],
      dontList: ['Discount language', 'Superlatives (“the best”)', 'Casual slang or emoji'],
      samples: ['{name}.', 'Rare by design.', 'Made for {audience}. Never for everyone.'],
    },
  },
];

export function archetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}
