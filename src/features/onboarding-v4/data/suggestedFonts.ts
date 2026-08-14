/**
 * Suggested font pairings for the onboarding review — shown when the user
 * uploaded no fonts. Matched against the brand description (industry &
 * style keywords), same mechanics as `suggestedPalettes.ts`. Every family
 * here exists in `GOOGLE_FONTS`, so picking one just adds Google Font
 * assets and injects the stylesheet.
 */

export interface SuggestedFontPairing {
  id: string;
  name: string;
  /** Display/heading family. */
  heading: string;
  /** Body/text family. */
  body: string;
}

interface PairingDef extends SuggestedFontPairing {
  match: RegExp;
}

const PAIRINGS: PairingDef[] = [
  {
    id: 'tech',
    name: 'Tech & Digital',
    heading: 'Space Grotesk',
    body: 'Inter',
    match: /\b(tech|software|saas|app|ai|digital|startup|platform|data|cloud|developer|code)\b/g,
  },
  {
    id: 'food',
    name: 'Food & Restaurant',
    heading: 'Playfair Display',
    body: 'Lato',
    match: /\b(food|restaurant|cafe|kitchen|meal|taste|delicious|eat|snack|bakery|chef|pizza|burger)\b/g,
  },
  {
    id: 'coffee',
    name: 'Coffee & Roast',
    heading: 'Lora',
    body: 'Open Sans',
    match: /\b(coffee|espresso|roast|brew|barista|latte)\b/g,
  },
  {
    id: 'beauty',
    name: 'Beauty & Care',
    heading: 'Cormorant Garamond',
    body: 'Montserrat',
    match: /\b(beauty|cosmetics?|skincare|makeup|salon|spa|hair|nails?)\b/g,
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    heading: 'Poppins',
    body: 'Open Sans',
    match: /\b(health|medical|clinic|wellness|fitness|care|pharma|doctor|therapy|gym|yoga)\b/g,
  },
  {
    id: 'finance',
    name: 'Finance & Trust',
    heading: 'Merriweather',
    body: 'Roboto',
    match: /\b(finance|financial|bank|invest(?:ment)?|money|fintech|insurance|accounting|payments?)\b/g,
  },
  {
    id: 'education',
    name: 'Education & Learning',
    heading: 'Nunito',
    body: 'Open Sans',
    match: /\b(education|school|learn(?:ing)?|courses?|academy|teach(?:ing)?|students?|tutoring)\b/g,
  },
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    heading: 'Playfair Display',
    body: 'Raleway',
    match: /\b(fashion|apparel|clothing|wear|boutique|streetwear|garments?|textiles?)\b/g,
  },
  {
    id: 'gaming',
    name: 'Games & Play',
    heading: 'Bebas Neue',
    body: 'Poppins',
    match: /\b(game|games|gaming|play(?:er|ful)?|esports?|arcade|fun|quest)\b/g,
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    heading: 'Montserrat',
    body: 'Lora',
    match: /\b(travel|tours?|trips?|adventure|hotels?|flights?|explore|destinations?)\b/g,
  },
  {
    id: 'eco',
    name: 'Eco & Nature',
    heading: 'Quicksand',
    body: 'Lato',
    match: /\b(eco|green|sustainab\w*|organic|nature|natural|earth|environment\w*|recycl\w*|farm\w*)\b/g,
  },
  {
    id: 'kids',
    name: 'Kids & Family',
    heading: 'Fredoka',
    body: 'Nunito',
    match: /\b(kids?|children|toys?|family|parents?|babies|baby)\b/g,
  },
  {
    id: 'luxury',
    name: 'Luxury & Elegance',
    heading: 'Cormorant Garamond',
    body: 'Lato',
    match: /\b(luxur\w*|premium|elegan\w*|high[-\s]?end|exclusive|bespoke|refined)\b/g,
  },
  {
    id: 'realestate',
    name: 'Property & Build',
    heading: 'Work Sans',
    body: 'Merriweather',
    match: /\b(real\s?estate|property|properties|homes?|construction|architect\w*|interior|building)\b/g,
  },
  {
    id: 'minimal',
    name: 'Minimal & Modern',
    heading: 'DM Sans',
    body: 'Inter',
    match: /\b(minimal\w*|clean|simple|modern|sleek|understated)\b/g,
  },
  {
    id: 'bold',
    name: 'Bold & Vibrant',
    heading: 'Oswald',
    body: 'Inter',
    match: /\b(bold|vibrant|energetic|loud|striking|punchy|electric)\b/g,
  },
];

const FALLBACK_IDS = ['minimal', 'tech', 'fashion'];

/** Rank pairings by keyword hits against the brand's text; always returns
 *  `count` pairings — matched first, generic fallbacks after. */
export function suggestFontsFor(text: string, count = 4): SuggestedFontPairing[] {
  const t = (text ?? '').toLowerCase();
  const scored = PAIRINGS.map((p) => ({
    p,
    score: t ? (t.match(p.match)?.length ?? 0) : 0,
  }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.p);

  const out: SuggestedFontPairing[] = [...scored];
  for (const id of FALLBACK_IDS) {
    if (out.length >= count) break;
    const p = PAIRINGS.find((x) => x.id === id);
    if (p && !out.includes(p)) out.push(p);
  }
  return out.slice(0, count).map(({ id, name, heading, body }) => ({ id, name, heading, body }));
}
