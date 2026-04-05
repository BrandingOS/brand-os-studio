/**
 * Curated color palettes sourced from:
 * - Tailwind CSS 3.4 default palette
 * - Open Color 1.9
 * - Material Design color system
 * - Radix UI Colors
 * - Classic branding combinations
 *
 * Each palette has: name, source, category, 5 colors, and a
 * recommended primary + accent pair for logo presentations.
 */

export interface CuratedPalette {
  name: string;
  source: string;
  category: PaletteCategory;
  colors: [string, string, string, string, string];
  /** Recommended primary color (dark/rich) */
  primary: string;
  /** Recommended accent color (vibrant) */
  accent: string;
}

export type PaletteCategory =
  | 'All'
  | 'Corporate'
  | 'Warm'
  | 'Cool'
  | 'Nature'
  | 'Luxury'
  | 'Pastel'
  | 'Vibrant'
  | 'Earthy'
  | 'Minimal';

export const PALETTE_CATEGORIES: PaletteCategory[] = [
  'All',
  'Corporate',
  'Warm',
  'Cool',
  'Nature',
  'Luxury',
  'Pastel',
  'Vibrant',
  'Earthy',
  'Minimal',
];

export const CURATED_PALETTES: CuratedPalette[] = [
  // ── Corporate ─────────────────────────────────────────
  {
    name: 'Slate Professional',
    source: 'Tailwind CSS',
    category: 'Corporate',
    colors: ['#1e293b', '#475569', '#64748b', '#94a3b8', '#f1f5f9'],
    primary: '#1e293b',
    accent: '#3b82f6',
  },
  {
    name: 'Executive Gray',
    source: 'Tailwind CSS',
    category: 'Corporate',
    colors: ['#111827', '#1f2937', '#374151', '#6b7280', '#f9fafb'],
    primary: '#111827',
    accent: '#6b7280',
  },
  {
    name: 'Trustworthy Blue',
    source: 'Tailwind CSS',
    category: 'Corporate',
    colors: ['#1e40af', '#2563eb', '#3b82f6', '#93c5fd', '#eff6ff'],
    primary: '#1e40af',
    accent: '#3b82f6',
  },
  {
    name: 'Steel & Navy',
    source: 'Tailwind CSS',
    category: 'Corporate',
    colors: ['#0f172a', '#1e3a5f', '#3b82f6', '#94a3b8', '#f8fafc'],
    primary: '#0f172a',
    accent: '#3b82f6',
  },
  {
    name: 'Charcoal Ink',
    source: 'Tailwind CSS',
    category: 'Corporate',
    colors: ['#18181b', '#27272a', '#3f3f46', '#71717a', '#fafafa'],
    primary: '#18181b',
    accent: '#71717a',
  },
  {
    name: 'Material Blue Grey',
    source: 'Material Design',
    category: 'Corporate',
    colors: ['#37474f', '#607d8b', '#78909c', '#b0bec5', '#eceff1'],
    primary: '#37474f',
    accent: '#607d8b',
  },
  {
    name: 'Open Color Gray',
    source: 'Open Color',
    category: 'Corporate',
    colors: ['#212529', '#495057', '#868e96', '#ced4da', '#f8f9fa'],
    primary: '#212529',
    accent: '#495057',
  },
  {
    name: 'Indigo Authority',
    source: 'Material Design',
    category: 'Corporate',
    colors: ['#283593', '#3f51b5', '#5c6bc0', '#9fa8da', '#e8eaf6'],
    primary: '#283593',
    accent: '#5c6bc0',
  },

  // ── Warm ──────────────────────────────────────────────
  {
    name: 'Sunset Orange',
    source: 'Tailwind CSS',
    category: 'Warm',
    colors: ['#9a3412', '#ea580c', '#f97316', '#fdba74', '#fff7ed'],
    primary: '#9a3412',
    accent: '#f97316',
  },
  {
    name: 'Amber Heat',
    source: 'Tailwind CSS',
    category: 'Warm',
    colors: ['#92400e', '#d97706', '#f59e0b', '#fcd34d', '#fef3c7'],
    primary: '#92400e',
    accent: '#f59e0b',
  },
  {
    name: 'Crimson Flame',
    source: 'Tailwind CSS',
    category: 'Warm',
    colors: ['#991b1b', '#dc2626', '#ef4444', '#fca5a5', '#fee2e2'],
    primary: '#991b1b',
    accent: '#ef4444',
  },
  {
    name: 'Rose Blush',
    source: 'Tailwind CSS',
    category: 'Warm',
    colors: ['#9f1239', '#e11d48', '#f43f5e', '#fda4af', '#fff1f2'],
    primary: '#9f1239',
    accent: '#f43f5e',
  },
  {
    name: 'Open Color Red',
    source: 'Open Color',
    category: 'Warm',
    colors: ['#c92a2a', '#f03e3e', '#ff6b6b', '#ffa8a8', '#fff5f5'],
    primary: '#c92a2a',
    accent: '#ff6b6b',
  },
  {
    name: 'Open Color Orange',
    source: 'Open Color',
    category: 'Warm',
    colors: ['#d9480f', '#f76707', '#ffa94d', '#ffd8a8', '#fff4e6'],
    primary: '#d9480f',
    accent: '#ff8c00',
  },
  {
    name: 'Material Deep Orange',
    source: 'Material Design',
    category: 'Warm',
    colors: ['#bf360c', '#e64a19', '#ff5722', '#ff8a65', '#fbe9e7'],
    primary: '#bf360c',
    accent: '#ff5722',
  },
  {
    name: 'Golden Hour',
    source: 'Tailwind CSS',
    category: 'Warm',
    colors: ['#78350f', '#b45309', '#d97706', '#fbbf24', '#fef3c7'],
    primary: '#78350f',
    accent: '#fbbf24',
  },

  // ── Cool ──────────────────────────────────────────────
  {
    name: 'Ocean Sky',
    source: 'Tailwind CSS',
    category: 'Cool',
    colors: ['#075985', '#0284c7', '#0ea5e9', '#7dd3fc', '#e0f2fe'],
    primary: '#075985',
    accent: '#0ea5e9',
  },
  {
    name: 'Arctic Blue',
    source: 'Tailwind CSS',
    category: 'Cool',
    colors: ['#1e40af', '#2563eb', '#3b82f6', '#93c5fd', '#dbeafe'],
    primary: '#1e40af',
    accent: '#3b82f6',
  },
  {
    name: 'Cyan Current',
    source: 'Tailwind CSS',
    category: 'Cool',
    colors: ['#155e75', '#0891b2', '#06b6d4', '#67e8f9', '#cffafe'],
    primary: '#155e75',
    accent: '#06b6d4',
  },
  {
    name: 'Indigo Depth',
    source: 'Tailwind CSS',
    category: 'Cool',
    colors: ['#3730a3', '#4f46e5', '#6366f1', '#a5b4fc', '#e0e7ff'],
    primary: '#3730a3',
    accent: '#6366f1',
  },
  {
    name: 'Open Color Blue',
    source: 'Open Color',
    category: 'Cool',
    colors: ['#1864ab', '#1c7ed6', '#4dabf7', '#a5d8ff', '#e7f5ff'],
    primary: '#1864ab',
    accent: '#4dabf7',
  },
  {
    name: 'Open Color Cyan',
    source: 'Open Color',
    category: 'Cool',
    colors: ['#0b7285', '#1098ad', '#3bc9db', '#99e9f2', '#e3fafc'],
    primary: '#0b7285',
    accent: '#3bc9db',
  },
  {
    name: 'Radix Blue',
    source: 'Radix Colors',
    category: 'Cool',
    colors: ['#113264', '#0d74ce', '#0090ff', '#70b8ff', '#d5efff'],
    primary: '#113264',
    accent: '#0090ff',
  },
  {
    name: 'Deep Sea',
    source: 'Tailwind CSS',
    category: 'Cool',
    colors: ['#164e63', '#155e75', '#0e7490', '#22d3ee', '#a5f3fc'],
    primary: '#164e63',
    accent: '#22d3ee',
  },

  // ── Nature ────────────────────────────────────────────
  {
    name: 'Emerald Forest',
    source: 'Tailwind CSS',
    category: 'Nature',
    colors: ['#065f46', '#059669', '#10b981', '#6ee7b7', '#ecfdf5'],
    primary: '#065f46',
    accent: '#10b981',
  },
  {
    name: 'Green Valley',
    source: 'Tailwind CSS',
    category: 'Nature',
    colors: ['#166534', '#16a34a', '#22c55e', '#86efac', '#f0fdf4'],
    primary: '#166534',
    accent: '#22c55e',
  },
  {
    name: 'Teal Lagoon',
    source: 'Tailwind CSS',
    category: 'Nature',
    colors: ['#115e59', '#0d9488', '#14b8a6', '#5eead4', '#ccfbf1'],
    primary: '#115e59',
    accent: '#14b8a6',
  },
  {
    name: 'Lime Canopy',
    source: 'Tailwind CSS',
    category: 'Nature',
    colors: ['#3f6212', '#65a30d', '#84cc16', '#bef264', '#ecfccb'],
    primary: '#3f6212',
    accent: '#84cc16',
  },
  {
    name: 'Open Color Teal',
    source: 'Open Color',
    category: 'Nature',
    colors: ['#087f5b', '#0ca678', '#38d9a9', '#96f2d7', '#e6fcf5'],
    primary: '#087f5b',
    accent: '#38d9a9',
  },
  {
    name: 'Open Color Green',
    source: 'Open Color',
    category: 'Nature',
    colors: ['#2b8a3e', '#37b24d', '#69db7c', '#b2f2bb', '#ebfbee'],
    primary: '#2b8a3e',
    accent: '#69db7c',
  },
  {
    name: 'Radix Grass',
    source: 'Radix Colors',
    category: 'Nature',
    colors: ['#1b311e', '#297c3b', '#46a758', '#65ba74', '#c9e8cf'],
    primary: '#297c3b',
    accent: '#46a758',
  },
  {
    name: 'Material Teal',
    source: 'Material Design',
    category: 'Nature',
    colors: ['#00695c', '#00897b', '#009688', '#4db6ac', '#e0f2f1'],
    primary: '#00695c',
    accent: '#009688',
  },

  // ── Luxury ────────────────────────────────────────────
  {
    name: 'Black & Gold',
    source: 'Classic Branding',
    category: 'Luxury',
    colors: ['#0a0a0a', '#1c1917', '#b45309', '#d97706', '#f5f5f4'],
    primary: '#0a0a0a',
    accent: '#d97706',
  },
  {
    name: 'Burgundy Velvet',
    source: 'Tailwind CSS',
    category: 'Luxury',
    colors: ['#4c0519', '#881337', '#be123c', '#fb7185', '#fff1f2'],
    primary: '#4c0519',
    accent: '#be123c',
  },
  {
    name: 'Royal Purple',
    source: 'Tailwind CSS',
    category: 'Luxury',
    colors: ['#3b0764', '#7e22ce', '#a855f7', '#d8b4fe', '#faf5ff'],
    primary: '#3b0764',
    accent: '#a855f7',
  },
  {
    name: 'Sapphire Night',
    source: 'Tailwind CSS',
    category: 'Luxury',
    colors: ['#172554', '#1e3a8a', '#2563eb', '#93c5fd', '#eff6ff'],
    primary: '#172554',
    accent: '#2563eb',
  },
  {
    name: 'Champagne & Noir',
    source: 'Classic Branding',
    category: 'Luxury',
    colors: ['#1c1917', '#292524', '#a8a29e', '#d6d3d1', '#fafaf9'],
    primary: '#1c1917',
    accent: '#a8a29e',
  },
  {
    name: 'Radix Gold',
    source: 'Radix Colors',
    category: 'Luxury',
    colors: ['#3b2100', '#ad5700', '#ffb224', '#fdd870', '#fff9ed'],
    primary: '#3b2100',
    accent: '#ffb224',
  },
  {
    name: 'Emerald Estate',
    source: 'Tailwind CSS',
    category: 'Luxury',
    colors: ['#064e3b', '#065f46', '#059669', '#34d399', '#ecfdf5'],
    primary: '#064e3b',
    accent: '#059669',
  },
  {
    name: 'Deep Amethyst',
    source: 'Tailwind CSS',
    category: 'Luxury',
    colors: ['#5b21b6', '#7c3aed', '#8b5cf6', '#c4b5fd', '#ede9fe'],
    primary: '#5b21b6',
    accent: '#8b5cf6',
  },

  // ── Pastel ────────────────────────────────────────────
  {
    name: 'Cotton Candy',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#f9a8d4', '#c4b5fd', '#a5f3fc', '#fde68a', '#fbcfe8'],
    primary: '#db2777',
    accent: '#f9a8d4',
  },
  {
    name: 'Soft Lavender',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
    primary: '#7c3aed',
    accent: '#a78bfa',
  },
  {
    name: 'Blush & Lilac',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#fbcfe8', '#f0abfc', '#d8b4fe', '#c4b5fd', '#fdf2f8'],
    primary: '#a21caf',
    accent: '#f0abfc',
  },
  {
    name: 'Spring Garden',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#bbf7d0', '#a7f3d0', '#99f6e4', '#a5f3fc', '#bae6fd'],
    primary: '#059669',
    accent: '#a7f3d0',
  },
  {
    name: 'Open Color Pink',
    source: 'Open Color',
    category: 'Pastel',
    colors: ['#e64980', '#f783ac', '#faa2c1', '#fcc2d7', '#fff0f6'],
    primary: '#c2255c',
    accent: '#f783ac',
  },
  {
    name: 'Sorbet',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#fda4af', '#fde68a', '#bbf7d0', '#bae6fd', '#e9d5ff'],
    primary: '#e11d48',
    accent: '#fda4af',
  },
  {
    name: 'Material Light Blue',
    source: 'Material Design',
    category: 'Pastel',
    colors: ['#29b6f6', '#4fc3f7', '#81d4fa', '#b3e5fc', '#e1f5fe'],
    primary: '#0288d1',
    accent: '#4fc3f7',
  },
  {
    name: 'Morning Mist',
    source: 'Tailwind CSS',
    category: 'Pastel',
    colors: ['#a5b4fc', '#c7d2fe', '#e0e7ff', '#fae8ff', '#fdf4ff'],
    primary: '#4f46e5',
    accent: '#a5b4fc',
  },

  // ── Vibrant ───────────────────────────────────────────
  {
    name: 'Electric Violet',
    source: 'Tailwind CSS',
    category: 'Vibrant',
    colors: ['#5b21b6', '#7c3aed', '#8b5cf6', '#a855f7', '#c084fc'],
    primary: '#5b21b6',
    accent: '#a855f7',
  },
  {
    name: 'Hot Pink',
    source: 'Tailwind CSS',
    category: 'Vibrant',
    colors: ['#9d174d', '#db2777', '#ec4899', '#f472b6', '#f9a8d4'],
    primary: '#9d174d',
    accent: '#ec4899',
  },
  {
    name: 'Fuchsia Surge',
    source: 'Tailwind CSS',
    category: 'Vibrant',
    colors: ['#86198f', '#c026d3', '#d946ef', '#e879f9', '#f0abfc'],
    primary: '#86198f',
    accent: '#d946ef',
  },
  {
    name: 'Neon Lime',
    source: 'Tailwind CSS',
    category: 'Vibrant',
    colors: ['#3f6212', '#65a30d', '#84cc16', '#a3e635', '#bef264'],
    primary: '#3f6212',
    accent: '#a3e635',
  },
  {
    name: 'Laser Green',
    source: 'Tailwind CSS',
    category: 'Vibrant',
    colors: ['#166534', '#16a34a', '#22c55e', '#4ade80', '#86efac'],
    primary: '#166534',
    accent: '#4ade80',
  },
  {
    name: 'Radix Violet',
    source: 'Radix Colors',
    category: 'Vibrant',
    colors: ['#2f265f', '#6e56cf', '#8e4ec6', '#ab68ff', '#d19dff'],
    primary: '#2f265f',
    accent: '#8e4ec6',
  },
  {
    name: 'Open Color Grape',
    source: 'Open Color',
    category: 'Vibrant',
    colors: ['#862e9c', '#ae3ec9', '#da77f2', '#e599f7', '#f3d9fa'],
    primary: '#862e9c',
    accent: '#da77f2',
  },
  {
    name: 'Open Color Indigo',
    source: 'Open Color',
    category: 'Vibrant',
    colors: ['#364fc7', '#4263eb', '#748ffc', '#91a7ff', '#dbe4ff'],
    primary: '#364fc7',
    accent: '#748ffc',
  },

  // ── Earthy ────────────────────────────────────────────
  {
    name: 'Warm Stone',
    source: 'Tailwind CSS',
    category: 'Earthy',
    colors: ['#292524', '#44403c', '#78716c', '#a8a29e', '#f5f5f4'],
    primary: '#292524',
    accent: '#78716c',
  },
  {
    name: 'Desert Sand',
    source: 'Tailwind CSS',
    category: 'Earthy',
    colors: ['#57534e', '#78716c', '#a8a29e', '#d6d3d1', '#fafaf9'],
    primary: '#44403c',
    accent: '#a8a29e',
  },
  {
    name: 'Rust & Clay',
    source: 'Tailwind CSS',
    category: 'Earthy',
    colors: ['#7c2d12', '#9a3412', '#c2410c', '#fb923c', '#ffedd5'],
    primary: '#7c2d12',
    accent: '#c2410c',
  },
  {
    name: 'Olive Grove',
    source: 'Tailwind CSS',
    category: 'Earthy',
    colors: ['#365314', '#4d7c0f', '#65a30d', '#a16207', '#fef9c3'],
    primary: '#365314',
    accent: '#65a30d',
  },
  {
    name: 'Material Brown',
    source: 'Material Design',
    category: 'Earthy',
    colors: ['#4e342e', '#795548', '#a1887f', '#bcaaa4', '#efebe9'],
    primary: '#4e342e',
    accent: '#795548',
  },
  {
    name: 'Autumn Harvest',
    source: 'Tailwind CSS',
    category: 'Earthy',
    colors: ['#451a03', '#78350f', '#b45309', '#d97706', '#fde68a'],
    primary: '#78350f',
    accent: '#d97706',
  },
  {
    name: 'Open Color Yellow',
    source: 'Open Color',
    category: 'Earthy',
    colors: ['#e67700', '#f59f00', '#fcc419', '#ffd43b', '#fff9db'],
    primary: '#e67700',
    accent: '#fcc419',
  },
  {
    name: 'Clay & Sage',
    source: 'Classic Branding',
    category: 'Earthy',
    colors: ['#292524', '#92400e', '#4d7c0f', '#a8a29e', '#fafaf9'],
    primary: '#292524',
    accent: '#4d7c0f',
  },

  // ── Minimal ───────────────────────────────────────────
  {
    name: 'Pure Zinc',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#18181b', '#27272a', '#52525b', '#a1a1aa', '#fafafa'],
    primary: '#18181b',
    accent: '#52525b',
  },
  {
    name: 'Neutral Tone',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#171717', '#262626', '#525252', '#a3a3a3', '#fafafa'],
    primary: '#171717',
    accent: '#525252',
  },
  {
    name: 'Silver Ink',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#111827', '#374151', '#6b7280', '#d1d5db', '#f9fafb'],
    primary: '#111827',
    accent: '#6b7280',
  },
  {
    name: 'Mono Warm',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#1c1917', '#44403c', '#78716c', '#d6d3d1', '#fafaf9'],
    primary: '#1c1917',
    accent: '#78716c',
  },
  {
    name: 'Black & White',
    source: 'Classic Branding',
    category: 'Minimal',
    colors: ['#000000', '#27272a', '#71717a', '#d4d4d8', '#ffffff'],
    primary: '#000000',
    accent: '#71717a',
  },
  {
    name: 'Ink & Paper',
    source: 'Classic Branding',
    category: 'Minimal',
    colors: ['#0f172a', '#334155', '#94a3b8', '#e2e8f0', '#f8fafc'],
    primary: '#0f172a',
    accent: '#94a3b8',
  },
  {
    name: 'Smoke',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#1f2937', '#374151', '#4b5563', '#9ca3af', '#f3f4f6'],
    primary: '#1f2937',
    accent: '#4b5563',
  },
  {
    name: 'Concrete',
    source: 'Tailwind CSS',
    category: 'Minimal',
    colors: ['#27272a', '#3f3f46', '#71717a', '#d4d4d8', '#fafafa'],
    primary: '#27272a',
    accent: '#71717a',
  },
];
