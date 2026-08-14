/**
 * Suggested color palettes for the onboarding review — shown when the user
 * uploaded no colors. Matched against the brand description (industry &
 * style keywords); generic fallbacks pad the list so there's always
 * something to offer.
 */

export interface SuggestedPalette {
  id: string;
  name: string;
  colors: string[];
}

interface PaletteDef extends SuggestedPalette {
  match: RegExp;
}

const PALETTES: PaletteDef[] = [
  {
    id: 'tech',
    name: 'Tech & Digital',
    colors: ['#2563EB', '#0EA5E9', '#111827', '#F3F4F6', '#22D3EE'],
    match: /\b(tech|software|saas|app|ai|digital|startup|platform|data|cloud|developer|code)\b/g,
  },
  {
    id: 'food',
    name: 'Food & Restaurant',
    colors: ['#E4572E', '#F3A712', '#5A2A27', '#FFF8F0', '#7FB069'],
    match: /\b(food|restaurant|cafe|kitchen|meal|taste|delicious|eat|snack|bakery|chef|pizza|burger)\b/g,
  },
  {
    id: 'coffee',
    name: 'Coffee & Roast',
    colors: ['#6F4E37', '#C89F83', '#3B2C25', '#F4EDE4', '#D96C2C'],
    match: /\b(coffee|espresso|roast|brew|barista|latte)\b/g,
  },
  {
    id: 'beauty',
    name: 'Beauty & Care',
    colors: ['#E8A0BF', '#B85C79', '#4A2B36', '#FBF3F0', '#D4AF7A'],
    match: /\b(beauty|cosmetics?|skincare|makeup|salon|spa|hair|nails?)\b/g,
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    colors: ['#0E9594', '#56C596', '#12403C', '#F1FAF7', '#3B82C4'],
    match: /\b(health|medical|clinic|wellness|fitness|care|pharma|doctor|therapy|gym|yoga)\b/g,
  },
  {
    id: 'finance',
    name: 'Finance & Trust',
    colors: ['#12355B', '#1F6FEB', '#C9A227', '#F5F6F8', '#27364B'],
    match: /\b(finance|financial|bank|invest(?:ment)?|money|fintech|insurance|accounting|payments?)\b/g,
  },
  {
    id: 'education',
    name: 'Education & Learning',
    colors: ['#2451B7', '#F2B134', '#153060', '#F7F8FC', '#3FA47A'],
    match: /\b(education|school|learn(?:ing)?|courses?|academy|teach(?:ing)?|students?|tutoring)\b/g,
  },
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    colors: ['#191919', '#C9B8A8', '#8A6D5C', '#F5F1EC', '#B03A2E'],
    match: /\b(fashion|apparel|clothing|wear|boutique|streetwear|garments?|textiles?)\b/g,
  },
  {
    id: 'gaming',
    name: 'Games & Play',
    colors: ['#7C3AED', '#22D3EE', '#18122B', '#F5F3FF', '#F43F5E'],
    match: /\b(game|games|gaming|play(?:er|ful)?|esports?|arcade|fun|quest)\b/g,
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    colors: ['#0D7DA6', '#F49D37', '#153B4F', '#FDF6EC', '#5EB88A'],
    match: /\b(travel|tours?|trips?|adventure|hotels?|flights?|explore|destinations?)\b/g,
  },
  {
    id: 'eco',
    name: 'Eco & Nature',
    colors: ['#2E7D46', '#8FBF71', '#1E3B29', '#F4F7EE', '#B98A4C'],
    match: /\b(eco|green|sustainab\w*|organic|nature|natural|earth|environment\w*|recycl\w*|farm\w*)\b/g,
  },
  {
    id: 'kids',
    name: 'Kids & Family',
    colors: ['#F45B69', '#FFD166', '#118AB2', '#FFF9F0', '#06D6A0'],
    match: /\b(kids?|children|toys?|family|parents?|babies|baby)\b/g,
  },
  {
    id: 'luxury',
    name: 'Luxury & Elegance',
    colors: ['#141414', '#C9A227', '#4A3B2A', '#F4F0E8', '#7A6248'],
    match: /\b(luxur\w*|premium|elegan\w*|high[-\s]?end|exclusive|bespoke|refined)\b/g,
  },
  {
    id: 'realestate',
    name: 'Property & Build',
    colors: ['#33415C', '#B26E3C', '#171F2E', '#F2F0EB', '#7C8DA6'],
    match: /\b(real\s?estate|property|properties|homes?|construction|architect\w*|interior|building)\b/g,
  },
  {
    id: 'minimal',
    name: 'Minimal & Modern',
    colors: ['#1A1A1A', '#8C8C88', '#D9D6CF', '#FAFAF8', '#3E5C76'],
    match: /\b(minimal\w*|clean|simple|modern|sleek|understated)\b/g,
  },
  {
    id: 'bold',
    name: 'Bold & Vibrant',
    colors: ['#E63946', '#F4A261', '#1D1B26', '#FDF7EF', '#2A9D8F'],
    match: /\b(bold|vibrant|energetic|loud|striking|punchy|electric)\b/g,
  },
];

/** Always-sensible generics used to pad when the description matches little. */
const FALLBACK_IDS = ['minimal', 'bold', 'finance'];

/**
 * Rank palettes by keyword hits against the brand's text (description +
 * about sections). Always returns `count` palettes — matched ones first,
 * generic fallbacks after.
 */
export function suggestPalettesFor(text: string, count = 4): SuggestedPalette[] {
  const t = (text ?? '').toLowerCase();
  const scored = PALETTES.map((p) => ({
    p,
    score: t ? (t.match(p.match)?.length ?? 0) : 0,
  }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.p);

  const out: SuggestedPalette[] = [...scored];
  for (const id of FALLBACK_IDS) {
    if (out.length >= count) break;
    const p = PALETTES.find((x) => x.id === id);
    if (p && !out.includes(p)) out.push(p);
  }
  return out.slice(0, count).map(({ id, name, colors }) => ({ id, name, colors }));
}
