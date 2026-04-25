/**
 * Moodboard category — 10 shapes.
 *
 * Each shape composes color samples, typography hints, voice quotes and
 * keywords into a different mood-board layout. Style tokens (font, weight,
 * tracking, padding, radius) come from the active deck style — shapes
 * never override those.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import { shiftLightness } from '../utils';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  helpers (token-driven)  ─────────────────────── */

function inkOnSwatch(hex: string): string {
  return hex.toLowerCase() === '#ffffff' ? '#000' : '#fff';
}

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const MOODBOARD_SHAPES: SlideShape[] = [
  {
    id: 'cluster-grid',
    name: 'Cluster Grid',
    description: 'Color blocks + Aa specimen + voice card in a 3×3 cluster.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 4);
      const colGap = style.spacing.columnGap;
      const leftW = Math.round((region.width - colGap) * (1 / 2.6));
      const rightW = region.width - colGap - leftW;
      const descH = Math.min(160, region.height - 200);
      return h('div', { style: { display: 'grid', gridTemplateColumns: `${leftW}px ${rightW}px`, gap: colGap, height: '100%' } }, [
        h('div', { key: 'L' }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 96),
            minSize: 28,
            width: leftW,
            height: 220,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, whiteSpace: 'pre-line' as const },
          }, 'Mood &\nreference.'),
          h(FitText, {
            key: 'd',
            as: 'div',
            maxSize: 18,
            minSize: 11,
            width: leftW,
            height: descH,
            style: { marginTop: 28, opacity: 0.7, lineHeight: 1.65, color: surface.ink, fontFamily: fonts.body },
          }, `The visual vocabulary that informs every decision across ${profile.name}'s system.`),
        ]),
        h('div', { key: 'R', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: style.spacing.blockGap, height: 600 } }, [
          ...swatches.map((s, i) =>
            h('div', { key: s.hex + i, style: { background: s.hex, borderRadius: style.layout.cardCorner, gridColumn: i === 0 ? 'span 2' : 'span 1', padding: 20, display: 'flex', alignItems: 'flex-end' } },
              h('span', { style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.85, color: inkOnSwatch(s.hex) } }, s.name)
            )
          ),
          h('div', { key: 'aa', style: { gridColumn: 'span 2', background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            h('span', { style: { fontFamily: fonts.heading, fontSize: 92, fontWeight: 700, color: surface.ink } }, 'Aa')
          ),
          h('div', { key: 'voice', style: { background: surface.bg === '#0A0A0A' ? shiftLightness('#0A0A0A', 0.08) : '#0A0A0A', color: '#fff', borderRadius: style.layout.cardCorner, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
            h('div', { key: 'lab', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, color: '#fff' } }, 'Voice'),
            h('span', { key: 'q', style: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1, whiteSpace: 'pre-line' as const } }, 'The craft\nis the\nmessage.'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'quote-with-cards',
    name: 'Quote + Product Cards',
    description: 'Big quote on the left, three small product cards on the right.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 3);
      const gap = style.spacing.columnGap;
      const leftW = Math.round((region.width - gap) * 0.6);
      const rightW = region.width - gap - leftW;
      return h('div', { style: { display: 'grid', gridTemplateColumns: `${leftW}px ${rightW}px`, gap, height: '100%' } }, [
        h('div', { key: 'L', style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, 'Voice'),
          h(FitText, {
            key: 'q',
            as: 'div',
            maxSize: headingSize(style, 140),
            minSize: 36,
            width: leftW,
            height: region.height - 220,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.95, letterSpacing: style.typography.headingTracking, color: surface.ink },
          }, `"${profile.tagline}"`),
          h('div', { key: 'src', style: { fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.6, letterSpacing: '0.18em', textTransform: 'uppercase' } }, `— ${profile.name} manifesto`),
        ]),
        h('div', { key: 'R', style: { display: 'flex', flexDirection: 'column', gap: style.spacing.blockGap } }, swatches.map((s, i) =>
          h('div', { key: s.hex + i, style: { flex: 1, background: s.hex, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
            h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: inkOnSwatch(s.hex), opacity: 0.85 } }, `0${i + 1} · ${s.name}`),
            h('div', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 56, fontWeight: 700, color: inkOnSwatch(s.hex), lineHeight: 0.92 } }, s.hex.toUpperCase()),
          ])
        )),
      ]);
    },
  },

  {
    id: 'polaroid-stack',
    name: 'Polaroid Stack',
    description: 'Color-block "polaroids" rotated and overlapped like a stack.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 5);
      const tilts = [-8, 4, -3, 7, -5];
      const cardW = 320;
      const cardH = 380;
      const gap = 20;
      return h('div', { style: { position: 'relative', height: '100%', display: 'flex', alignItems: 'center', gap: 60 } }, [
        h('div', { key: 'lab', style: { width: 380 } }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 96),
            minSize: 32,
            width: 380,
            height: 240,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink, whiteSpace: 'pre-line' as const },
          }, 'A stack of\nreferences.'),
          h(FitText, {
            key: 'd',
            as: 'div',
            maxSize: 16,
            minSize: 11,
            width: 380,
            height: 140,
            style: { marginTop: 20, fontFamily: fonts.body, color: surface.ink, opacity: 0.7, lineHeight: 1.6 },
          }, `Texture, color, voice — the deck of cues that shape every ${profile.name} touchpoint.`),
        ]),
        h('div', { key: 'stack', style: { flex: 1, position: 'relative', height: cardH + 60 } },
          swatches.map((s, i) =>
            h('div', { key: s.hex + i, style: { position: 'absolute', left: i * (cardW - 80), top: 30, width: cardW, height: cardH, background: '#fff', padding: 16, borderRadius: style.layout.cardCorner / 2, boxShadow: '0 24px 48px -16px rgba(0,0,0,0.32)', transform: `rotate(${tilts[i] ?? 0}deg)`, display: 'flex', flexDirection: 'column' } }, [
              h('div', { key: 'p', style: { flex: 1, background: s.hex, borderRadius: 4 } }),
              h('div', { key: 'n', style: { paddingTop: 14, fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0A0A0A', opacity: 0.75 } }, `${s.name} · ${s.hex.toUpperCase()}`),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'marquee-tags',
    name: 'Marquee Tags',
    description: 'Repeating keyword strip + texture blocks.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const tags = (profile.personality?.length ? profile.personality : ['Bold', 'Crafted', 'Modern', 'Honest']).slice(0, 4);
      const repeated = Array.from({ length: 3 }, () => tags).flat();
      const swatches = profile.palette.swatches.slice(0, 4);
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 28 } }, [
        h(FitText, {
          key: 'h',
          as: 'div',
          maxSize: headingSize(style, 96),
          minSize: 28,
          width: region.width,
          height: 160,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink },
        }, 'The vocabulary.'),
        h('div', { key: 'mar', style: { borderTop: `1px solid ${surface.border}`, borderBottom: `1px solid ${surface.border}`, padding: '24px 0', overflow: 'hidden', display: 'flex', gap: 36, whiteSpace: 'nowrap' } },
          repeated.map((t, i) =>
            h('span', { key: i, style: { fontFamily: fonts.heading, fontSize: 84, fontWeight: 700, color: i % 4 === 0 ? profile.palette.primary : surface.ink, letterSpacing: '-0.02em', textTransform: 'uppercase' } }, `${t} ·`)
          )
        ),
        h('div', { key: 'tex', style: { flex: 1, display: 'grid', gridTemplateColumns: `repeat(${swatches.length}, 1fr)`, gap: style.spacing.blockGap } },
          swatches.map((s, i) =>
            h('div', { key: s.hex + i, style: { background: s.hex, borderRadius: style.layout.cardCorner, position: 'relative', overflow: 'hidden' } },
              h('div', { style: { position: 'absolute', inset: 0, background: `repeating-linear-gradient(45deg, ${shiftLightness(s.hex, -0.08)} 0 4px, transparent 4px 18px)`, opacity: 0.4 } })
            )
          )
        ),
      ]);
    },
  },

  {
    id: 'pillar-trio',
    name: 'Pillar Trio',
    description: 'Three vertical pillars: color · voice · visual.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const sw = profile.palette.swatches[0]?.hex ?? profile.palette.primary;
      const tags = (profile.personality?.length ? profile.personality : ['Crafted', 'Honest']).slice(0, 3);
      const gap = style.spacing.columnGap;
      return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap, height: '100%' } }, [
        h('div', { key: 'col', style: { background: sw, borderRadius: style.layout.cardCorner, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 't', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: inkOnSwatch(sw), opacity: 0.85 } }, 'Color'),
          h('span', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 96, fontWeight: 700, color: inkOnSwatch(sw), lineHeight: 0.9, letterSpacing: '-0.03em' } }, sw.toUpperCase()),
          h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 14, color: inkOnSwatch(sw), opacity: 0.85 } }, profile.palette.swatches[0]?.name ?? 'Primary'),
        ]),
        h('div', { key: 'voice', style: { background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 't', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, 'Voice'),
          h(FitText, {
            key: 'q',
            as: 'div',
            maxSize: 56,
            minSize: 22,
            width: Math.round((region.width - gap * 2) / 3) - 64,
            height: 320,
            style: { fontFamily: fonts.heading, fontWeight: 600, color: surface.ink, lineHeight: 1.05, letterSpacing: '-0.02em' },
          }, profile.tagline),
          h('div', { key: 'tags', style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, tags.map((t, i) =>
            h('span', { key: i, style: { padding: '6px 12px', borderRadius: 999, border: `1px solid ${surface.border}`, fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: surface.ink, opacity: 0.7 } }, t)
          )),
        ]),
        h('div', { key: 'visual', style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 't', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#fff', opacity: 0.7 } }, 'Visual'),
          h('span', { key: 'aa', style: { fontFamily: fonts.heading, fontSize: 240, fontWeight: 800, color: '#fff', lineHeight: 0.85, letterSpacing: '-0.05em' } }, 'Aa'),
          h('div', { key: 'fam', style: { fontFamily: fonts.body, fontSize: 13, color: '#fff', opacity: 0.6, letterSpacing: '0.16em', textTransform: 'uppercase' } }, profile.typography.headingFamily),
        ]),
      ]);
    },
  },

  {
    id: 'gradient-blur-bg',
    name: 'Gradient Blur Bg',
    description: 'Blurred color circles behind crisp foreground texture cards.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 4);
      return h('div', { style: { position: 'relative', height: '100%', overflow: 'hidden' } }, [
        h('div', { key: 'bg', style: { position: 'absolute', inset: 0, pointerEvents: 'none' } }, swatches.map((s, i) =>
          h('div', { key: s.hex + i, style: { position: 'absolute', width: 480, height: 480, borderRadius: 999, background: s.hex, filter: 'blur(120px)', opacity: 0.7, left: `${(i * 22) % 70}%`, top: `${(i * 33) % 60}%` } })
        )),
        h('div', { key: 'fg', style: { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 110),
            minSize: 32,
            width: region.width,
            height: 200,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink },
          }, 'Atmosphere.'),
          h('div', { key: 'cards', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: style.spacing.blockGap } },
            ['Hue', 'Texture', 'Mood'].map((label, i) =>
              h('div', { key: label, style: { background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${surface.border}`, borderRadius: style.layout.cardCorner, padding: 24 } }, [
                h('div', { key: 't', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, label),
                h('div', { key: 'h', style: { marginTop: 22, fontFamily: fonts.heading, fontSize: 36, fontWeight: 700, color: surface.ink, letterSpacing: '-0.02em', lineHeight: 1.05 } }, i === 0 ? swatches[0]?.name ?? 'Primary' : i === 1 ? 'Glass · Soft · Lit' : 'Calm · Crafted'),
              ])
            )
          ),
        ]),
      ]);
    },
  },

  {
    id: 'sticker-collage',
    name: 'Sticker Collage',
    description: 'Pill-shaped color stickers scattered around a center quote.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 6);
      const positions = [
        { l: '4%', t: '8%', r: -10 },
        { l: '70%', t: '14%', r: 8 },
        { l: '12%', t: '70%', r: 6 },
        { l: '76%', t: '74%', r: -7 },
        { l: '40%', t: '4%', r: 4 },
        { l: '46%', t: '82%', r: -3 },
      ];
      return h('div', { style: { position: 'relative', height: '100%' } }, [
        ...swatches.map((s, i) => {
          const p = positions[i] ?? positions[0];
          return h('div', { key: s.hex + i, style: { position: 'absolute', left: p.l, top: p.t, transform: `rotate(${p.r}deg)`, padding: '14px 26px', borderRadius: 999, background: s.hex, color: inkOnSwatch(s.hex), fontFamily: fonts.body, fontSize: 16, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', boxShadow: '0 16px 32px -12px rgba(0,0,0,0.25)' } }, `${s.name} · ${s.hex.toUpperCase()}`);
        }),
        h('div', { key: 'q', style: { position: 'absolute', inset: '30% 12% 30% 12%', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(FitText, {
            as: 'div',
            maxSize: headingSize(style, 130),
            minSize: 36,
            width: Math.round(region.width * 0.76),
            height: Math.round(region.height * 0.4),
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink, textAlign: 'center' },
          }, profile.tagline)
        ),
      ]);
    },
  },

  {
    id: 'manifesto-band',
    name: 'Manifesto Band',
    description: 'Wide horizontal manifesto band + 2 mini supporting cards.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const sw = profile.palette.swatches.slice(0, 2);
      const bandH = Math.round(region.height * 0.55);
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: style.spacing.blockGap, height: '100%' } }, [
        h('div', { key: 'band', style: { background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: 60, height: bandH, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#fff', opacity: 0.85 } }, `Manifesto · ${profile.name}`),
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 160),
            minSize: 36,
            width: region.width - 120,
            height: bandH - 160,
            style: { fontFamily: fonts.heading, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.02em', color: '#fff' },
          }, profile.mission),
        ]),
        h('div', { key: 'cards', style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: style.spacing.blockGap } },
          sw.map((s, i) =>
            h('div', { key: s.hex + i, style: { background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
              h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, i === 0 ? 'Primary tone' : 'Secondary tone'),
              h('div', { key: 'sw', style: { display: 'flex', gap: 16, alignItems: 'center' } }, [
                h('div', { style: { width: 56, height: 56, borderRadius: style.layout.cardCorner / 2, background: s.hex } }),
                h('span', { style: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, color: surface.ink, letterSpacing: '-0.02em' } }, `${s.name} · ${s.hex.toUpperCase()}`),
              ]),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'keyword-grid',
    name: 'Keyword Grid',
    description: '9-cell keyword grid in monospace caps.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const base = (profile.personality?.length ? profile.personality : ['Bold', 'Crafted', 'Modern', 'Calm']);
      const cells = Array.from({ length: 9 }, (_, i) => base[i % base.length] ?? base[0] ?? 'Mark');
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, {
          key: 'h',
          as: 'div',
          maxSize: headingSize(style, 96),
          minSize: 28,
          width: region.width,
          height: 140,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink },
        }, 'Keywords.'),
        h('div', { key: 'g', style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 1, background: surface.border, border: `1px solid ${surface.border}` } },
          cells.map((c, i) =>
            h('div', { key: i, style: { background: i % 2 === 0 ? surface.bg : surface.subtle, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h('span', { style: { fontFamily: fonts.body, fontSize: 24, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: surface.ink } }, `0${i + 1} · ${c}`)
            )
          )
        ),
      ]);
    },
  },

  {
    id: 'dual-mood',
    name: 'Dual Mood',
    description: 'Split background (light vs dark) with mirrored color samples.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const sw = profile.palette.swatches.slice(0, 4);
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', borderRadius: style.layout.cardCorner, overflow: 'hidden' } }, [
        h('div', { key: 'L', style: { background: surface.subtle, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, 'Light · Day'),
          h('span', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 88, fontWeight: 700, color: surface.ink, lineHeight: 0.92, letterSpacing: '-0.03em', whiteSpace: 'pre-line' as const } }, 'Open.\nClear.\nQuiet.'),
          h('div', { key: 'sw', style: { display: 'flex', gap: 12 } }, sw.map((s, i) =>
            h('div', { key: s.hex + i, style: { width: 80, height: 80, background: s.hex, borderRadius: style.layout.cardCorner / 2 } })
          )),
        ]),
        h('div', { key: 'R', style: { background: '#0A0A0A', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#fff', opacity: 0.6 } }, 'Dark · Night'),
          h('span', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 88, fontWeight: 700, color: '#fff', lineHeight: 0.92, letterSpacing: '-0.03em', whiteSpace: 'pre-line' as const } }, 'Bold.\nSharp.\nLoud.'),
          h('div', { key: 'sw', style: { display: 'flex', gap: 12 } }, sw.slice().reverse().map((s, i) =>
            h('div', { key: s.hex + i, style: { width: 80, height: 80, background: s.hex, borderRadius: style.layout.cardCorner / 2, opacity: 0.95 } })
          )),
        ]),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'manifesto-band',
  monolith: 'dual-mood',
  playful: 'sticker-collage',
  editorial: 'cluster-grid',
  magazine: 'quote-with-cards',
  swiss: 'keyword-grid',
  minimal: 'pillar-trio',
  modern: 'gradient-blur-bg',
  brutalist: 'marquee-tags',
  technical: 'keyword-grid',
};

export const MOODBOARD_CATALOG: ShapeCatalog = {
  archetype: 'moodboard',
  categoryLabel: 'Moodboard',
  shapes: MOODBOARD_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? MOODBOARD_SHAPES[0].id,
};
