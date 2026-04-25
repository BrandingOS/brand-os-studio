/**
 * Cover category — 10 shapes.
 *
 * Each shape lays out the brand wordmark + tagline differently. Style
 * tokens (font family, weight, padding, color) come from the active
 * deck style; shapes don't override those.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import { shiftLightness } from '../utils';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const COVER_SHAPES: SlideShape[] = [
  {
    id: 'wordmark-center',
    name: 'Wordmark Center',
    description: 'Huge brand name centered with an uppercase tagline below.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const wordmarkW = Math.min(region.width, 1500);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h('div', { style: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 } }, [
          h(FitText, {
            key: 'name',
            as: 'span',
            maxSize: headingSize(style, 420),
            minSize: 120,
            width: wordmarkW,
            height: Math.min(520, region.height - 200),
            style: {
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.85,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
              textTransform: style.typography.headingTransform === 'uppercase' ? 'uppercase' : 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          }, profile.name),
          h(FitText, {
            key: 'tag',
            as: 'div',
            maxSize: 22,
            minSize: 12,
            width: Math.min(region.width, 900),
            height: 80,
            style: {
              fontFamily: fonts.body,
              color: surface.ink,
              opacity: 0.85,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textAlign: 'center',
            },
          }, tagline),
        ])
      );
    },
  },

  {
    id: 'editorial-split',
    name: 'Editorial Split',
    description: 'Marginalia + serif name + tagline, asymmetric grid.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const colGap = style.spacing.columnGap;
      const rightColW = Math.round((region.width - colGap) * 0.58);
      const nameH = Math.round(region.height * 0.5);
      const taglineH = region.height - nameH - 32;
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: colGap, alignItems: 'end' } }, [
        h('div', { key: 'left', style: { alignSelf: 'start', marginTop: 80 } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, color: surface.ink, letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 28 } }, 'The Brand Document · Vol. 01'),
          h(FitText, {
            key: 'desc',
            as: 'div',
            maxSize: 18,
            minSize: 12,
            width: Math.round((region.width - colGap) * 0.42),
            height: 220,
            style: { fontFamily: fonts.body, color: surface.ink, lineHeight: 1.6, opacity: 0.75 },
          }, `A study of identity, purpose, and the system that holds them together. Everything ${profile.name} stands for, written down.`),
        ]),
        h('div', { key: 'right' }, [
          h(FitText, {
            key: 'name',
            maxSize: headingSize(style, 260),
            minSize: 64,
            width: rightColW,
            height: nameH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink },
          }, profile.name + '.'),
          h(FitText, {
            key: 'tag',
            as: 'div',
            maxSize: headingSize(style, 48),
            minSize: 20,
            width: rightColW,
            height: taglineH,
            style: { marginTop: 32, fontFamily: fonts.heading, color: surface.ink, opacity: 0.65, lineHeight: 1.25, letterSpacing: '-0.01em' },
          }, tagline),
        ]),
      ]);
    },
  },

  {
    id: 'minimal-rule',
    name: 'Minimal Rule',
    description: 'Thin rules above and below a small wordmark.',
    render: ({ profile, style, surface, fonts, region }) => {
      const nameW = Math.min(region.width, 1500);
      const nameH = Math.min(region.height - 260, 320);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }, [
        h('div', { key: 'r1', style: { width: 64, height: style.spacing.rule, background: surface.accent, marginBottom: 80 } }),
        h(FitText, {
          key: 'name',
          as: 'span',
          maxSize: headingSize(style, 140),
          minSize: 48,
          width: nameW,
          height: nameH,
          style: {
            fontFamily: fonts.heading,
            fontWeight: style.typography.headingWeight,
            letterSpacing: '-0.03em',
            color: surface.ink,
            lineHeight: 1.0,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }, profile.name),
        h('div', { key: 'r2', style: { marginTop: 64, width: 64, height: style.spacing.rule, background: surface.accent } }),
        h('div', { key: 'edn', style: { marginTop: 40, fontFamily: fonts.body, fontSize: 12, color: surface.ink, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.55 } }, 'Brand Guideline · Edition 01'),
      ]);
    },
  },

  {
    id: 'swiss-grid-12',
    name: 'Swiss Grid Anchor',
    description: 'Tagline at top, huge wordmark anchored to baseline.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const taglineW = Math.round(region.width * 0.5);
      const nameH = Math.round(region.height * 0.55);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
        h(FitText, {
          key: 'tag',
          as: 'div',
          maxSize: headingSize(style, 18),
          minSize: 11,
          width: taglineW,
          height: 140,
          style: { fontFamily: fonts.body, lineHeight: 1.55, color: surface.ink, opacity: 0.78 },
        }, tagline),
        h(FitText, {
          key: 'name',
          as: 'div',
          maxSize: headingSize(style, 320),
          minSize: 80,
          width: region.width,
          height: nameH,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.86, letterSpacing: style.typography.headingTracking, color: surface.ink },
        }, profile.name + '.'),
      ]);
    },
  },

  {
    id: 'brutalist-stack',
    name: 'Brutalist Stack',
    description: 'Uppercase wordmark with a thick rule and tag pills below.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const nameH = region.height - 240;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
        h('div', { key: 'top', style: { paddingBottom: 32, borderBottom: `4px solid ${surface.ink}` } }, [
          h(FitText, {
            key: 'name',
            as: 'div',
            maxSize: headingSize(style, 280),
            minSize: 64,
            width: region.width,
            height: nameH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.85, letterSpacing: '-0.04em', color: surface.ink, textTransform: 'uppercase' },
          }, profile.name),
          h(FitText, {
            key: 'tag',
            as: 'div',
            maxSize: 18,
            minSize: 11,
            width: region.width,
            height: 48,
            style: { marginTop: 24, fontFamily: fonts.body, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85, color: surface.ink },
          }, `[CASE STUDY · 01] ${tagline}`),
        ]),
        h('div', { key: 'tags', style: { display: 'flex', gap: 16 } },
          ['BRAND', 'STRATEGY', 'IDENTITY', 'TEMPLATE'].map((tag) =>
            h('span', { key: tag, style: { fontFamily: fonts.body, fontSize: 12, padding: '6px 14px', border: `2px solid ${surface.ink}`, color: surface.ink, letterSpacing: '0.08em' } }, tag)
          )
        ),
      ]);
    },
  },

  {
    id: 'monolith-tagline',
    name: 'Monolith Tagline',
    description: 'Small eyebrow over a huge tagline, divider + credit row.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const credit = overrides?.credit ?? 'Designed with brandOS';
      const heroHeight = region.height - 180;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' } }, [
        h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, color: surface.accent, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 40 } }, `Brand Doc · ${profile.name}`),
        h(FitText, {
          key: 'tag',
          maxSize: headingSize(style, 240),
          minSize: 56,
          width: region.width,
          height: heroHeight,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink },
        }, tagline + '.'),
        h('div', { key: 'cred', style: { marginTop: 56, display: 'flex', alignItems: 'center', gap: 24 } }, [
          h('div', { key: 'rule', style: { width: 80, height: 1, background: surface.accent } }),
          h('div', { key: 'c', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase' } }, credit),
        ]),
      ]);
    },
  },

  {
    id: 'technical-doc',
    name: 'Technical Doc',
    description: 'Hero copy + meta sidebar with id/mode/color/type rows.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const metaW = 360;
      const colGap = 48;
      const leftW = region.width - metaW - colGap;
      const nameH = Math.round(region.height * 0.5);
      const taglineH = region.height - nameH - 70;
      return h('div', { style: { width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `1fr ${metaW}px`, gap: colGap, alignItems: 'start' } }, [
        h('div', { key: 'left' }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 18 } }, `Document · brand-spec/${profile.id.slice(0, 6)}`),
          h(FitText, {
            key: 'name',
            as: 'div',
            maxSize: headingSize(style, 200),
            minSize: 48,
            width: leftW,
            height: nameH,
            style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.9, letterSpacing: style.typography.headingTracking, color: surface.ink },
          }, [profile.name, ' ', h('span', { key: 'sl', style: { color: surface.accent } }, '/'), ' Brand Document']),
          h(FitText, {
            key: 'tag',
            as: 'div',
            maxSize: 20,
            minSize: 11,
            width: leftW,
            height: taglineH,
            style: { opacity: 0.7, marginTop: 28, lineHeight: 1.6, color: surface.ink, fontFamily: fonts.body },
          }, tagline),
        ]),
        h('div', { key: 'meta', style: { padding: 24, border: `1px solid ${surface.border}`, fontFamily: fonts.body, color: surface.ink, fontSize: 12, lineHeight: 1.85 } }, [
          h('div', { key: 'h1', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18 } }, '// META'),
          h('div', { key: 'id' }, `id   ${profile.id.slice(0, 8)}`),
          h('div', { key: 'm' }, `mode ${profile.mode}`),
          h('div', { key: 'c' }, `color ${profile.palette.primary}`),
          h('div', { key: 't' }, `type ${profile.typography.headingFamily}`),
          h('div', { key: 'h2', style: { opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 18, marginBottom: 18 } }, '// REVISION'),
          h('div', { key: 'rev' }, `v 01.00 · ${new Date().toISOString().slice(0, 10)}`),
        ]),
      ]);
    },
  },

  {
    id: 'magazine-issue',
    name: 'Magazine Issue',
    description: 'Big italic tagline + thin rule + credit byline.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const credit = overrides?.credit ?? 'Designed with brandOS';
      const creditH = 80;
      const heroH = region.height - creditH - 20;
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' } }, [
        h(FitText, {
          key: 'tag',
          maxSize: headingSize(style, 200),
          minSize: 48,
          width: region.width,
          height: heroH,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.96, letterSpacing: style.typography.headingTracking, color: surface.ink, fontStyle: 'italic' },
        }, tagline),
        h('div', { key: 'cred', style: { marginTop: 20, display: 'flex', alignItems: 'center', gap: 20 } }, [
          h('div', { key: 'r', style: { width: 56, height: 1, background: surface.accent } }),
          h('div', { key: 'c', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, letterSpacing: '0.16em', textTransform: 'uppercase' } }, `A Brand Document by ${credit}`),
        ]),
      ]);
    },
  },

  {
    id: 'playful-tilt',
    name: 'Playful Tilt',
    description: 'Greeting eyebrow w/ circle accents and a tilted wordmark.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const nameW = Math.min(region.width, 1500);
      const nameH = Math.round(region.height * 0.5);
      const taglineH = Math.min(160, region.height - nameH - 140);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' } }, [
        h('div', { key: 'eb', style: { display: 'flex', alignItems: 'center', gap: 28, marginBottom: 36 } }, [
          h('span', { key: 'd1', style: { width: 32, height: 32, borderRadius: 999, background: surface.accent } }),
          h('span', { key: 't', style: { fontFamily: fonts.body, fontSize: 14, color: surface.ink, letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.7 } }, `Hello, we are ${profile.name}`),
          h('span', { key: 'd2', style: { width: 32, height: 32, borderRadius: 999, background: shiftLightness(surface.accent, 0.18) } }),
        ]),
        h(FitText, {
          key: 'name',
          as: 'span',
          maxSize: headingSize(style, 280),
          minSize: 72,
          width: nameW,
          height: nameH,
          style: {
            fontFamily: fonts.heading,
            fontWeight: style.typography.headingWeight,
            lineHeight: 0.86,
            letterSpacing: style.typography.headingTracking,
            color: surface.ink,
            transform: 'rotate(-2.5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          },
        }, profile.name + '!'),
        h(FitText, {
          key: 'tag',
          as: 'div',
          maxSize: 26,
          minSize: 14,
          width: Math.min(region.width, 900),
          height: taglineH,
          style: { marginTop: 32, opacity: 0.85, lineHeight: 1.4, color: surface.ink, fontFamily: fonts.body, textAlign: 'center' },
        }, tagline),
      ]);
    },
  },

  {
    id: 'modern-cta',
    name: 'Modern CTA',
    description: 'Eyebrow + wordmark with accent dot + tagline + pill CTA.',
    render: ({ profile, style, surface, fonts, region, overrides }) => {
      const tagline = overrides?.headline ?? profile.tagline;
      const credit = overrides?.credit ?? 'Designed with brandOS';
      const contentW = Math.min(region.width, 1300);
      const nameH = Math.round(region.height * 0.42);
      const taglineH = Math.max(120, region.height - nameH - 220);
      return h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 } }, [
        h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.55, letterSpacing: style.typography.eyebrowTracking, textTransform: 'uppercase' } }, 'Brand Document · 01'),
        h(FitText, {
          key: 'name',
          as: 'div',
          maxSize: headingSize(style, 160),
          minSize: 48,
          width: contentW,
          height: nameH,
          style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink },
        }, [profile.name, h('span', { key: 'd', style: { color: surface.accent } }, '.')]),
        h(FitText, {
          key: 'tag',
          as: 'div',
          maxSize: 26,
          minSize: 14,
          width: Math.min(contentW, 900),
          height: taglineH,
          style: { opacity: 0.7, lineHeight: 1.45, color: surface.ink, fontFamily: fonts.body },
        }, tagline),
        h('div', { key: 'cta', style: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 } }, [
          h('span', { key: 'pill', style: { padding: '8px 18px', borderRadius: 999, border: `1px solid ${surface.accent}`, color: surface.accent, fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' } }, 'View Guidelines'),
          h('span', { key: 'c', style: { fontFamily: fonts.body, fontSize: 12, color: surface.ink, opacity: 0.55, letterSpacing: '0.16em', textTransform: 'uppercase' } }, credit),
        ]),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'wordmark-center',
  monolith: 'monolith-tagline',
  playful: 'playful-tilt',
  editorial: 'editorial-split',
  magazine: 'magazine-issue',
  swiss: 'swiss-grid-12',
  minimal: 'minimal-rule',
  modern: 'modern-cta',
  brutalist: 'brutalist-stack',
  technical: 'technical-doc',
};

export const COVER_CATALOG: ShapeCatalog = {
  archetype: 'cover',
  categoryLabel: 'Cover',
  shapes: COVER_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? COVER_SHAPES[0].id,
};
