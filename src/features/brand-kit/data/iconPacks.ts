import { FLATICON_RR_NAMES } from './flaticonNames';

/**
 * Curated industry icon packs for the Brand Kit's Icons section.
 *
 * The old suggester walked all 3,500 Flaticon names and scored them by token
 * overlap against the brand's own prose. That is a SEARCH, and a search over a
 * catalogue that carries Waste Pollution, Assistive Listening, Anatomical Heart
 * and Blender Phone will find them: a fintech was offered Waste and Building
 * NGO, a card-game company was offered Turkey and Cvv Card (audit D41). The
 * words matched. The set was nonsense.
 *
 * An icon SET is a designed object, so it is designed here — ten packs, each a
 * coherent 24–32 symbol vocabulary a brand in that industry would actually use.
 * The brand's own text still decides the ORDER inside its pack (see
 * `suggestIcons.ts`), which is the part a machine is good at. Which symbols
 * belong at all is a decision, and decisions are written down.
 *
 * Rules that bind:
 *
 *  1. **Every name must exist in `FLATICON_RR_NAMES`.** A typo renders an empty
 *     box, which is exactly what "50 emptyLike tiles" looked like in the audit.
 *     `iconPacks.test.ts` fails on any name the catalogue does not carry.
 *  2. **Names are stored WITHOUT a weight prefix.** The weight is a brand
 *     decision applied to the whole set (`iconWeights.ts`), so a pack that
 *     baked `fi-rr-` in would have to be rewritten to change it.
 *  3. **Every industry in the onboarding vocabulary maps to a pack.** An
 *     unmapped industry silently falls to `general`, and a test asserts the map
 *     covers all 25 members so a vocabulary addition is caught here rather than
 *     by a user.
 *  4. **`general` is a real pack, not a fallback bin.** It is the set a brand
 *     with no stated industry should be proud to ship: action, status,
 *     communication, media, time, identity, commerce.
 */

/** The ten packs. `id` persists; `label` is shown. */
export type IconPackId =
  | 'finance'
  | 'tech'
  | 'hospitality'
  | 'retail'
  | 'health'
  | 'education'
  | 'real-estate'
  | 'creative'
  | 'food'
  | 'general';

export interface IconPack {
  id: IconPackId;
  /** Shown in the editor's pack picker. */
  label: string;
  /** One line explaining who it is for. */
  description: string;
  /**
   * Words that put a brand in this pack when no industry is recorded.
   * Matched against the brand's own text as whole tokens or prefixes.
   */
  keywords: readonly string[];
  /** Bare Flaticon slugs — no `fi-rr-` prefix. 24–32 per pack. */
  icons: readonly string[];
}

export const ICON_PACKS: readonly IconPack[] = [
  {
    id: 'finance',
    label: 'Finance',
    description: 'Banking, fintech, accounting, legal and professional services.',
    keywords: [
      'finance', 'financial', 'fintech', 'bank', 'banking', 'invest', 'investment',
      'profit', 'revenue', 'margin', 'accounting', 'accountant', 'audit', 'tax',
      'payment', 'payments', 'invoice', 'budget', 'capital', 'wealth', 'insurance',
      'legal', 'law', 'lawyer', 'consulting', 'consultancy', 'advisory', 'roas',
      'cac', 'ledger', 'payroll', 'treasury', 'trading', 'equity',
    ],
    icons: [
      'chart-line-up', 'chart-pie', 'chart-histogram', 'stats', 'coins', 'wallet',
      'bank', 'credit-card', 'receipt', 'calculator', 'money-bill-wave', 'piggy-bank',
      'sack-dollar', 'percentage', 'invest', 'exchange', 'hand-holding-usd',
      'file-invoice', 'document-signed', 'clipboard-list', 'presentation', 'briefcase',
      'handshake', 'target', 'badge-check', 'shield-check', 'lock', 'key',
    ],
  },
  {
    id: 'tech',
    label: 'Technology & SaaS',
    description: 'Software, platforms, infrastructure and developer tools.',
    keywords: [
      'tech', 'technology', 'software', 'saas', 'platform', 'app', 'application',
      'cloud', 'data', 'developer', 'engineering', 'api', 'automation', 'infrastructure',
      'digital', 'startup', 'ai', 'analytics', 'dashboard', 'integration', 'devops',
      'cyber', 'security', 'network', 'mobile', 'web', 'code', 'coding', 'server',
    ],
    icons: [
      'code-simple', 'code-branch', 'laptop-code', 'terminal', 'cloud', 'cloud-upload',
      'database', 'network', 'api', 'microchip', 'devices', 'browser', 'mobile-notch',
      'dashboard', 'sitemap', 'layers', 'puzzle-piece-integration', 'plug', 'bug',
      'test', 'refresh', 'gears', 'bolt', 'rocket', 'wifi', 'fingerprint',
      'shield-check', 'key', 'globe', 'chart-line-up',
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Travel',
    description: 'Hotels, resorts, tourism, venues and guest experience.',
    keywords: [
      'hospitality', 'hotel', 'resort', 'travel', 'tourism', 'guest', 'guests',
      'booking', 'reservation', 'stay', 'suite', 'concierge', 'holiday', 'vacation',
      'flight', 'airline', 'destination', 'lounge', 'venue', 'spa', 'retreat',
      'tour', 'tours', 'trip', 'hostel', 'airbnb', 'check-in',
    ],
    icons: [
      'bed', 'hotel', 'concierge-bell', 'room-service', 'door-open', 'key',
      'suitcase-alt', 'luggage-cart', 'passport', 'plane', 'taxi', 'map-marker',
      'globe', 'compass-alt', 'umbrella', 'cocktail', 'coffee', 'restaurant',
      'spa', 'shower', 'parking', 'wifi', 'ticket', 'calendar', 'clock',
      'phone-call', 'gift', 'star',
    ],
  },
  {
    id: 'retail',
    label: 'Retail & E-commerce',
    description: 'Shops, marketplaces, fashion, consumer products and fulfilment.',
    keywords: [
      'retail', 'shop', 'shopping', 'store', 'ecommerce', 'commerce', 'marketplace',
      'merchandise', 'products', 'catalogue', 'catalog', 'checkout', 'cart', 'order',
      'orders', 'delivery', 'shipping', 'fulfilment', 'fulfillment', 'warehouse',
      'inventory', 'fashion', 'apparel', 'clothing', 'boutique', 'collection',
      'wholesale', 'subscription', 'games', 'toys',
    ],
    icons: [
      'shopping-cart', 'shopping-cart-check', 'shopping-bag', 'shopping-basket',
      'cart-shopping-fast', 'store-alt', 'shop', 'cash-register', 'tags', 'label',
      'badge-percent', 'barcode', 'barcode-scan', 'qrcode', 'box', 'package',
      'truck-side', 'truck-box', 'credit-card', 'wallet', 'receipt', 'gift',
      'refresh', 'star', 'heart', 'shirt', 'glasses', 'basket',
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    description: 'Clinics, practitioners, fitness, beauty and wellbeing.',
    keywords: [
      'health', 'healthcare', 'medical', 'clinic', 'clinical', 'doctor', 'doctors',
      'patient', 'patients', 'hospital', 'dental', 'dentist', 'therapy', 'therapist',
      'wellness', 'wellbeing', 'fitness', 'gym', 'training', 'nutrition', 'diet',
      'pharmacy', 'pharma', 'beauty', 'skincare', 'salon', 'mental', 'care',
      'recovery', 'yoga', 'pilates',
    ],
    icons: [
      'heart', 'pulse', 'stethoscope', 'medical-star', 'hospital', 'doctor',
      'ambulance', 'syringe', 'pills', 'medicine', 'prescription', 'thermometer-alt',
      'microscope', 'dna', 'brain', 'tooth', 'wheelchair', 'hand-holding-heart',
      'shield-check', 'leaf', 'spa', 'meditation', 'running', 'gym',
      'dumbbell-fitness', 'apple-whole', 'water-bottle', 'calendar',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Schools, courses, training, publishing and non-profits.',
    keywords: [
      'education', 'educational', 'school', 'university', 'college', 'academy',
      'course', 'courses', 'curriculum', 'learning', 'learn', 'teaching', 'teacher',
      'tutor', 'tutoring', 'student', 'students', 'training', 'workshop', 'lesson',
      'lessons', 'research', 'library', 'literacy', 'scholarship', 'charity',
      'nonprofit', 'volunteer', 'community',
    ],
    icons: [
      'graduation-cap', 'diploma', 'school', 'chalkboard-user', 'student', 'e-learning',
      'book', 'book-alt', 'book-open-reader', 'books', 'bookmark', 'notebook',
      'backpack', 'pencil', 'clipboard', 'presentation', 'microscope', 'calculator',
      'globe', 'bulb', 'award', 'trophy', 'medal', 'brain', 'users-alt',
      'calendar', 'clock', 'puzzle-alt',
    ],
  },
  {
    id: 'real-estate',
    label: 'Real Estate & Construction',
    description: 'Property, brokerage, architecture, interiors and building.',
    keywords: [
      'real', 'estate', 'property', 'properties', 'realty', 'broker', 'brokerage',
      'housing', 'homes', 'apartment', 'apartments', 'residential', 'commercial',
      'landlord', 'tenant', 'rent', 'rental', 'lease', 'mortgage', 'architecture',
      'architect', 'interior', 'interiors', 'construction', 'builder', 'building',
      'contracting', 'renovation', 'developer',
    ],
    icons: [
      'building', 'house-building', 'house-window', 'apartment', 'city',
      'home-location', 'map-marker-home', 'search-alt', 'key', 'door-open',
      'blueprint', 'ruler-combined', 'excavator', 'hammer', 'paint-roller',
      'sign-hanging', 'sofa', 'bed', 'bath', 'garage', 'tree', 'plug',
      'shield-check', 'document-signed', 'handshake', 'calculator', 'calendar',
      'phone-call',
    ],
  },
  {
    id: 'creative',
    label: 'Creative & Media',
    description: 'Studios, agencies, film, music, games and entertainment.',
    keywords: [
      'creative', 'design', 'studio', 'agency', 'branding', 'art', 'artist',
      'illustration', 'photography', 'photographer', 'film', 'video', 'cinema',
      'music', 'audio', 'podcast', 'media', 'production', 'content', 'marketing',
      'advertising', 'campaign', 'game', 'games', 'gaming', 'play', 'player',
      'players', 'entertainment', 'event', 'events', 'party', 'culture', 'social',
    ],
    icons: [
      'palette', 'paint-brush', 'paintbrush-pencil', 'pen-nib', 'draw-polygon',
      'layers', 'picture', 'gallery', 'camera', 'video-camera-alt', 'clapperboard',
      'film', 'music', 'headphones', 'microphone', 'guitar', 'drum', 'play',
      'sparkles', 'magic-wand', 'scissors', 'eye', 'megaphone', 'share',
      'ticket', 'dice', 'star', 'heart',
    ],
  },
  {
    id: 'food',
    label: 'Food & Beverage',
    description: 'Restaurants, cafés, bakeries, delivery and drinks.',
    keywords: [
      'food', 'beverage', 'restaurant', 'cafe', 'coffee', 'bakery', 'kitchen',
      'chef', 'cook', 'cooking', 'menu', 'dining', 'dine', 'catering', 'bar',
      'brewery', 'juice', 'dessert', 'pastry', 'pizza', 'burger', 'grocery',
      'meal', 'meals', 'recipe', 'recipes', 'eatery', 'bistro', 'takeaway',
    ],
    icons: [
      'restaurant', 'hat-chef', 'utensils', 'fork', 'spoon', 'menu-burger',
      'hamburger', 'pizza-slice', 'salad', 'soup', 'bowl-rice', 'fish',
      'bread-slice', 'cake-birthday', 'cupcake', 'ice-cream', 'coffee', 'mug-alt',
      'cup-togo', 'cocktail', 'beer', 'glass', 'water-bottle', 'grill',
      'leaf', 'truck-side', 'receipt', 'star',
    ],
  },
  {
    id: 'general',
    label: 'General',
    description: 'The everyday set — good for any brand, and the top-up for all packs.',
    keywords: [],
    icons: [
      'star', 'heart', 'bookmark', 'flag', 'bolt', 'rocket', 'sparkles', 'crown',
      'gem', 'camera', 'images', 'play', 'bell', 'envelope', 'paper-plane',
      'comment', 'phone-call', 'link', 'share', 'search', 'edit', 'folder',
      'document', 'clock', 'calendar', 'globe', 'user', 'users-alt',
      'shield-check', 'lock', 'gift', 'chart-line-up',
    ],
  },
];

export const DEFAULT_PACK_ID: IconPackId = 'general';

const PACK_BY_ID = new Map<string, IconPack>(ICON_PACKS.map((p) => [p.id, p]));

/** The pack with this id, or the general pack when the id is unknown. */
export function iconPack(id: string | undefined | null): IconPack {
  return PACK_BY_ID.get((id ?? '').trim()) ?? PACK_BY_ID.get(DEFAULT_PACK_ID)!;
}

/**
 * Every industry in `features/onboarding/vocabulary` → the pack that serves it.
 *
 * Keys are the vocabulary IDS, which is what `strategy.industry` persists. A
 * brand that answered `Other` keeps its own wording, so that answer arrives as
 * free text and is resolved by `packForIndustry`'s label + keyword fallback.
 */
export const PACK_BY_INDUSTRY: Readonly<Record<string, IconPackId>> = {
  'real-estate': 'real-estate',
  construction: 'real-estate',
  hospitality: 'hospitality',
  travel: 'hospitality',
  'food-beverage': 'food',
  retail: 'retail',
  fashion: 'retail',
  logistics: 'retail',
  automotive: 'retail',
  manufacturing: 'retail',
  'health-wellness': 'health',
  fitness: 'health',
  beauty: 'health',
  technology: 'tech',
  saas: 'tech',
  finance: 'finance',
  legal: 'finance',
  'professional-services': 'finance',
  education: 'education',
  'non-profit': 'education',
  agriculture: 'food',
  energy: 'tech',
  media: 'creative',
  marketing: 'creative',
  entertainment: 'creative',
};

/** Normalise a label or id to the vocabulary's id shape. */
function toId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The pack for a recorded industry.
 *
 * Accepts a vocabulary id (`health-wellness`), the label a person reads
 * (`Health & Wellness`), or the free wording an `Other` answer carries — in
 * which case it falls through to keyword matching rather than guessing.
 * Returns null when nothing fits, so the caller can decide whether to fall back
 * to the brand's prose or to `general`.
 */
export function packForIndustry(industry: string | undefined | null): IconPack | null {
  const raw = (industry ?? '').trim();
  if (!raw) return null;
  const id = toId(raw);
  const direct = PACK_BY_INDUSTRY[id];
  if (direct) return iconPack(direct);
  // A label like "Health & Wellness" normalises to "health-wellness" above, so
  // reaching here means an `Other` answer. Its wording is still evidence.
  return detectPackFromText(raw);
}

/**
 * The pack a brand's own words point at, or null when nothing does.
 *
 * Counts DISTINCT keyword hits per pack, so a brand that says "payments" six
 * times does not out-vote one that spans four finance concepts. Ties resolve by
 * declaration order, which keeps the answer deterministic — a suggester whose
 * result depends on Map iteration order is a suggester nobody can test.
 */
export function detectPackFromText(text: string): IconPack | null {
  const tokens = new Set(
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(Boolean),
  );
  if (tokens.size === 0) return null;

  let best: IconPack | null = null;
  let bestHits = 0;
  for (const pack of ICON_PACKS) {
    if (pack.keywords.length === 0) continue;
    let hits = 0;
    for (const keyword of pack.keywords) {
      if (tokens.has(keyword)) {
        hits += 1;
        continue;
      }
      // A prefix match in ONE direction: "financial" reaches "finance" and
      // "gaming" reaches "game", while a two-letter fragment reaches nothing.
      if (keyword.length < 4) continue;
      for (const t of tokens) {
        if (t.length >= 4 && (t.startsWith(keyword) || keyword.startsWith(t))) {
          hits += 1;
          break;
        }
      }
    }
    if (hits > bestHits) {
      best = pack;
      bestHits = hits;
    }
  }
  // One stray word is a coincidence. Two is a signal.
  return bestHits >= 2 ? best : null;
}

/** Prefix-free names → full `fi-rr-` class names. */
export function packClassNames(pack: IconPack): string[] {
  return pack.icons.map((name) => `fi-rr-${name}`);
}

/** Every catalogue name the packs use, as full class names. */
export function allPackClassNames(): string[] {
  const out = new Set<string>();
  for (const pack of ICON_PACKS) for (const name of pack.icons) out.add(`fi-rr-${name}`);
  return Array.from(out);
}

const CATALOG = new Set(FLATICON_RR_NAMES);

/** True when a pack name really exists in the shipped catalogue. */
export function isRealCatalogName(bareName: string): boolean {
  return CATALOG.has(`fi-rr-${bareName}`);
}
