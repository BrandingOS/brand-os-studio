import type { BentoTemplate } from './types';

/**
 * Seed bento templates — 15 layouts covering square, portrait, landscape.
 * Each tile has a *hint* kind that shuffle can override.
 */

let _id = 0;
const t = (row: number, col: number, rowSpan: number, colSpan: number, kind: BentoTemplate['tiles'][number]['kind']) => ({
  id: `t-${++_id}`,
  row,
  col,
  rowSpan,
  colSpan,
  kind,
});

// Helper to reset ids per-template so template-swap produces stable keys.
function tiles(arr: Array<[number, number, number, number, BentoTemplate['tiles'][number]['kind']]>): BentoTemplate['tiles'] {
  return arr.map((a, i) => ({
    id: `t-${i}`,
    row: a[0],
    col: a[1],
    rowSpan: a[2],
    colSpan: a[3],
    kind: a[4],
  }));
}

export const TEMPLATES: BentoTemplate[] = [
  {
    id: 'classic-2x2-hero',
    name: 'Classic Hero',
    cols: 3, rows: 3,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 2, 2, 'logo'],
      [1, 3, 1, 1, 'color'],
      [2, 3, 1, 1, 'typography'],
      [3, 1, 1, 1, 'gradient'],
      [3, 2, 1, 1, 'voice-quote'],
      [3, 3, 1, 1, 'color'],
    ]),
  },
  {
    id: 'apple-asymmetric',
    name: 'Asymmetric',
    cols: 4, rows: 4,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 2, 2, 'asset-image'],
      [1, 3, 1, 2, 'voice-quote'],
      [2, 3, 2, 1, 'color'],
      [2, 4, 1, 1, 'typography'],
      [3, 1, 1, 1, 'color'],
      [3, 2, 2, 1, 'gradient'],
      [3, 4, 2, 1, 'stat'],
      [4, 1, 1, 1, 'pattern'],
      [4, 3, 1, 1, 'logo'],
    ]),
  },
  {
    id: 'mosaic-4x4',
    name: 'Mosaic',
    cols: 4, rows: 4,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 1, 1, 'color'],
      [1, 2, 1, 2, 'voice-quote'],
      [1, 4, 2, 1, 'gradient'],
      [2, 1, 2, 1, 'typography'],
      [2, 2, 2, 2, 'logo'],
      [3, 4, 2, 1, 'asset-image'],
      [4, 1, 1, 1, 'color'],
      [4, 2, 1, 1, 'pattern'],
      [4, 3, 1, 1, 'color'],
    ]),
  },
  {
    id: 'headline-row',
    name: 'Headline',
    cols: 3, rows: 3,
    preferredAspect: 'any',
    tiles: tiles([
      [1, 1, 1, 3, 'voice-quote'],
      [2, 1, 2, 1, 'logo'],
      [2, 2, 1, 1, 'color'],
      [2, 3, 1, 1, 'typography'],
      [3, 2, 1, 2, 'gradient'],
    ]),
  },
  {
    id: 'trio',
    name: 'Trio',
    cols: 3, rows: 2,
    preferredAspect: 'landscape',
    tiles: tiles([
      [1, 1, 2, 1, 'logo'],
      [1, 2, 1, 1, 'voice-quote'],
      [1, 3, 1, 1, 'color'],
      [2, 2, 1, 1, 'typography'],
      [2, 3, 1, 1, 'gradient'],
    ]),
  },
  {
    id: 'story-stack',
    name: 'Story Stack',
    cols: 2, rows: 5,
    preferredAspect: 'portrait',
    tiles: tiles([
      [1, 1, 2, 2, 'logo'],
      [3, 1, 1, 1, 'color'],
      [3, 2, 1, 1, 'gradient'],
      [4, 1, 1, 2, 'voice-quote'],
      [5, 1, 1, 1, 'typography'],
      [5, 2, 1, 1, 'color'],
    ]),
  },
  {
    id: 'poster-1',
    name: 'Poster',
    cols: 3, rows: 5,
    preferredAspect: 'portrait',
    tiles: tiles([
      [1, 1, 2, 3, 'voice-quote'],
      [3, 1, 2, 2, 'logo'],
      [3, 3, 1, 1, 'color'],
      [4, 3, 1, 1, 'gradient'],
      [5, 1, 1, 1, 'typography'],
      [5, 2, 1, 1, 'stat'],
      [5, 3, 1, 1, 'pattern'],
    ]),
  },
  {
    id: 'wide-banner',
    name: 'Wide Banner',
    cols: 5, rows: 2,
    preferredAspect: 'landscape',
    tiles: tiles([
      [1, 1, 2, 2, 'logo'],
      [1, 3, 1, 1, 'color'],
      [1, 4, 1, 1, 'typography'],
      [1, 5, 2, 1, 'gradient'],
      [2, 3, 1, 1, 'voice-quote'],
      [2, 4, 1, 1, 'pattern'],
    ]),
  },
  {
    id: 'quarters',
    name: 'Quarters',
    cols: 2, rows: 2,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 1, 1, 'logo'],
      [1, 2, 1, 1, 'gradient'],
      [2, 1, 1, 1, 'voice-quote'],
      [2, 2, 1, 1, 'color'],
    ]),
  },
  {
    id: 'feature-five',
    name: 'Feature Five',
    cols: 3, rows: 3,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 2, 1, 'color'],
      [1, 2, 1, 2, 'logo'],
      [2, 2, 2, 2, 'asset-image'],
      [3, 1, 1, 1, 'typography'],
    ]),
  },
  {
    id: 'broadcast',
    name: 'Broadcast',
    cols: 4, rows: 3,
    preferredAspect: 'landscape',
    tiles: tiles([
      [1, 1, 2, 2, 'voice-quote'],
      [1, 3, 1, 2, 'logo'],
      [2, 3, 1, 1, 'color'],
      [2, 4, 1, 1, 'typography'],
      [3, 1, 1, 1, 'color'],
      [3, 2, 1, 1, 'gradient'],
      [3, 3, 1, 2, 'pattern'],
    ]),
  },
  {
    id: 'grid-9',
    name: 'Grid 9',
    cols: 3, rows: 3,
    preferredAspect: 'square',
    tiles: tiles([
      [1, 1, 1, 1, 'color'],
      [1, 2, 1, 1, 'logo'],
      [1, 3, 1, 1, 'color'],
      [2, 1, 1, 1, 'voice-quote'],
      [2, 2, 1, 1, 'typography'],
      [2, 3, 1, 1, 'gradient'],
      [3, 1, 1, 1, 'pattern'],
      [3, 2, 1, 1, 'color'],
      [3, 3, 1, 1, 'stat'],
    ]),
  },
  {
    id: 'accent-sidebar',
    name: 'Accent Sidebar',
    cols: 4, rows: 3,
    preferredAspect: 'landscape',
    tiles: tiles([
      [1, 1, 3, 1, 'gradient'],
      [1, 2, 2, 3, 'logo'],
      [3, 2, 1, 1, 'color'],
      [3, 3, 1, 1, 'typography'],
      [3, 4, 1, 1, 'voice-quote'],
    ]),
  },
  {
    id: 'magazine',
    name: 'Magazine',
    cols: 3, rows: 4,
    preferredAspect: 'portrait',
    tiles: tiles([
      [1, 1, 1, 2, 'voice-quote'],
      [1, 3, 2, 1, 'asset-image'],
      [2, 1, 1, 1, 'color'],
      [2, 2, 1, 1, 'typography'],
      [3, 1, 1, 2, 'logo'],
      [3, 3, 1, 1, 'gradient'],
      [4, 1, 1, 1, 'pattern'],
      [4, 2, 1, 1, 'stat'],
      [4, 3, 1, 1, 'color'],
    ]),
  },
  {
    id: 'minimal-3',
    name: 'Minimal Three',
    cols: 3, rows: 2,
    preferredAspect: 'landscape',
    tiles: tiles([
      [1, 1, 2, 2, 'logo'],
      [1, 3, 1, 1, 'color'],
      [2, 3, 1, 1, 'voice-quote'],
    ]),
  },
];

export function getTemplate(id: string): BentoTemplate {
  return TEMPLATES.find((tpl) => tpl.id === id) ?? TEMPLATES[0];
}
