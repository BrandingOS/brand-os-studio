import { FLATICON_RR_NAMES } from './flaticonNames';

/**
 * Heuristic icon suggester for the Brand Kit Icons section.
 *
 * Given the brand's free-form text (name + audience + tone + strategy
 * + about), tokenize it, score every Flaticon Regular-Rounded name by
 * how many of its slug parts overlap with brand tokens, and return
 * the top N. When the brand has no useful text (or matches are
 * thin) we top up with a curated starter pack so the user always
 * lands on a populated grid.
 *
 * Deterministic and fully client-side — no API calls, no per-page
 * cost beyond the catalog walk (~3.5k items).
 */

const STOPWORDS = new Set([
  'a', 'an', 'and', 'or', 'but', 'the', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'doing', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 's', 't', 'just', 'i', 'you', 'he', 'she', 'we', 'they', 'it',
  'this', 'that', 'these', 'those', 'them', 'their', 'theirs', 'his', 'her',
  'our', 'us', 'me', 'my', 'mine', 'your', 'yours', 'its', 'who', 'whom',
  'which', 'what', 'whose', 'as', 'if', 'while', 'because', 'although',
  'though', 'unless', 'until', 'whether', 'whereas',
  // Brand-positioning filler that doesn't map to a concrete icon.
  'brand', 'brands', 'business', 'company', 'product', 'service', 'services',
  'design', 'designs', 'designer', 'team', 'people', 'user', 'users',
  'customer', 'customers', 'client', 'clients', 'project', 'projects',
  'work', 'world', 'audience', 'tone', 'voice', 'mission', 'vision',
  'value', 'values', 'experience', 'experiences', 'positioning', 'simple',
  'modern', 'great', 'good', 'best', 'better',
]);

/** Curated 50-icon starter pack covering common brand needs (action,
 *  status, communication, media, time, identity). Used when the
 *  brand has no text yet or scoring produces too few matches. */
const STARTER_PACK: readonly string[] = [
  'fi-rr-star', 'fi-rr-heart', 'fi-rr-bookmark', 'fi-rr-flag', 'fi-rr-bolt',
  'fi-rr-rocket', 'fi-rr-sparkles', 'fi-rr-magic-wand', 'fi-rr-crown', 'fi-rr-gem',
  'fi-rr-camera', 'fi-rr-images', 'fi-rr-picture', 'fi-rr-play', 'fi-rr-music',
  'fi-rr-headphones', 'fi-rr-microphone', 'fi-rr-volume', 'fi-rr-video-camera',
  'fi-rr-bell', 'fi-rr-envelope', 'fi-rr-paper-plane', 'fi-rr-comment',
  'fi-rr-comments', 'fi-rr-phone-call', 'fi-rr-link', 'fi-rr-share',
  'fi-rr-search', 'fi-rr-edit', 'fi-rr-pencil', 'fi-rr-trash', 'fi-rr-settings',
  'fi-rr-gears', 'fi-rr-filter', 'fi-rr-folder', 'fi-rr-document',
  'fi-rr-clock', 'fi-rr-calendar', 'fi-rr-globe', 'fi-rr-map-marker-home',
  'fi-rr-user', 'fi-rr-users', 'fi-rr-shield-check', 'fi-rr-lock',
  'fi-rr-credit-card', 'fi-rr-shopping-cart', 'fi-rr-shopping-bag',
  'fi-rr-gift', 'fi-rr-tags', 'fi-rr-chart-line-up',
];

/** Common synonym → preferred token mapping. Lets a description
 *  saying "restaurant" or "eatery" both pull food-flavored icons. */
const SYNONYMS: Record<string, string[]> = {
  food: ['food', 'dish', 'meal', 'restaurant', 'kitchen', 'chef'],
  restaurant: ['restaurant', 'food', 'kitchen', 'chef', 'menu'],
  cafe: ['coffee', 'cup', 'mug', 'cafe'],
  coffee: ['coffee', 'cup', 'mug'],
  health: ['health', 'medical', 'heart', 'pulse', 'doctor', 'fitness'],
  medical: ['medical', 'doctor', 'heart', 'pulse', 'pill', 'health'],
  fitness: ['fitness', 'gym', 'dumbbell', 'running', 'health'],
  fashion: ['fashion', 'clothes', 'shirt', 'shoes', 'dress', 'bag'],
  beauty: ['beauty', 'makeup', 'lipstick', 'mirror', 'flower'],
  tech: ['tech', 'computer', 'code', 'laptop', 'mobile', 'cloud'],
  technology: ['tech', 'computer', 'code', 'laptop', 'mobile', 'cloud'],
  software: ['code', 'computer', 'laptop', 'cloud', 'server'],
  finance: ['money', 'wallet', 'bank', 'chart', 'dollar', 'credit-card'],
  bank: ['bank', 'wallet', 'money', 'credit-card'],
  education: ['book', 'graduation', 'pencil', 'school'],
  school: ['book', 'graduation', 'pencil', 'school'],
  travel: ['plane', 'map', 'compass', 'suitcase', 'globe', 'hotel'],
  music: ['music', 'headphones', 'microphone', 'guitar', 'play'],
  game: ['game', 'gamepad', 'dice', 'puzzle'],
  social: ['user', 'comment', 'share', 'heart', 'star'],
  creative: ['palette', 'brush', 'pencil', 'sparkles'],
  art: ['palette', 'brush', 'paint', 'frame'],
};

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function expandWithSynonyms(tokens: string[]): Set<string> {
  const out = new Set<string>(tokens);
  for (const t of tokens) {
    const syns = SYNONYMS[t];
    if (syns) syns.forEach((s) => out.add(s));
  }
  return out;
}

/** Top N icons (default 50) suggested for a brand based on free-form
 *  text. Returns curated starter-pack picks if no signal is found. */
export function suggestIconsForBrand(text: string, max = 50): string[] {
  const tokens = tokenize(text);
  const tokenSet = expandWithSynonyms(tokens);

  if (tokenSet.size === 0) {
    return STARTER_PACK.slice(0, max);
  }

  type Scored = { name: string; score: number };
  const scored: Scored[] = [];

  for (const name of FLATICON_RR_NAMES) {
    const bare = name.slice('fi-rr-'.length);
    if (!bare) continue;
    const parts = bare.split('-');
    let score = 0;
    for (const part of parts) {
      if (tokenSet.has(part)) {
        score += 3;
        continue;
      }
      // Loose substring match — "design" hits "designer", "designs".
      for (const t of tokenSet) {
        if (t.length >= 4 && (part.includes(t) || t.includes(part))) {
          score += 1;
          break;
        }
      }
    }
    if (score > 0) {
      // Prefer shorter names (less specific compound nouns), all else
      // equal — they tend to be more universally usable in a brand kit.
      const lengthPenalty = parts.length * 0.05;
      scored.push({ name, score: score - lengthPenalty });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.slice(0, max).map((s) => s.name);

  if (matched.length >= max) return matched;

  // Top up from the starter pack so we always reach `max`.
  const have = new Set(matched);
  for (const name of STARTER_PACK) {
    if (matched.length >= max) break;
    if (!have.has(name)) {
      matched.push(name);
      have.add(name);
    }
  }
  return matched;
}
