/**
 * Signature category — 10 generative shapes.
 *
 * Each shape supplies a procedural SVG pattern body. The slide wrapper
 * (renderer) owns the brand-flood background, top-corner logo and
 * bottom-anchored "A pattern only X could wear" headline so chrome
 * stays consistent across compositions.
 *
 * All shapes are seeded by `profile.id + profile.name + shape.id` for
 * deterministic output — same brand always gets the same artwork.
 */

import { createElement } from 'react';
import { seedRandom } from '../utils';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  helpers  ─────────────────────── */

const CANVAS_W = 1920;
const CANVAS_H = 1080;

function brandSwatches(profile: ShapeRenderProps['profile']): string[] {
  const swatches = profile.palette.swatches.slice(0, 4).map((s) => s.hex);
  if (swatches.length < 2) swatches.push(profile.palette.ink);
  return swatches;
}

function pickColor(rand: () => number, swatches: string[]): string {
  return swatches[Math.floor(rand() * swatches.length)] ?? swatches[0];
}

/** Wrap pattern children in the standard svg surface used by every signature shape. */
function patternSvg(children: any) {
  return h(
    'svg',
    {
      viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}`,
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'multiply' },
    },
    children,
  );
}

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const SIGNATURE_SHAPES: SlideShape[] = [
  {
    id: 'tessellation',
    name: 'Tessellation',
    description: 'Rotated squares · arcs · circles in a brand-flood grid.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'tessellation');
      const swatches = brandSwatches(profile);
      const cols = 12;
      const rows = 7;
      const size = 130;
      const startX = (CANVAS_W - cols * size) / 2;
      const startY = (CANVAS_H - rows * size) / 2;
      const tiles: any[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * size;
          const y = startY + r * size;
          const roll = rand();
          const color = pickColor(rand, swatches);
          if (roll < 0.3) tiles.push(h('rect', { key: `s-${r}-${c}`, x: x + 22, y: y + 22, width: size - 44, height: size - 44, fill: color, opacity: 0.85 }));
          else if (roll < 0.6) tiles.push(h('circle', { key: `c-${r}-${c}`, cx: x + size / 2, cy: y + size / 2, r: size * 0.28, fill: color, opacity: 0.85 }));
          else if (roll < 0.78) tiles.push(h('path', { key: `a-${r}-${c}`, d: `M ${x} ${y + size} A ${size} ${size} 0 0 1 ${x + size} ${y}`, fill: 'none', stroke: color, strokeWidth: Math.max(6, Math.floor(rand() * 18)), strokeLinecap: 'round', opacity: 0.9 }));
        }
      }
      return patternSvg(tiles);
    },
  },

  {
    id: 'radial-bursts',
    name: 'Radial Bursts',
    description: 'Concentric rings + colored swatch dots radiating from center.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'radial-bursts');
      const swatches = brandSwatches(profile);
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const els: any[] = [];
      for (let i = 1; i <= 18; i++) {
        els.push(h('circle', { key: `r-${i}`, cx, cy, r: i * 32, fill: 'none', stroke: pickColor(rand, swatches), strokeWidth: 2, opacity: 0.4 }));
      }
      for (let i = 0; i < 60; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = 60 + rand() * (CANVAS_H * 0.45);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const r = 8 + rand() * 26;
        els.push(h('circle', { key: `d-${i}`, cx: x, cy: y, r, fill: pickColor(rand, swatches), opacity: 0.85 }));
      }
      return patternSvg(els);
    },
  },

  {
    id: 'glyph-wall',
    name: 'Glyph Wall',
    description: 'The brand initial repeated across a tilted grid.',
    render: ({ profile, fonts }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'glyph-wall');
      const swatches = brandSwatches(profile);
      const initial = (profile.name?.[0] ?? 'A').toUpperCase();
      const cols = 8;
      const rows = 5;
      const cellW = CANVAS_W / cols;
      const cellH = CANVAS_H / rows;
      const els: any[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellW + cellW / 2;
          const y = r * cellH + cellH / 2 + 40;
          const tilt = (rand() - 0.5) * 30;
          const fill = rand() < 0.3 ? pickColor(rand, swatches) : '#0A0A0A';
          els.push(h('text', { key: `g-${r}-${c}`, x, y, textAnchor: 'middle', fill, opacity: 0.75, transform: `rotate(${tilt} ${x} ${y})`, style: { fontFamily: fonts.heading, fontWeight: 800, fontSize: 160, letterSpacing: '-0.04em' } as any }, initial));
        }
      }
      return patternSvg(els);
    },
  },

  {
    id: 'flow-field',
    name: 'Flow Field',
    description: 'Sinusoidal ribbon polylines flowing across the canvas.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'flow-field');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      const lines = 22;
      for (let i = 0; i < lines; i++) {
        const yBase = (CANVAS_H / lines) * i + 20;
        const amp = 30 + rand() * 90;
        const freq = 0.005 + rand() * 0.005;
        const phase = rand() * Math.PI * 2;
        const points: string[] = [];
        for (let x = 0; x <= CANVAS_W; x += 24) {
          const y = yBase + Math.sin(x * freq + phase) * amp;
          points.push(`${x},${y}`);
        }
        els.push(h('polyline', { key: `f-${i}`, points: points.join(' '), stroke: pickColor(rand, swatches), strokeWidth: 3 + rand() * 4, fill: 'none', opacity: 0.75, strokeLinecap: 'round' }));
      }
      return patternSvg(els);
    },
  },

  {
    id: 'voronoi-cells',
    name: 'Voronoi Cells',
    description: 'Voronoi-like organic cell partitions across the canvas.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'voronoi-cells');
      const swatches = brandSwatches(profile);
      const points: { x: number; y: number; color: string }[] = [];
      const N = 28;
      for (let i = 0; i < N; i++) {
        points.push({ x: rand() * CANVAS_W, y: rand() * CANVAS_H, color: pickColor(rand, swatches) });
      }
      const els: any[] = [];
      const step = 36;
      for (let y = 0; y < CANVAS_H; y += step) {
        for (let x = 0; x < CANVAS_W; x += step) {
          let best = 0;
          let bestD = Infinity;
          for (let i = 0; i < N; i++) {
            const dx = points[i].x - x;
            const dy = points[i].y - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = i; }
          }
          els.push(h('rect', { key: `v-${x}-${y}`, x, y, width: step, height: step, fill: points[best].color, opacity: 0.85 }));
        }
      }
      return patternSvg(els);
    },
  },

  {
    id: 'dot-matrix',
    name: 'Dot Matrix',
    description: 'Dense dot grid with size + color variance.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'dot-matrix');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      const cols = 32;
      const rows = 18;
      const cellW = CANVAS_W / cols;
      const cellH = CANVAS_H / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const dx = cx - CANVAS_W / 2;
          const dy = cy - CANVAS_H / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) / (CANVAS_W / 2);
          const radius = 4 + (1 - dist) * 22 * (0.5 + rand() * 0.6);
          els.push(h('circle', { key: `d-${r}-${c}`, cx, cy, r: Math.max(2, radius), fill: pickColor(rand, swatches), opacity: 0.9 }));
        }
      }
      return patternSvg(els);
    },
  },

  {
    id: 'dna-helix',
    name: 'DNA Helix',
    description: 'Two interweaving curves with rung connectors.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'dna-helix');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      const helices = 5;
      for (let hIdx = 0; hIdx < helices; hIdx++) {
        const yBase = (CANVAS_H / (helices + 1)) * (hIdx + 1);
        const amp = 80 + rand() * 30;
        const freq = 0.006 + rand() * 0.002;
        const phase = rand() * Math.PI * 2;
        const c1 = pickColor(rand, swatches);
        const c2 = pickColor(rand, swatches);
        const path1: string[] = [];
        const path2: string[] = [];
        for (let x = 0; x <= CANVAS_W; x += 20) {
          path1.push(`${x},${yBase + Math.sin(x * freq + phase) * amp}`);
          path2.push(`${x},${yBase - Math.sin(x * freq + phase) * amp}`);
        }
        els.push(h('polyline', { key: `h1-${hIdx}`, points: path1.join(' '), stroke: c1, strokeWidth: 4, fill: 'none', opacity: 0.85 }));
        els.push(h('polyline', { key: `h2-${hIdx}`, points: path2.join(' '), stroke: c2, strokeWidth: 4, fill: 'none', opacity: 0.85 }));
        for (let x = 40; x <= CANVAS_W; x += 80) {
          const y1 = yBase + Math.sin(x * freq + phase) * amp;
          const y2 = yBase - Math.sin(x * freq + phase) * amp;
          els.push(h('line', { key: `r-${hIdx}-${x}`, x1: x, y1, x2: x, y2, stroke: pickColor(rand, swatches), strokeWidth: 2, opacity: 0.6 }));
        }
      }
      return patternSvg(els);
    },
  },

  {
    id: 'fractal-tree',
    name: 'Fractal Tree',
    description: 'Recursive branching paths radiating outward.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'fractal-tree');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      function branch(x: number, y: number, len: number, angle: number, depth: number, color: string) {
        if (depth <= 0 || len < 8) return;
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        els.push(h('line', { key: `t-${x}-${y}-${depth}-${angle.toFixed(2)}`, x1: x, y1: y, x2, y2, stroke: color, strokeWidth: Math.max(1, depth * 1.4), strokeLinecap: 'round', opacity: 0.8 }));
        const nl = len * (0.62 + rand() * 0.1);
        const da = 0.4 + rand() * 0.2;
        branch(x2, y2, nl, angle - da, depth - 1, color);
        branch(x2, y2, nl, angle + da, depth - 1, color);
      }
      const trees = 4;
      for (let i = 0; i < trees; i++) {
        const startX = ((i + 1) / (trees + 1)) * CANVAS_W;
        branch(startX, CANVAS_H, 160, -Math.PI / 2 + (rand() - 0.5) * 0.4, 9, pickColor(rand, swatches));
      }
      // crown trees from top
      for (let i = 0; i < 2; i++) {
        const sx = (rand() * 0.8 + 0.1) * CANVAS_W;
        branch(sx, 0, 140, Math.PI / 2 + (rand() - 0.5) * 0.4, 8, pickColor(rand, swatches));
      }
      return patternSvg(els);
    },
  },

  {
    id: 'wave-interference',
    name: 'Wave Interference',
    description: 'Overlapping wave fronts forming an interference pattern.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'wave-interference');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      const sources = 4;
      for (let s = 0; s < sources; s++) {
        const cx = rand() * CANVAS_W;
        const cy = rand() * CANVAS_H;
        const color = pickColor(rand, swatches);
        for (let i = 1; i <= 14; i++) {
          els.push(h('circle', { key: `w-${s}-${i}`, cx, cy, r: i * 80, fill: 'none', stroke: color, strokeWidth: 3, opacity: 0.45 }));
        }
      }
      return patternSvg(els);
    },
  },

  {
    id: 'confetti-burst',
    name: 'Confetti Burst',
    description: 'Random brand-color confetti scattered across the canvas.',
    render: ({ profile }: ShapeRenderProps) => {
      const rand = seedRandom(profile.id + profile.name + 'confetti-burst');
      const swatches = brandSwatches(profile);
      const els: any[] = [];
      const count = 220;
      for (let i = 0; i < count; i++) {
        const x = rand() * CANVAS_W;
        const y = rand() * CANVAS_H;
        const color = pickColor(rand, swatches);
        const kind = rand();
        const rot = rand() * 90;
        if (kind < 0.33) {
          // small rect
          const w = 10 + rand() * 28;
          const ht = 4 + rand() * 10;
          els.push(h('rect', { key: `c-${i}`, x, y, width: w, height: ht, fill: color, opacity: 0.9, transform: `rotate(${rot} ${x + w / 2} ${y + ht / 2})` }));
        } else if (kind < 0.66) {
          // circle dot
          els.push(h('circle', { key: `c-${i}`, cx: x, cy: y, r: 4 + rand() * 12, fill: color, opacity: 0.9 }));
        } else {
          // tilted line
          const len = 20 + rand() * 40;
          els.push(h('line', { key: `c-${i}`, x1: x, y1: y, x2: x + len, y2: y + (rand() - 0.5) * 30, stroke: color, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.85 }));
        }
      }
      return patternSvg(els);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'tessellation',
  monolith: 'glyph-wall',
  playful: 'confetti-burst',
  editorial: 'flow-field',
  magazine: 'wave-interference',
  swiss: 'dot-matrix',
  minimal: 'radial-bursts',
  modern: 'voronoi-cells',
  brutalist: 'glyph-wall',
  technical: 'dna-helix',
};

export const SIGNATURE_CATALOG: ShapeCatalog = {
  archetype: 'signature',
  categoryLabel: 'Signature artwork',
  shapes: SIGNATURE_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? SIGNATURE_SHAPES[0].id,
};
