/**
 * Palette category — 10 shapes.
 *
 * Each shape lays out the brand swatches differently. Style tokens
 * (font family, weight, padding, color, border radius) come from the
 * active deck style.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';
import type { Swatch } from '../types';
import { inkOn, shiftLightness } from '../utils';

const h = createElement;

/* ─────────────────────────  helpers  ─────────────────────── */

function takeSwatches(profile: ShapeRenderProps['profile'], n = 6): Swatch[] {
  return profile.palette.swatches.slice(0, n);
}

function Header({ style, surface, fonts, region }: { style: DeckStyle; surface: ShapeRenderProps['surface']; fonts: ShapeRenderProps['fonts']; region: ShapeRenderProps['region'] }) {
  return h(FitText, {
    as: 'div',
    maxSize: headingSize(style, 96),
    minSize: 28,
    width: region.width,
    height: 120,
    style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink },
  }, 'Palette.');
}

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const PALETTE_SHAPES: SlideShape[] = [
  {
    id: 'circle-stack',
    name: 'Circle Stack',
    description: 'Overlapping color circles next to a heading + intro.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 } }, [
        h('div', { key: 'l' }, [
          Header({ style, surface, fonts, region }),
          h(FitText, {
            key: 'desc',
            as: 'div',
            maxSize: 18,
            minSize: 12,
            width: Math.round((region.width - 60) / 2),
            height: 160,
            style: { marginTop: 24, fontFamily: fonts.body, color: surface.ink, opacity: 0.7, lineHeight: 1.6 },
          }, 'Six tones, scored, sequenced. Each pulls its weight in the system.'),
        ]),
        h('div', { key: 'r', style: { position: 'relative', height: '100%' } },
          swatches.map((s, i) =>
            h('div', {
              key: s.hex,
              style: {
                position: 'absolute',
                width: 240,
                height: 240,
                borderRadius: 999,
                background: s.hex,
                left: (i % 3) * 130,
                top: Math.floor(i / 3) * 200 + (i % 2) * 30,
                boxShadow: '0 30px 60px -10px rgba(0,0,0,0.35)',
              },
            })
          )
        ),
      ]);
    },
  },

  {
    id: 'chip-grid-3x2',
    name: 'Chip Grid 3×2',
    description: '3 columns of color blocks with name + hex/rgb captions.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: style.spacing.columnGap } }, [
        h('div', { key: 'l' }, [
          Header({ style, surface, fonts, region }),
          h(FitText, {
            key: 'desc',
            as: 'div',
            maxSize: 17,
            minSize: 12,
            width: Math.round(region.width * 0.32),
            height: 180,
            style: { fontFamily: fonts.body, color: surface.ink, opacity: 0.7, marginTop: 22, lineHeight: 1.7 },
          }, 'The brand color system, hand-tuned. Every value catalogued, contrast-checked, ready for craft.'),
        ]),
        h('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 } },
          swatches.map((s) => {
            const fg = inkOn(s.hex);
            return h('div', { key: s.hex, style: { background: s.hex, height: 220, padding: 18, color: fg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: style.layout.cardCorner } }, [
              h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 } }, s.name),
              h('div', { key: 'sp', style: { fontFamily: fonts.body, fontSize: 12, opacity: 0.75, lineHeight: 1.5 } }, [s.hex, h('br', { key: 'br' }), s.rgb]),
            ]);
          })
        ),
      ]);
    },
  },

  {
    id: 'chip-grid-6',
    name: 'Chip Grid 6',
    description: 'Six tall chips in a row with name + hex underneath.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginTop: 60 } },
          swatches.map((s) =>
            h('div', { key: s.hex, style: { display: 'flex', flexDirection: 'column', gap: 14 } }, [
              h('div', { key: 'sw', style: { aspectRatio: '3 / 4', background: s.hex, border: style.layout.bordering === 'inset' ? `1px solid ${surface.border}` : 'none', borderRadius: style.layout.cardCorner } }),
              h('div', { key: 'cap' }, [
                h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: surface.ink, marginBottom: 4 } }, s.name),
                h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.55 } }, s.hex),
              ]),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'bordered-rows',
    name: 'Bordered Rows',
    description: 'Horizontal rows in a thick-bordered table — index, name, hex, role.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'tbl', style: { marginTop: 50, border: `3px solid ${surface.ink}` } },
          swatches.map((s, i) =>
            h('div', { key: s.hex, style: { display: 'grid', gridTemplateColumns: '60px 200px 1fr 200px', borderTop: i === 0 ? 'none' : `2px solid ${surface.ink}`, alignItems: 'stretch' } }, [
              h('div', { key: 'sw', style: { background: s.hex, borderRight: `2px solid ${surface.ink}` } }),
              h('div', { key: 'n', style: { padding: '20px 16px', borderRight: `2px solid ${surface.ink}`, fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, textTransform: 'uppercase', color: surface.ink } }, `[${String(i + 1).padStart(2, '0')}] ${s.name}`),
              h('div', { key: 'sp', style: { padding: '20px 16px', borderRight: `2px solid ${surface.ink}`, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 } }, `${s.hex} · ${s.rgb}`),
              h('div', { key: 'r', style: { padding: '20px 16px', fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 } }, s.role ?? '—'),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Mono spec table with #, name, hex, rgb, hsl, role.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'tbl', style: { marginTop: 40, border: `1px solid ${surface.border}`, fontFamily: fonts.body, fontSize: 12, color: surface.ink } }, [
          h('div', { key: 'hdr', style: { display: 'grid', gridTemplateColumns: '60px 1fr 130px 180px 130px 1fr', borderBottom: `1px solid ${surface.border}`, padding: '12px 18px', opacity: 0.6, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 10 } }, [
            h('span', { key: '1' }, '#'),
            h('span', { key: '2' }, 'NAME'),
            h('span', { key: '3' }, 'HEX'),
            h('span', { key: '4' }, 'RGB'),
            h('span', { key: '5' }, 'HSL'),
            h('span', { key: '6' }, 'ROLE'),
          ]),
          ...swatches.map((s, i) =>
            h('div', { key: s.hex, style: { display: 'grid', gridTemplateColumns: '60px 1fr 130px 180px 130px 1fr', alignItems: 'center', padding: '14px 18px', borderBottom: i === swatches.length - 1 ? 'none' : `1px solid ${surface.border}` } }, [
              h('span', { key: 'n', style: { display: 'flex', alignItems: 'center', gap: 12 } },
                h('span', { style: { display: 'inline-block', width: 18, height: 18, background: s.hex, border: `1px solid ${surface.border}` } })
              ),
              h('span', { key: 'nm', style: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600 } }, s.name),
              h('span', { key: 'h' }, s.hex),
              h('span', { key: 'rgb' }, s.rgb),
              h('span', { key: 'hsl' }, s.hsl ?? '—'),
              h('span', { key: 'r', style: { opacity: 0.7 } }, s.role ?? '—'),
            ])
          ),
        ]),
      ]);
    },
  },

  {
    id: 'circle-confetti',
    name: 'Circle Confetti',
    description: 'Tilted swatch circles arranged like joyful confetti.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'wrap', style: { marginTop: 60, display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' } },
          swatches.map((s, i) =>
            h('div', { key: s.hex, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 3}deg)` } }, [
              h('div', { key: 'c', style: { width: 220, height: 220, borderRadius: 999, background: s.hex, boxShadow: '0 18px 40px -8px rgba(0,0,0,0.25)' } }),
              h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: surface.ink } }, s.name),
              h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.55 } }, s.hex),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'flag-stripes',
    name: 'Flag Stripes',
    description: 'Vertical color stripes filling the slide, names at base.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      return h('div', { style: { width: '100%', height: '100%', position: 'relative' } }, [
        h('div', { key: 'stripes', style: { display: 'grid', gridTemplateColumns: `repeat(${swatches.length}, 1fr)`, height: '100%' } },
          swatches.map((s) => {
            const fg = inkOn(s.hex);
            return h('div', { key: s.hex, style: { background: s.hex, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px 18px' } }, [
              h('div', { key: 'n', style: { fontFamily: fonts.heading, fontWeight: 700, fontSize: 22, color: fg, letterSpacing: '-0.01em' } }, s.name),
              h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 12, color: fg, opacity: 0.85, marginTop: 6, letterSpacing: '0.06em' } }, `${s.hex} · ${s.rgb}`),
            ]);
          })
        ),
        h('div', { key: 'lab', style: { position: 'absolute', top: 24, left: 24, fontFamily: fonts.body, fontSize: 12, color: inkOn(swatches[0]?.hex ?? surface.bg), opacity: 0.85, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'PALETTE'),
      ]);
    },
  },

  {
    id: 'swatch-passport',
    name: 'Swatch Passport',
    description: 'One dominant primary swatch + smaller variations beside.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      const dominant = swatches[0];
      const rest = swatches.slice(1, 6);
      const dominantFg = dominant ? inkOn(dominant.hex) : surface.ink;
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'g', style: { marginTop: 40, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, height: region.height - 160 } }, [
          dominant
            ? h('div', { key: 'dom', style: { background: dominant.hex, borderRadius: style.layout.cardCorner, padding: 32, color: dominantFg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
                h('div', { key: 'top', style: { fontFamily: fonts.body, fontSize: 12, opacity: 0.85, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Primary'),
                h('div', { key: 'mid' }, [
                  h('div', { key: 'n', style: { fontFamily: fonts.heading, fontWeight: 800, fontSize: 96, lineHeight: 0.95, letterSpacing: '-0.02em' } }, dominant.name),
                  h('div', { key: 'r', style: { marginTop: 12, fontFamily: fonts.body, fontSize: 14, opacity: 0.85 } }, dominant.role ?? 'Hero color'),
                ]),
                h('div', { key: 'sp', style: { fontFamily: fonts.body, fontSize: 14, opacity: 0.85, lineHeight: 1.7 } }, [
                  h('div', { key: 'h' }, dominant.hex),
                  h('div', { key: 'rgb' }, dominant.rgb),
                  dominant.hsl ? h('div', { key: 'hsl' }, dominant.hsl) : null,
                ]),
              ])
            : null,
          h('div', { key: 'rest', style: { display: 'grid', gridTemplateRows: `repeat(${rest.length}, 1fr)`, gap: 16 } },
            rest.map((s) => {
              const fg = inkOn(s.hex);
              return h('div', { key: s.hex, style: { background: s.hex, borderRadius: style.layout.cardCorner, padding: 18, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
                h('div', { key: 'n', style: { fontFamily: fonts.heading, fontWeight: 700, fontSize: 18 } }, s.name),
                h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 12, opacity: 0.85 } }, s.hex),
              ]);
            })
          ),
        ]),
      ]);
    },
  },

  {
    id: 'mood-collage',
    name: 'Mood Collage',
    description: '4 large color blocks each labeled with a mood word.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 4);
      const moods = (profile.personality.length ? profile.personality : ['Bold', 'Calm', 'Crafted', 'Warm']);
      const padded = swatches.length < 4
        ? swatches.concat(Array(4 - swatches.length).fill(swatches[0] ?? { hex: surface.accent, name: '—', rgb: '' }))
        : swatches;
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'g', style: { marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 18, height: region.height - 160 } },
          padded.slice(0, 4).map((s, i) => {
            const fg = inkOn(s.hex);
            const word = moods[i % moods.length] ?? s.name;
            return h('div', { key: i, style: { background: s.hex, borderRadius: style.layout.cardCorner, padding: 32, color: fg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
              h('div', { key: 'top', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.85 } }, s.name),
              h('div', { key: 'mood', style: { fontFamily: fonts.heading, fontWeight: 800, fontSize: 88, lineHeight: 0.92, letterSpacing: '-0.02em' } }, word),
              h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 13, opacity: 0.85 } }, `${s.hex} · ${s.rgb}`),
            ]);
          })
        ),
      ]);
    },
  },

  {
    id: 'gradient-spectrum',
    name: 'Gradient Spectrum',
    description: 'Horizontal gradient swath with stop labels underneath.',
    render: ({ profile, style, surface, fonts, region }) => {
      const swatches = takeSwatches(profile, 6);
      const stops = swatches.length ? swatches : [{ hex: surface.accent, name: 'Primary', rgb: '', role: '' } as Swatch];
      const gradient = stops.length === 1
        ? stops[0].hex
        : `linear-gradient(90deg, ${stops.map((s, i) => `${s.hex} ${(i / (stops.length - 1)) * 100}%`).join(', ')})`;
      return h('div', { style: { width: '100%', height: '100%' } }, [
        Header({ style, surface, fonts, region }),
        h('div', { key: 'gradient', style: { marginTop: 40, height: 320, borderRadius: style.layout.cardCorner, background: gradient, boxShadow: `0 20px 50px -12px ${shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.04 : -0.12)}` } }),
        h('div', { key: 'stops', style: { marginTop: 24, display: 'grid', gridTemplateColumns: `repeat(${stops.length}, 1fr)`, gap: 12 } },
          stops.map((s) =>
            h('div', { key: s.hex, style: { display: 'flex', flexDirection: 'column', gap: 6 } }, [
              h('div', { key: 'sw', style: { width: 28, height: 28, borderRadius: 999, background: s.hex, border: `1px solid ${surface.border}` } }),
              h('div', { key: 'n', style: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: surface.ink } }, s.name),
              h('div', { key: 'h', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.6 } }, s.hex),
            ])
          )
        ),
        h('div', { key: 'foot', style: { marginTop: 28, fontFamily: fonts.body, fontSize: 12, color: surface.ink, opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase' } }, `${stops.length} stops · linear · 0% → 100%`),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'circle-stack',
  monolith: 'circle-stack',
  playful: 'circle-confetti',
  editorial: 'chip-grid-3x2',
  magazine: 'chip-grid-3x2',
  swiss: 'chip-grid-6',
  minimal: 'chip-grid-6',
  modern: 'chip-grid-6',
  brutalist: 'bordered-rows',
  technical: 'data-table',
};

export const PALETTE_CATALOG: ShapeCatalog = {
  archetype: 'palette',
  categoryLabel: 'Color Palette',
  shapes: PALETTE_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? PALETTE_SHAPES[0].id,
};
