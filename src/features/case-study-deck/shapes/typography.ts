/**
 * Typography category — 10 shapes.
 *
 * Each shape composes the typeface specimen + scale ladder differently.
 * Style tokens (font family, weight, padding, color) come from the
 * active deck style — shapes don't override those.
 */

import { createElement, Fragment } from 'react';
import { headingSize, FitText } from '../styles';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  helpers (token-driven)  ─────────────────────── */

function wrapDiv(props: any, children: any) {
  return h('div', props, children);
}

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const TYPOGRAPHY_SHAPES: SlideShape[] = [
  {
    id: 'aa-specimen-card',
    name: 'Aa Specimen Card',
    description: 'Big Aa on a tinted card next to the typeface name.',
    render: ({ profile, style, surface, fonts, region }) =>
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, height: '100%' } }, [
        h('div', { key: 'left' }, [
          h(FitText, {
            key: 'name',
            as: 'div',
            maxSize: headingSize(style, 96),
            minSize: 32,
            width: Math.round((region.width - 60) / 2),
            height: 220,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink },
          }, profile.typography.headingFamily + '.'),
          h('div', { key: 'desc', style: { marginTop: 24, fontFamily: fonts.body, fontSize: 16, color: surface.ink, opacity: 0.7, lineHeight: 1.6, maxWidth: 480 } }, `The single typeface that carries every word of ${profile.name}. Weight ladder ready for any moment.`),
        ]),
        h('div', { key: 'right', style: { background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.6, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Display Specimen'),
          h('span', { key: 'aa', style: { fontFamily: fonts.heading, fontWeight: 900, fontSize: headingSize(style, 380), lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.05em' } }, 'Aa'),
          h('div', { key: 'wt', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, opacity: 0.6, letterSpacing: '0.06em' } }, '400 · 500 · 600 · 700 · 800 · 900'),
        ]),
      ]),
  },

  {
    id: 'weight-ladder',
    name: 'Weight Ladder',
    description: '6 weights of Aa across a row, plus a manifesto block.',
    render: ({ profile, style, surface, fonts, region }) => {
      const weights = [300, 400, 500, 600, 700, 900];
      return h('div', null, [
        h(FitText, { key: 'family', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 140, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink } }, profile.typography.headingFamily + '.'),
        h('div', { key: 'row', style: { marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 24 } }, weights.map((w) =>
          h('div', { key: w, style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
            h('span', { key: 'aa', style: { fontFamily: fonts.heading, fontSize: 140, fontWeight: w, lineHeight: 0.85, color: surface.ink } }, 'Aa'),
            h('span', { key: 'lab', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.65, letterSpacing: '0.16em', textTransform: 'uppercase' } }, String(w)),
          ])
        )),
        h('div', { key: 'tail', style: { marginTop: 60, paddingTop: 28, borderTop: `1px solid ${surface.border}` } }, [
          h('span', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 78, fontWeight: 600, lineHeight: 1, color: surface.ink, letterSpacing: '-0.02em' } }, 'The craft is the message.'),
          h('div', { key: 's', style: { marginTop: 18, fontFamily: fonts.body, fontSize: 15, color: surface.ink, opacity: 0.65, lineHeight: 1.6, maxWidth: 720 } }, profile.mission),
        ]),
      ]);
    },
  },

  {
    id: 'aa-side-ladder',
    name: 'Aa + Heading Ladder',
    description: 'Big Aa on the left, decreasing heading sizes on the right.',
    render: ({ profile, style, surface, fonts, region }) => {
      const colW = Math.round((region.width - 80) / 2);
      const rows = [
        { size: 96, weight: 700, label: 'Heading 01' },
        { size: 60, weight: 600, label: 'Heading 02' },
        { size: 36, weight: 500, label: 'Heading 03' },
        { size: 18, weight: 400, label: 'Body — Lorem ipsum dolor sit amet, consectetur.' },
      ];
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, height: '100%' } }, [
        h('div', { key: 'left' }, [
          h(FitText, { key: 'fam', as: 'div', maxSize: headingSize(style, 96), minSize: 28, width: colW, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, profile.typography.headingFamily + '.'),
          h('span', { key: 'aa', style: { display: 'block', marginTop: 32, fontFamily: fonts.heading, fontSize: headingSize(style, 320), fontWeight: 700, lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.04em' } }, 'Aa'),
        ]),
        h('div', { key: 'right', style: { paddingLeft: 40, borderLeft: `1px solid ${surface.border}`, display: 'flex', flexDirection: 'column', gap: 28 } }, rows.map((r, i) =>
          h('div', { key: i, style: { borderBottom: i === 3 ? 'none' : `1px solid ${surface.border}`, paddingBottom: 16 } }, [
            h('div', { key: 'lab', style: { fontFamily: fonts.body, fontSize: 10, color: surface.ink, opacity: 0.5, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 } }, `${r.size}px / ${r.weight}`),
            h('span', { key: 'sample', style: { fontFamily: fonts.heading, fontSize: r.size, fontWeight: r.weight, lineHeight: 1, color: surface.ink, letterSpacing: '-0.01em' } }, r.label),
          ])
        )),
      ]);
    },
  },

  {
    id: 'abcdefg-row',
    name: 'ABCDEFG Row',
    description: 'Big alphabet header with bordered specimen blocks.',
    render: ({ profile, style, surface, fonts, region }) => {
      const blocks = [
        { label: 'HEAD-01', size: 56 },
        { label: 'HEAD-02', size: 38 },
        { label: 'BODY-01', size: 18 },
        { label: 'CAPTION', size: 12 },
      ];
      return h('div', null, [
        h(FitText, { key: 'family', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 140, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, profile.typography.headingFamily + '.'),
        h('div', { key: 'frame', style: { marginTop: 40, border: `3px solid ${surface.ink}`, padding: 40 } }, [
          h('span', { key: 'abc', style: { display: 'block', fontFamily: fonts.heading, fontSize: 240, fontWeight: 700, lineHeight: 0.9, color: surface.ink, letterSpacing: '-0.04em', textTransform: 'uppercase' } }, 'ABCDEFG'),
          h('div', { key: 'lab', style: { marginTop: 16, fontFamily: fonts.body, fontSize: 14, color: surface.ink, opacity: 0.85, letterSpacing: '0.04em' } }, `[01] ${profile.typography.headingFamily} — sole typeface, all-caps default, 400 / 700 weights.`),
        ]),
        h('div', { key: 'grid', style: { marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 } }, blocks.map((b) =>
          h('div', { key: b.label, style: { border: `2px solid ${surface.ink}`, padding: 20 } }, [
            h('div', { key: 'lab', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.7, marginBottom: 10 } }, b.label),
            h('span', { key: 'sample', style: { fontFamily: fonts.heading, fontSize: b.size, fontWeight: 700, color: surface.ink, textTransform: 'uppercase', letterSpacing: '-0.02em' } }, 'ABC'),
          ])
        )),
      ]);
    },
  },

  {
    id: 'aa-spec-table',
    name: 'Aa + Spec Table',
    description: 'Specimen on the left, mono spec table on the right.',
    render: ({ profile, style, surface, fonts, region }) => {
      const rows = [
        ['display', 96],
        ['heading-01', 64],
        ['heading-02', 44],
        ['heading-03', 28],
        ['body', 16],
        ['caption', 12],
      ] as const;
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 50 } }, [
        h('div', { key: 'left' }, [
          h(FitText, { key: 'fam', as: 'div', maxSize: headingSize(style, 96), minSize: 28, width: Math.round(region.width * 0.55), height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, profile.typography.headingFamily + '.'),
          h('span', { key: 'aa', style: { display: 'block', marginTop: 32, fontFamily: fonts.heading, fontSize: 280, fontWeight: 600, lineHeight: 0.85, color: surface.ink } }, 'Aa'),
          h('div', { key: 'lab', style: { marginTop: 16, fontFamily: fonts.body, fontSize: 12, color: surface.ink, opacity: 0.65, letterSpacing: '0.16em', textTransform: 'uppercase' } }, 'Stack · 400 / 500 / 600 / 700 / 900'),
        ]),
        h('div', { key: 'right', style: { border: `1px solid ${surface.border}`, padding: 24, fontFamily: fonts.body, color: surface.ink, fontSize: 11, lineHeight: 1.85, alignSelf: 'start' } }, [
          h('div', { key: 'h1', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 } }, '// SCALE'),
          ...rows.map(([name, size]) => h('div', { key: name }, `${name}  ${size}px`)),
          h('div', { key: 'h2', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 22, marginBottom: 16 } }, '// FAMILY'),
          h('div', { key: 'p' }, `primary  ${profile.typography.headingFamily}`),
          h('div', { key: 's' }, `body     ${profile.typography.bodyFamily}`),
        ]),
      ]);
    },
  },

  {
    id: 'pangram-fill',
    name: 'Pangram Fill',
    description: 'A pangram in the typeface, filling the slide edge to edge.',
    render: ({ profile, style, surface, fonts, region }) =>
      h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' } }, [
        h(FitText, { key: 'family', as: 'div', maxSize: headingSize(style, 96), minSize: 28, width: region.width, height: 140, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, profile.typography.headingFamily + '.'),
        h(FitText, { key: 'pangram', as: 'div', maxSize: headingSize(style, 220), minSize: 48, width: region.width, height: region.height - 240, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink } }, 'Sphinx of black quartz, judge my vow.'),
        h('div', { key: 'foot', style: { fontFamily: fonts.body, fontSize: 12, color: surface.ink, opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase' } }, `Pangram · ${profile.typography.headingFamily} · ${profile.typography.headingWeight}`),
      ]),
  },

  {
    id: 'numeral-stack',
    name: 'Numeral Stack',
    description: '0 1 2 3 4 5 6 7 8 9 — the numeral set as the hero.',
    render: ({ profile, style, surface, fonts, region }) =>
      h('div', null, [
        h(FitText, { key: 'family', as: 'div', maxSize: headingSize(style, 96), minSize: 28, width: region.width, height: 140, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, profile.typography.headingFamily + '.'),
        h('div', { key: 'numerals', style: { marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12 } }, '0123456789'.split('').map((n) =>
          h('div', { key: n, style: { aspectRatio: '1', background: surface.subtle, borderRadius: style.layout.cardCorner, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            h('span', { style: { fontFamily: fonts.heading, fontSize: 110, fontWeight: 700, color: surface.ink, lineHeight: 1, letterSpacing: '-0.04em' } }, n)
          )
        )),
        h('div', { key: 'lab', style: { marginTop: 32, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.6, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'Numerals · Tabular · 700'),
      ]),
  },

  {
    id: 'pair-display-body',
    name: 'Pair: Display + Body',
    description: 'Display typeface and body typeface side by side.',
    render: ({ profile, style, surface, fonts, region }) => {
      const colW = Math.round((region.width - 80) / 2);
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, height: '100%' } }, [
        h('div', { key: 'd', style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: `1px solid ${surface.border}`, paddingRight: 40 } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.55, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Display'),
          h(FitText, { key: 'aa', as: 'div', maxSize: headingSize(style, 280), minSize: 100, width: colW - 40, height: 320, style: { fontFamily: fonts.heading, fontWeight: 800, lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.04em' } }, 'Aa'),
          h('div', { key: 'fam', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, opacity: 0.7, letterSpacing: '0.16em', textTransform: 'uppercase' } }, profile.typography.headingFamily),
        ]),
        h('div', { key: 'b', style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.55, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Body'),
          h(FitText, { key: 'aa', as: 'div', maxSize: 280, minSize: 100, width: colW, height: 320, style: { fontFamily: fonts.body, fontWeight: 400, lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.02em' } }, 'Aa'),
          h('div', { key: 'fam', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, opacity: 0.7, letterSpacing: '0.16em', textTransform: 'uppercase' } }, profile.typography.bodyFamily),
        ]),
      ]);
    },
  },

  {
    id: 'tagline-cinematic',
    name: 'Tagline Cinematic',
    description: 'A single oversized line of brand voice in the active typeface.',
    render: ({ profile, style, surface, fonts, region }) =>
      h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' } }, [
        h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, color: surface.ink, opacity: 0.55, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 32 } }, `Voice · ${profile.typography.headingFamily}`),
        h(FitText, { key: 'tag', as: 'div', maxSize: headingSize(style, 220), minSize: 56, width: region.width, height: region.height - 200, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink } }, profile.tagline),
        h('div', { key: 'foot', style: { marginTop: 32, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.6, letterSpacing: '0.2em', textTransform: 'uppercase' } }, `${profile.name} · Headline ladder`),
      ]),
  },

  {
    id: 'serif-sans-mono-trio',
    name: 'Serif/Sans/Mono Trio',
    description: 'Three typefaces in three columns — display, body, mono.',
    render: ({ profile, style, surface, fonts, region }) => {
      const colW = Math.round((region.width - 80) / 3);
      const cols = [
        { label: 'Display', family: profile.typography.headingFamily, font: fonts.heading, weight: 700 },
        { label: 'Body', family: profile.typography.bodyFamily, font: fonts.body, weight: 400 },
        { label: 'Mono', family: 'JetBrains Mono', font: `'JetBrains Mono', monospace`, weight: 500 },
      ];
      return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, height: '100%' } }, cols.map((c, i) =>
        h('div', { key: c.label, style: { padding: 28, borderLeft: i === 0 ? 'none' : `1px solid ${surface.border}` } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.55, letterSpacing: '0.32em', textTransform: 'uppercase' } }, c.label),
          h('span', { key: 'aa', style: { display: 'block', marginTop: 32, fontFamily: c.font, fontSize: 200, fontWeight: c.weight, lineHeight: 0.9, color: surface.ink, letterSpacing: '-0.03em' } }, 'Aa'),
          h('div', { key: 'fam', style: { marginTop: 24, fontFamily: c.font, fontSize: 22, fontWeight: c.weight, color: surface.ink } }, c.family),
          h('div', { key: 'desc', style: { marginTop: 14, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.7, lineHeight: 1.55 } },
            i === 0 ? 'Wordmarks, headlines, quotes.' : i === 1 ? 'Paragraphs, captions, UI.' : 'Code, data, technical.'
          ),
        ])
      ));
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'aa-specimen-card',
  monolith: 'aa-specimen-card',
  playful: 'aa-specimen-card',
  editorial: 'aa-side-ladder',
  magazine: 'aa-side-ladder',
  swiss: 'weight-ladder',
  minimal: 'weight-ladder',
  modern: 'weight-ladder',
  brutalist: 'abcdefg-row',
  technical: 'aa-spec-table',
};

export const TYPOGRAPHY_CATALOG: ShapeCatalog = {
  archetype: 'typography',
  categoryLabel: 'Typography',
  shapes: TYPOGRAPHY_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? TYPOGRAPHY_SHAPES[0].id,
};
