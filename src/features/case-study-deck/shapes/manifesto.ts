/**
 * Manifesto category — 10 shapes.
 *
 * Each shape lays out the manifesto headline (mission / belief
 * statement) + supporting subhead differently. Style tokens come from
 * the active deck style.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import { shiftLightness } from '../utils';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const MANIFESTO_SHAPES: SlideShape[] = [
  {
    id: 'bold-flood',
    name: 'Bold Flood',
    description: 'Single huge headline filling the entire region.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center' } },
        h(FitText, {
          maxSize: headingSize(style, 150),
          minSize: 48,
          width: region.width,
          height: region.height,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.95, letterSpacing: style.typography.headingTracking, color: surface.ink },
        }, headline)
      );
    },
  },

  {
    id: 'editorial-quote',
    name: 'Editorial Quote',
    description: 'Italic side label + headline column + body subhead.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const colGap = style.spacing.columnGap;
      const leftW = Math.round((region.width - colGap) * 0.33);
      const rightW = region.width - colGap - leftW;
      const headH = Math.round(region.height * 0.55);
      const subH = region.height - headH - 36;
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `${leftW}px ${rightW}px`, gap: colGap, alignItems: 'start' } }, [
        h('div', { key: 'l' },
          h(FitText, {
            as: 'div',
            maxSize: 17,
            minSize: 12,
            width: leftW,
            height: 220,
            style: { fontFamily: fonts.body, color: surface.ink, opacity: 0.65, lineHeight: 1.7, fontStyle: 'italic' },
          }, '"What we believe, why we make, and how we make it."')
        ),
        h('div', { key: 'r' }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 84),
            minSize: 32,
            width: rightW,
            height: headH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.06, letterSpacing: style.typography.headingTracking, color: surface.ink, fontStyle: 'italic' },
          }, `"${headline}"`),
          h(FitText, {
            key: 's',
            as: 'div',
            maxSize: 20,
            minSize: 12,
            width: rightW,
            height: subH,
            style: { opacity: 0.7, marginTop: 36, lineHeight: 1.65, color: surface.ink, fontFamily: fonts.body },
          }, subhead),
        ]),
      ]);
    },
  },

  {
    id: 'minimal-centered',
    name: 'Minimal Centered',
    description: 'Thin rule, light headline, faint subhead — all centered.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const headW = Math.min(region.width, 1100);
      const subW = Math.min(region.width, 720);
      const headH = Math.round(region.height * 0.55);
      const subH = Math.min(220, region.height - headH - 120);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' } }, [
        h('div', { key: 'r', style: { width: 48, height: 1, background: surface.accent, marginBottom: 60 } }),
        h(FitText, {
          key: 'h',
          as: 'div',
          maxSize: headingSize(style, 78),
          minSize: 28,
          width: headW,
          height: headH,
          style: { fontFamily: fonts.heading, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.18, color: surface.ink, textAlign: 'center' },
        }, headline),
        h(FitText, {
          key: 's',
          as: 'div',
          maxSize: 20,
          minSize: 12,
          width: subW,
          height: subH,
          style: { marginTop: 56, opacity: 0.55, lineHeight: 1.7, color: surface.ink, fontFamily: fonts.body, textAlign: 'center' },
        }, subhead),
      ]);
    },
  },

  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    description: 'Headline left-aligned, subhead column underneath.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const subW = Math.round(region.width * 7 / 12);
      const headH = Math.round(region.height * 0.6);
      const subH = region.height - headH - 32;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' } }, [
        h(FitText, {
          key: 'h',
          as: 'div',
          maxSize: headingSize(style, 110),
          minSize: 36,
          width: region.width,
          height: headH,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.96, letterSpacing: style.typography.headingTracking, color: surface.ink },
        }, headline),
        h(FitText, {
          key: 's',
          as: 'div',
          maxSize: 18,
          minSize: 11,
          width: subW,
          height: subH,
          style: { opacity: 0.7, marginTop: 32, lineHeight: 1.6, color: surface.ink, fontFamily: fonts.body },
        }, subhead),
      ]);
    },
  },

  {
    id: 'brutalist-frame',
    name: 'Brutalist Frame',
    description: 'Bordered uppercase headline + uppercase body underneath.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const headPanelH = Math.round(region.height * 0.55);
      const headTextH = headPanelH - 80;
      const subH = region.height - headPanelH - 36;
      const subW = Math.min(region.width, 1200);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' } }, [
        h('div', { key: 'frame', style: { borderTop: `4px solid ${surface.ink}`, borderBottom: `4px solid ${surface.ink}`, padding: '40px 0' } },
          h(FitText, {
            as: 'div',
            maxSize: headingSize(style, 120),
            minSize: 36,
            width: region.width,
            height: headTextH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, textTransform: 'uppercase', lineHeight: 0.94, letterSpacing: '-0.03em', color: surface.ink },
          }, headline)
        ),
        h(FitText, {
          key: 's',
          as: 'div',
          maxSize: 18,
          minSize: 11,
          width: subW,
          height: subH,
          style: { marginTop: 36, fontFamily: fonts.body, lineHeight: 1.7, textTransform: 'uppercase', letterSpacing: '0.04em', color: surface.ink },
        }, subhead),
      ]);
    },
  },

  {
    id: 'monolith-quote',
    name: 'Monolith Quote',
    description: 'Single quoted huge tagline centered on the slide.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h(FitText, {
          maxSize: headingSize(style, 150),
          minSize: 48,
          width: Math.min(region.width, 1500),
          height: region.height - 100,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink, textAlign: 'center' },
        }, `"${headline}"`)
      );
    },
  },

  {
    id: 'technical-source',
    name: 'Technical Source',
    description: 'Headline + subhead with mono SOURCE / PRINCIPLES sidebar.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const colGap = 60;
      const leftFr = 1.4;
      const rightFr = 1;
      const leftW = Math.round((region.width - colGap) * leftFr / (leftFr + rightFr));
      const rightW = region.width - colGap - leftW;
      const headH = Math.round(region.height * 0.5);
      const subH = region.height - headH - 28;
      const principles = (profile.personality.length ? profile.personality : ['Clarity', 'Craft', 'Care']).slice(0, 5);
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `${leftW}px ${rightW}px`, gap: colGap } }, [
        h('div', { key: 'l' }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 70),
            minSize: 28,
            width: leftW,
            height: headH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, letterSpacing: style.typography.headingTracking, lineHeight: 1.1, color: surface.ink },
          }, headline),
          h(FitText, {
            key: 's',
            as: 'div',
            maxSize: 18,
            minSize: 11,
            width: leftW,
            height: subH,
            style: { opacity: 0.65, marginTop: 28, lineHeight: 1.7, color: surface.ink, fontFamily: fonts.body },
          }, subhead),
        ]),
        h('div', { key: 'side', style: { padding: 24, border: `1px solid ${surface.border}`, fontFamily: fonts.body, fontSize: 12, color: surface.ink, lineHeight: 1.85 } }, [
          h('div', { key: 's1', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 } }, '// SOURCE'),
          h('div', { key: 'r1' }, 'brand.strategy.mission'),
          h('div', { key: 'r2' }, 'profile.tagline'),
          h('div', { key: 's2', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 22, marginBottom: 16 } }, '// PRINCIPLES'),
          ...principles.map((p, i) => h('div', { key: i }, `${String(i + 1).padStart(2, '0')} · ${p}`)),
        ]),
      ]);
    },
  },

  {
    id: 'magazine-pull',
    name: 'Magazine Pull',
    description: 'Oversized accent slash + italic quote + body column.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const colGap = style.spacing.columnGap;
      const leftFr = 0.8;
      const rightFr = 1.4;
      const leftW = Math.round((region.width - colGap) * leftFr / (leftFr + rightFr));
      const rightW = region.width - colGap - leftW - 60;
      const headH = Math.round(region.height * 0.5);
      const subH = region.height - headH - 36;
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `${leftW}px 1fr`, gap: colGap } }, [
        h('div', { key: 'l', style: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start' } },
          h('span', {
            style: {
              fontFamily: fonts.heading,
              fontSize: headingSize(style, 360),
              fontWeight: 700,
              lineHeight: 0.7,
              color: surface.accent,
              letterSpacing: '-0.06em',
              display: 'inline-block',
              transform: 'rotate(-12deg)',
              transformOrigin: 'left bottom',
            },
          }, '"')
        ),
        h('div', { key: 'r', style: { alignSelf: 'center', borderLeft: `1px solid ${surface.border}`, paddingLeft: 60 } }, [
          h(FitText, {
            key: 'h',
            as: 'div',
            maxSize: headingSize(style, 92),
            minSize: 32,
            width: rightW,
            height: headH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.04, color: surface.ink, fontStyle: 'italic' },
          }, `"${headline}"`),
          h(FitText, {
            key: 's',
            as: 'div',
            maxSize: 20,
            minSize: 12,
            width: rightW,
            height: subH,
            style: { marginTop: 36, opacity: 0.7, lineHeight: 1.7, color: surface.ink, fontFamily: fonts.body },
          }, subhead),
        ]),
      ]);
    },
  },

  {
    id: 'playful-burst',
    name: 'Playful Burst',
    description: 'Tilted headline floating over circle accents.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const headW = Math.min(region.width, 1400);
      const subW = Math.min(region.width, 1100);
      const headH = Math.round(region.height * 0.55);
      const subH = region.height - headH - 36;
      return h('div', { style: { width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }, [
        h('div', { key: 'd1', style: { position: 'absolute', left: 0, top: 80, width: 220, height: 220, background: surface.accent, borderRadius: 999, opacity: 0.18 } }),
        h('div', { key: 'd2', style: { position: 'absolute', right: 0, bottom: 80, width: 160, height: 160, background: shiftLightness(surface.accent, -0.2), borderRadius: 999, opacity: 0.22 } }),
        h(FitText, {
          key: 'h',
          as: 'div',
          maxSize: headingSize(style, 140),
          minSize: 36,
          width: headW,
          height: headH,
          style: { position: 'relative', fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.94, color: surface.ink, transform: 'rotate(-1deg)' },
        }, headline),
        h(FitText, {
          key: 's',
          as: 'div',
          maxSize: 24,
          minSize: 13,
          width: subW,
          height: subH,
          style: { position: 'relative', marginTop: 36, opacity: 0.75, lineHeight: 1.5, color: surface.ink, fontFamily: fonts.body },
        }, subhead),
      ]);
    },
  },

  {
    id: 'modern-list',
    name: 'Modern List',
    description: 'Headline + subhead with personality pill list.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const headline = overrides?.headline ?? profile.tagline;
      const subhead = overrides?.subhead ?? profile.mission;
      const colGap = style.spacing.columnGap;
      const half = Math.round((region.width - colGap) / 2);
      const rightContentW = half - 32;
      const subH = Math.round(region.height * 0.6);
      const tags = (profile.personality.length ? profile.personality : ['Clarity', 'Craft', 'Care']).slice(0, 4);
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `${half}px ${half}px`, gap: colGap, alignContent: 'center' } }, [
        h('div', { key: 'l' },
          h(FitText, {
            as: 'div',
            maxSize: headingSize(style, 86),
            minSize: 32,
            width: half,
            height: region.height,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.05, color: surface.ink, letterSpacing: style.typography.headingTracking },
          }, headline)
        ),
        h('div', { key: 'r', style: { alignSelf: 'center', paddingLeft: 32, borderLeft: `1px solid ${surface.border}` } }, [
          h(FitText, {
            key: 's',
            as: 'div',
            maxSize: 20,
            minSize: 12,
            width: rightContentW,
            height: subH,
            style: { opacity: 0.75, lineHeight: 1.65, color: surface.ink, fontFamily: fonts.body },
          }, subhead),
          h('div', { key: 'tags', style: { marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8 } },
            tags.map((p) =>
              h('span', { key: p, style: { padding: '6px 14px', borderRadius: 999, background: surface.subtle, color: surface.ink, fontFamily: fonts.body, fontSize: 12, opacity: 0.85 } }, p)
            )
          ),
        ]),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'bold-flood',
  monolith: 'monolith-quote',
  playful: 'playful-burst',
  editorial: 'editorial-quote',
  magazine: 'magazine-pull',
  swiss: 'swiss-grid',
  minimal: 'minimal-centered',
  modern: 'modern-list',
  brutalist: 'brutalist-frame',
  technical: 'technical-source',
};

export const MANIFESTO_CATALOG: ShapeCatalog = {
  archetype: 'manifesto',
  categoryLabel: 'Manifesto',
  shapes: MANIFESTO_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? MANIFESTO_SHAPES[0].id,
};
