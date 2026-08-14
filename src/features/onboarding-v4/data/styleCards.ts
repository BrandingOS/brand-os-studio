export interface FontDef {
  name: string;
  weight: number;
  italic?: boolean;
  tracking?: string;
  case?: 'uppercase' | 'lowercase' | 'none';
}

export interface StyleCardDef {
  id: string;
  label: string;
  families: string[];
  bg: string;
  fg: string;
  muted: string;
  nameSize: number;
  nameUnderline?: boolean;
  nameTracking?: string;
  forceItalic?: boolean;
  mark?: { type: 'line' | 'bigring'; color?: string };
  signature?: {
    text: string;
    size: number;
    tracking?: string;
    transform?: 'uppercase' | 'lowercase' | 'none';
    italic?: boolean;
    weight?: number;
    font?: string;
  };
}

export const FAMILY_FONTS: Record<string, FontDef[]> = {
  swiss_minimal: [
    { name: 'Inter', weight: 500 },
    { name: 'Inter', weight: 600 },
    { name: 'Inter', weight: 400 },
    { name: 'Space Grotesk', weight: 500 },
    { name: 'Space Grotesk', weight: 600 },
  ],
  luxury_quiet: [
    { name: 'Inter', weight: 300, tracking: '0.3em', case: 'uppercase' },
    { name: 'Cormorant Garamond', weight: 400 },
    { name: 'Instrument Serif', weight: 400 },
  ],
  editorial_serif: [
    { name: 'Instrument Serif', weight: 400, italic: true },
    { name: 'Instrument Serif', weight: 400 },
    { name: 'Fraunces', weight: 400 },
    { name: 'Fraunces', weight: 500, italic: true },
    { name: 'Playfair Display', weight: 400, italic: true },
    { name: 'Playfair Display', weight: 500 },
    { name: 'Cormorant Garamond', weight: 500, italic: true },
    { name: 'DM Serif Display', weight: 400 },
  ],
  brutalist: [
    { name: 'Space Grotesk', weight: 700 },
    { name: 'Syne', weight: 800 },
    { name: 'Inter', weight: 800 },
    { name: 'Bricolage Grotesque', weight: 700 },
  ],
  tech_mono: [
    { name: 'IBM Plex Mono', weight: 400 },
    { name: 'IBM Plex Mono', weight: 500 },
    { name: 'JetBrains Mono', weight: 400 },
    { name: 'JetBrains Mono', weight: 500 },
  ],
  art_deco: [
    { name: 'Unbounded', weight: 500, tracking: '0.08em' },
    { name: 'Playfair Display', weight: 500, tracking: '0.03em' },
    { name: 'DM Serif Display', weight: 400 },
  ],
  postmodern: [
    { name: 'Unbounded', weight: 500 },
    { name: 'Syne', weight: 600 },
    { name: 'Bricolage Grotesque', weight: 500, italic: true },
    { name: 'Fraunces', weight: 500, italic: true },
  ],
};

export const STYLE_CARDS: StyleCardDef[] = [
  {
    id: 'card_minimal',
    label: 'Minimal',
    families: ['swiss_minimal', 'luxury_quiet'],
    bg: '#f5f4ef',
    fg: '#0a0a0a',
    muted: '#8a8a86',
    nameSize: 16,
    signature: { text: '™ MINIMAL', size: 7.5, tracking: '0.2em', transform: 'uppercase', weight: 500 },
  },
  {
    id: 'card_volume',
    label: 'Editorial',
    families: ['editorial_serif', 'luxury_quiet'],
    bg: '#ebe5d6',
    fg: '#181818',
    muted: '#5a5a56',
    nameSize: 22,
    forceItalic: true,
    signature: { text: '— Vol I', size: 9, italic: true, font: "'Instrument Serif', serif" },
  },
  {
    id: 'card_index',
    label: 'Index',
    families: ['editorial_serif', 'swiss_minimal'],
    bg: '#f7f5f0',
    fg: '#0f0f0f',
    muted: '#6a6a64',
    nameSize: 18,
    nameUnderline: true,
    signature: { text: '——— NO. 01', size: 7, tracking: '0.1em', transform: 'uppercase', weight: 500 },
  },
  {
    id: 'card_system',
    label: 'System',
    families: ['brutalist', 'tech_mono'],
    bg: '#0d0d0d',
    fg: '#e8e8e5',
    muted: '#787874',
    nameSize: 14,
    signature: { text: '> system.v1', size: 7, font: "'IBM Plex Mono', monospace" },
  },
  {
    id: 'card_maison',
    label: 'Maison',
    families: ['art_deco', 'editorial_serif'],
    bg: '#0a0a0a',
    fg: '#f5f4f0',
    muted: '#8a8a86',
    nameSize: 18,
    nameTracking: '0.02em',
    mark: { type: 'line', color: '#8a8a86' },
    signature: {
      text: 'MAISON',
      size: 7.5,
      tracking: '0.35em',
      transform: 'uppercase',
      font: "'Inter', sans-serif",
      weight: 500,
    },
  },
  {
    id: 'card_an_index',
    label: 'Postmodern',
    families: ['postmodern', 'editorial_serif'],
    bg: 'linear-gradient(135deg, #e8e8e3 0%, #cfcfc8 100%)',
    fg: '#1a1a1a',
    muted: '#4a4a46',
    nameSize: 17,
    mark: { type: 'bigring', color: '#1a1a1a' },
    signature: { text: 'hi.', size: 11, italic: true, font: "'Instrument Serif', serif" },
  },
];

export function poolForCard(card: StyleCardDef): FontDef[] {
  const out: FontDef[] = [];
  card.families.forEach((f) => {
    (FAMILY_FONTS[f] || []).forEach((fn) => out.push(fn));
  });
  return out.length ? out : [{ name: 'Inter', weight: 500 }];
}

export function fontStack(font: FontDef, families: string[]): string {
  const isMono = families.includes('tech_mono');
  const isSerif = families.includes('editorial_serif') || families.includes('art_deco');
  const fallback = isMono ? 'ui-monospace, monospace' : isSerif ? 'Georgia, serif' : 'system-ui, sans-serif';
  return `'${font.name}', ${fallback}`;
}
