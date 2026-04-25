/**
 * Outdoor category — 10 shapes.
 *
 * Each shape composes a different out-of-home placement (mesh banner,
 * billboard, bus shelter, etc.) for a single brand. Style tokens flow
 * from the active deck style — shapes don't override them.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import type { SlideShape, ShapeCatalog } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const OUTDOOR_SHAPES: SlideShape[] = [
  {
    id: 'mesh-banner',
    name: 'Mesh Banner',
    description: 'Wide branded mesh banner (existing).',
    render: ({ profile, style, surface, fonts, region }) => {
      const bannerW = Math.min(region.width, 1200);
      const bannerH = 480;
      const bannerPad = 40;
      const innerPad = 50;
      const innerW = bannerW - bannerPad * 2 - innerPad * 2;
      const innerH = bannerH - bannerPad * 2 - innerPad * 2;
      const captionH = 30;
      const wordmarkH = innerH - captionH * 2 - 40;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink } }, 'Out in the wild.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h('div', { style: { background: '#1f2937', width: '100%', maxWidth: bannerW, height: bannerH, borderRadius: style.layout.cardCorner, padding: bannerPad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.4)' : 'none' } },
            h('div', { style: { background: profile.palette.primary, width: '100%', height: '100%', borderRadius: style.layout.cardCorner / 2, padding: innerPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
              h(FitText, { key: 'top', as: 'div', maxSize: 16, minSize: 10, width: innerW, height: captionH, style: { letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: fonts.body, opacity: 0.85, color: '#FFF' } }, 'Powering Growth Through ' + profile.name),
              h(FitText, { key: 'n', as: 'span', maxSize: 280, minSize: 56, width: innerW, height: wordmarkH, style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 0.85, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, profile.name),
              h('span', { key: 'foot', style: { fontFamily: fonts.body, fontSize: 14, color: '#FFF', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, textAlign: 'right' } }, 'Mesh banner · ' + style.name),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'highway-billboard',
    name: 'Highway Billboard',
    description: 'Wide horizontal billboard with sky strip.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'On the highway.'),
        // Sky strip + billboard
        h('div', { key: 'sky', style: { flex: 0.4, background: 'linear-gradient(to bottom, #d8e8f5 0%, #f4ecdc 100%)', borderRadius: '12px 12px 0 0' } }),
        h('div', { key: 'board', style: { background: profile.palette.primary, width: '94%', alignSelf: 'center', height: 360, borderRadius: 8, padding: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.35)' : 'none', position: 'relative', marginTop: -10 } }, [
          h(FitText, { key: 'tag', as: 'span', maxSize: 80, minSize: 24, width: Math.round((region.width * 0.94) - 100 - 360), height: 220, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#FFF' } }, profile.tagline),
          h(FitText, { key: 'n', as: 'span', maxSize: 140, minSize: 36, width: 360, height: 220, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'right', color: '#FFF' } }, profile.name),
        ]),
        // Posts
        h('div', { key: 'posts', style: { display: 'flex', justifyContent: 'space-between', padding: '0 18%', height: 80 } }, [
          h('div', { key: 'l', style: { width: 14, background: '#3a3a3a' } }),
          h('div', { key: 'r', style: { width: 14, background: '#3a3a3a' } }),
        ]),
      ]);
    },
  },

  {
    id: 'bus-shelter',
    name: 'Bus Shelter',
    description: 'Vertical poster in bus shelter frame.',
    render: ({ profile, style, surface, fonts, region }) => {
      const posterW = 380;
      const posterH = 620;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Where they wait.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 } }, [
          h('div', { key: 'shelter', style: { background: '#3a3a3a', borderRadius: 14, padding: 20, boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -16px rgba(0,0,0,0.4)' : 'none' } },
            h('div', { style: { width: posterW, height: posterH, background: profile.palette.primary, borderRadius: 8, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, opacity: 0.85, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Now showing'),
              h(FitText, { key: 'n', as: 'span', maxSize: 90, minSize: 30, width: posterW - 64, height: 280, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.9, color: '#FFF' } }, profile.name),
              h(FitText, { key: 't', as: 'div', maxSize: 22, minSize: 12, width: posterW - 64, height: 100, style: { fontFamily: fonts.heading, fontWeight: 600, lineHeight: 1.3, color: '#FFF', opacity: 0.92 } }, profile.tagline),
              h('div', { key: 'cta', style: { padding: '12px 16px', borderRadius: style.id === 'playful' ? 999 : 8, background: '#FFF', color: '#0A0A0A', fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' } }, 'Learn more'),
            ])
          ),
          // bench silhouette
          h('div', { key: 'bench', style: { width: 280, height: 60, background: '#3a3a3a', borderRadius: 6, alignSelf: 'flex-end', marginBottom: 20 } }),
        ]),
      ]);
    },
  },

  {
    id: 'subway-station',
    name: 'Subway Station',
    description: 'Subway poster wall.',
    render: ({ profile, style, surface, fonts, region }) => {
      const posters = [
        { bg: profile.palette.primary, ink: '#FFF', text: profile.name },
        { bg: '#0A0A0A', ink: '#FFF', text: profile.name },
        { bg: '#FFF', ink: '#0A0A0A', text: profile.name },
        { bg: profile.palette.primary, ink: '#FFF', text: profile.name },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Underground takeover.'),
        // Tile wall + posters
        h('div', { key: 'wall', style: { flex: 1, background: 'linear-gradient(to bottom, #f3eddd 0%, #e5dcc4 100%)', borderRadius: style.layout.cardCorner, padding: 36, position: 'relative', overflow: 'hidden', boxShadow: style.effect.shadow !== 'none' ? 'inset 0 0 60px rgba(0,0,0,0.18)' : 'none' } }, [
          // Subtle tile pattern
          h('div', { key: 'tiles', style: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)', backgroundSize: '40px 80px' } }),
          h('div', { key: 'row', style: { position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, height: '100%' } }, posters.map((p, i) => {
            const cw = Math.round((region.width - 72) / 4) - 36;
            return h('div', { key: i, style: { background: p.bg, borderRadius: 6, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: p.ink, border: '6px solid #d4cdb6', boxShadow: '0 6px 14px rgba(0,0,0,0.18)' } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 9, opacity: 0.7, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Coming ' + (i + 1) + '/4'),
              h(FitText, { key: 'n', as: 'span', maxSize: 56, minSize: 14, width: cw, height: 240, style: { fontFamily: fonts.heading, fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em', color: p.ink } }, p.text),
              h('span', { key: 'm', style: { fontFamily: fonts.body, fontSize: 9, opacity: 0.75, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Metro · A1'),
            ]);
          })),
        ]),
      ]);
    },
  },

  {
    id: 'building-wrap',
    name: 'Building Wrap',
    description: 'Full building wrap mockup.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Front of house.'),
        h('div', { key: 'stage', style: { flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' } }, [
          // Sky bg
          h('div', { key: 'sky', style: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #e8eef5 0%, #f4ecdc 100%)', borderRadius: style.layout.cardCorner } }),
          // Building
          h('div', { key: 'bldg', style: { position: 'relative', width: '52%', height: '88%', background: profile.palette.primary, borderRadius: '6px 6px 0 0', padding: 30, color: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.35)' : 'none' } }, [
            // Windows grid behind
            h('div', { key: 'win', style: { position: 'absolute', inset: 30, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', gap: 8, opacity: 0.18 } }, Array.from({ length: 60 }).map((_, i) =>
              h('div', { key: i, style: { background: '#FFF', borderRadius: 2 } })
            )),
            h('span', { key: 'eb', style: { position: 'relative', fontFamily: fonts.body, fontSize: 14, opacity: 0.95, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Building wrap'),
            h(FitText, { key: 'n', as: 'span', maxSize: 220, minSize: 50, width: Math.round(region.width * 0.52) - 60, height: 460, style: { position: 'relative', fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.85, color: '#FFF', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, profile.name),
            h('span', { key: 'mis', style: { position: 'relative', fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, lineHeight: 1.2, opacity: 0.9, color: '#FFF' } }, profile.tagline.slice(0, 50)),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'flag-row',
    name: 'Flag Row',
    description: 'Vertical flag row in front of plaza.',
    render: ({ profile, style, surface, fonts, region }) => {
      const flags = [
        { bg: profile.palette.primary, ink: '#FFF' },
        { bg: '#0A0A0A', ink: '#FFF' },
        { bg: profile.palette.primary, ink: '#FFF' },
        { bg: '#FFF', ink: '#0A0A0A' },
        { bg: profile.palette.primary, ink: '#FFF' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'At the entrance.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 38, paddingBottom: 30, background: 'linear-gradient(to bottom, #e8eef5 0%, #d0d8d0 70%, #b0b8a8 100%)', borderRadius: style.layout.cardCorner } }, flags.map((f, i) =>
          h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', height: '92%' } }, [
            // Pole top
            h('div', { key: 'fin', style: { width: 16, height: 16, borderRadius: '50%', background: '#777' } }),
            // Flag
            h('div', { key: 'fl', style: { width: 110, height: 280, background: f.bg, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: f.ink, boxShadow: '4px 6px 14px rgba(0,0,0,0.18)', border: f.bg === '#FFF' ? '1px solid rgba(0,0,0,0.08)' : 'none' } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 8, opacity: 0.7, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Flag ' + String(i + 1).padStart(2, '0')),
              h(FitText, { key: 'n', as: 'span', maxSize: 26, minSize: 10, width: 78, height: 200, style: { fontFamily: fonts.heading, fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: f.ink, writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }, profile.name),
            ]),
            // Pole
            h('div', { key: 'pole', style: { width: 4, flex: 1, background: '#888' } }),
            // Base
            h('div', { key: 'base', style: { width: 30, height: 6, background: '#666', borderRadius: 3 } }),
          ])
        )),
      ]);
    },
  },

  {
    id: 'airport-banner',
    name: 'Airport Banner',
    description: 'Long airport hallway banner.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Travelers see it first.'),
        h('div', { key: 'hall', style: { flex: 1, position: 'relative', borderRadius: style.layout.cardCorner, overflow: 'hidden', background: 'linear-gradient(to bottom, #e8eef5 0%, #f4ecdc 60%, #d8d0bd 100%)', boxShadow: style.effect.shadow !== 'none' ? 'inset 0 0 80px rgba(0,0,0,0.15)' : 'none' } }, [
          // Long horizontal banner
          h('div', { key: 'banner', style: { position: 'absolute', top: '20%', left: '4%', right: '4%', height: 220, background: profile.palette.primary, borderRadius: 6, padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFF', boxShadow: '0 18px 30px -12px rgba(0,0,0,0.3)' } }, [
            h(FitText, { key: 'n', as: 'span', maxSize: 130, minSize: 36, width: 460, height: 160, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.9 } }, profile.name),
            h(FitText, { key: 't', as: 'span', maxSize: 36, minSize: 14, width: 540, height: 160, style: { fontFamily: fonts.heading, fontWeight: 600, lineHeight: 1.2, textAlign: 'right' } }, profile.tagline),
          ]),
          // Gate signs
          h('div', { key: 'signs', style: { position: 'absolute', bottom: 24, left: '6%', right: '6%', display: 'flex', justifyContent: 'space-between' } }, ['A1–A12', 'B1–B16', 'C1–C8'].map((t) =>
            h('span', { key: t, style: { fontFamily: fonts.body, fontSize: 11, color: '#0A0A0A', opacity: 0.65, letterSpacing: '0.22em', textTransform: 'uppercase' } }, '→ ' + t)
          )),
        ]),
      ]);
    },
  },

  {
    id: 'stadium-board',
    name: 'Stadium Board',
    description: 'Circular stadium scoreboard.',
    render: ({ profile, style, surface, fonts, region }) => {
      const boardSize = 540;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'In the arena.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 100%, #2a3a18 0%, #0a1208 100%)', borderRadius: style.layout.cardCorner, position: 'relative', overflow: 'hidden' } }, [
          // Stadium curve hint
          h('div', { key: 'curve', style: { position: 'absolute', bottom: -100, left: '10%', right: '10%', height: 200, borderRadius: '50%', background: '#3a5028', opacity: 0.5 } }),
          // Scoreboard
          h('div', { key: 'board', style: { width: boardSize, height: boardSize, borderRadius: '50%', background: '#0A0A0A', border: `8px solid ${profile.palette.primary}`, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: '#FFF', boxShadow: '0 30px 60px -16px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.5)', position: 'relative' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, color: profile.palette.primary, opacity: 0.95, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Sponsored by'),
            h(FitText, { key: 'n', as: 'span', maxSize: 130, minSize: 32, width: boardSize - 100, height: 220, style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 0.9, textAlign: 'center' } }, profile.name),
            h('div', { key: 'score', style: { display: 'flex', gap: 24, fontFamily: fonts.heading, fontSize: 64, fontWeight: 900, color: profile.palette.primary, letterSpacing: '-0.04em' } }, [
              h('span', { key: 'l' }, '02'),
              h('span', { key: 'd', style: { color: '#FFF', opacity: 0.5 } }, ':'),
              h('span', { key: 'r' }, '01'),
            ]),
            h('span', { key: 'q', style: { fontFamily: fonts.body, fontSize: 11, color: '#FFF', opacity: 0.7, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Q4 · 02:48'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'taxi-top',
    name: 'Taxi Top',
    description: 'Taxi-top illuminated sign.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Streetside.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, #1a1a1a 0%, #2a2a2a 60%, #4a4a4a 100%)', borderRadius: style.layout.cardCorner, position: 'relative', overflow: 'hidden' } }, [
          // Taxi body silhouette
          h('div', { key: 'body', style: { width: '76%', height: 220, background: '#f5b800', borderRadius: '12px 30% 8px 8px / 12px 50% 8px 8px', position: 'relative', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)' } }, [
            // Top sign
            h('div', { key: 'sign', style: { position: 'absolute', top: -78, left: '50%', transform: 'translateX(-50%)', width: 360, height: 90, background: profile.palette.primary, borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${profile.palette.primary}, 0 16px 30px -8px rgba(0,0,0,0.4)`, color: '#FFF' } }, [
              h(FitText, { key: 'n', as: 'span', maxSize: 48, minSize: 14, width: 326, height: 64, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.95, textAlign: 'center', color: '#FFF' } }, profile.name + ' · ' + profile.tagline.slice(0, 20)),
            ]),
            // Window
            h('div', { key: 'win', style: { position: 'absolute', top: 28, left: 60, right: 60, height: 70, background: '#1a1a1a', borderRadius: '40% 40% 6px 6px / 60% 60% 6px 6px', opacity: 0.7 } }),
            // Wheels
            h('div', { key: 'w1', style: { position: 'absolute', bottom: -28, left: 60, width: 70, height: 70, borderRadius: '50%', background: '#0A0A0A', border: '8px solid #2a2a2a' } }),
            h('div', { key: 'w2', style: { position: 'absolute', bottom: -28, right: 60, width: 70, height: 70, borderRadius: '50%', background: '#0A0A0A', border: '8px solid #2a2a2a' } }),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'bench-ad',
    name: 'Bench Ad',
    description: 'Park bench branded ad.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Sit with us.'),
        h('div', { key: 'stage', style: { flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'linear-gradient(to bottom, #e8eef5 0%, #c8d2c4 60%, #a8b09a 100%)', borderRadius: style.layout.cardCorner, paddingBottom: 30 } }, [
          // Bench
          h('div', { key: 'bench', style: { width: '78%', display: 'flex', flexDirection: 'column', alignItems: 'center' } }, [
            // Backrest
            h('div', { key: 'back', style: { width: '100%', height: 120, background: profile.palette.primary, borderRadius: '8px 8px 0 0', padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFF', boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3)' } }, [
              h(FitText, { key: 'n', as: 'span', maxSize: 60, minSize: 18, width: 360, height: 80, style: { fontFamily: fonts.heading, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.95, color: '#FFF' } }, profile.name),
              h(FitText, { key: 't', as: 'span', maxSize: 24, minSize: 11, width: 540, height: 80, style: { fontFamily: fonts.heading, fontWeight: 600, lineHeight: 1.25, color: '#FFF', textAlign: 'right', opacity: 0.95 } }, profile.tagline),
            ]),
            // Seat
            h('div', { key: 'seat', style: { width: '100%', height: 30, background: '#3a3a3a', borderRadius: '0 0 4px 4px' } }),
            // Legs
            h('div', { key: 'legs', style: { width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 6%' } }, [
              h('div', { key: 'l', style: { width: 18, height: 56, background: '#5a5a5a' } }),
              h('div', { key: 'r', style: { width: 18, height: 56, background: '#5a5a5a' } }),
            ]),
          ]),
        ]),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'mesh-banner',
  monolith: 'building-wrap',
  playful: 'taxi-top',
  editorial: 'subway-station',
  magazine: 'highway-billboard',
  swiss: 'flag-row',
  minimal: 'bus-shelter',
  modern: 'airport-banner',
  brutalist: 'stadium-board',
  technical: 'bench-ad',
};

export const OUTDOOR_CATALOG: ShapeCatalog = {
  archetype: 'outdoor',
  categoryLabel: 'Outdoor',
  shapes: OUTDOOR_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? OUTDOOR_SHAPES[0].id,
};
