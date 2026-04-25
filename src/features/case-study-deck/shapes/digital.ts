/**
 * Digital category — 10 shapes.
 *
 * Each shape composes a different digital surface (browser, phones,
 * dashboard, ads, etc.) for a single brand. Style tokens (font family /
 * weight / corner radius / shadow / spacing) flow from the active deck
 * style — shapes don't override those.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import type { SlideShape, ShapeCatalog } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const DIGITAL_SHAPES: SlideShape[] = [
  {
    id: 'browser-hero',
    name: 'Browser Hero',
    description: 'Desktop browser frame with website hero (existing).',
    render: ({ profile, style, surface, fonts, region }) => {
      const browserH = 580;
      const browserPad = 30;
      const innerPad = 60;
      const innerW = region.width - browserPad * 2 - innerPad * 2;
      const heroH = 220;
      const missionH = 110;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink } }, 'On every screen.'),
        h('div', { key: 'br', style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, height: browserH, padding: browserPad, position: 'relative', boxShadow: style.effect.shadow !== 'none' ? '0 40px 80px -16px rgba(0,0,0,0.45)' : 'none' } }, [
          h('div', { key: 'dots', style: { display: 'flex', gap: 6, marginBottom: 20 } }, [
            h('span', { key: 'd1', style: { width: 12, height: 12, borderRadius: 999, background: '#ff5f56' } }),
            h('span', { key: 'd2', style: { width: 12, height: 12, borderRadius: 999, background: '#ffbd2e' } }),
            h('span', { key: 'd3', style: { width: 12, height: 12, borderRadius: 999, background: '#27c93f' } }),
          ]),
          h('div', { key: 'site', style: { background: surface.bg, borderRadius: 12, padding: innerPad, display: 'flex', flexDirection: 'column', gap: 20, height: 480 } }, [
            h('div', { key: 'nav', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
              h('span', { key: 'mark', style: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, color: surface.ink, letterSpacing: '-0.02em' } }, profile.name),
              h('div', { key: 'links', style: { display: 'flex', gap: 18, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 } }, ['Home', 'Products', 'About', 'Contact'].map((l) => h('span', { key: l }, l))),
            ]),
            h('div', { key: 'hero', style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 } }, [
              h(FitText, { key: 'tag', as: 'span', maxSize: 70, minSize: 28, width: innerW, height: heroH, style: { fontFamily: fonts.heading, fontWeight: 700, lineHeight: 1.05, color: surface.ink, letterSpacing: '-0.025em' } }, profile.tagline),
              h(FitText, { key: 'mis', as: 'div', maxSize: 18, minSize: 11, width: Math.min(innerW, 720), height: missionH, style: { opacity: 0.7, lineHeight: 1.6, color: surface.ink, fontFamily: fonts.body } }, profile.mission),
              h('div', { key: 'btns', style: { display: 'flex', gap: 14, marginTop: 14 } }, [
                h('span', { key: 'b1', style: { padding: '12px 28px', borderRadius: style.id === 'playful' ? 999 : 12, background: profile.palette.primary, color: '#FFF', fontFamily: fonts.body, fontSize: 13, fontWeight: 600 } }, 'Get started'),
                h('span', { key: 'b2', style: { padding: '12px 28px', borderRadius: style.id === 'playful' ? 999 : 12, border: `1px solid ${surface.border}`, color: surface.ink, fontFamily: fonts.body, fontSize: 13, fontWeight: 600 } }, 'Learn more'),
              ]),
            ]),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'phone-trio',
    name: 'Phone Trio',
    description: 'Three iPhone-style screens side by side.',
    render: ({ profile, style, surface, fonts, region }) => {
      const phoneW = 320;
      const phoneH = 660;
      const screens = [
        { eb: 'Home', heading: profile.tagline },
        { eb: 'About', heading: profile.name },
        { eb: 'Vision', heading: profile.mission },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink } }, 'In your hand.'),
        h('div', { key: 'row', style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flex: 1 } }, screens.map((s, i) =>
          h('div', { key: i, style: { width: phoneW, height: phoneH, borderRadius: 48, background: '#0A0A0A', padding: 14, boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -16px rgba(0,0,0,0.45)' : 'none', transform: i === 1 ? 'translateY(-20px)' : 'translateY(20px)' } },
            h('div', { style: { width: '100%', height: '100%', borderRadius: 36, background: i === 1 ? profile.palette.primary : surface.bg, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
              h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: i === 1 ? '#FFF' : surface.ink, opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' } }, s.eb),
              h(FitText, { key: 'h', as: 'span', maxSize: 44, minSize: 16, width: phoneW - 56, height: 220, style: { fontFamily: fonts.heading, fontWeight: 700, lineHeight: 1.05, color: i === 1 ? '#FFF' : surface.ink, letterSpacing: '-0.02em' } }, s.heading),
              h('div', { key: 'btn', style: { padding: '12px 16px', borderRadius: style.id === 'playful' ? 999 : 10, background: i === 1 ? '#FFF' : profile.palette.primary, color: i === 1 ? '#0A0A0A' : '#FFF', fontFamily: fonts.body, fontSize: 12, fontWeight: 600, textAlign: 'center' } }, 'Continue'),
            ])
          )
        )),
      ]);
    },
  },

  {
    id: 'dashboard-app',
    name: 'Dashboard App',
    description: 'KPI dashboard with charts and tiles.',
    render: ({ profile, style, surface, fonts, region }) => {
      const innerW = region.width - 60;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Operate at scale.'),
        h('div', { key: 'app', style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 30, flex: 1, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.4)' : 'none' } }, [
          h('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF', fontFamily: fonts.body, fontSize: 13 } }, [
            h('span', { key: 'b', style: { fontWeight: 700, fontFamily: fonts.heading, fontSize: 18, color: '#FFF' } }, profile.name + ' · Console'),
            h('span', { key: 's', style: { opacity: 0.6 } }, 'v2.4.1'),
          ]),
          h('div', { key: 'kpis', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 } }, [
            { l: 'MRR', v: '$182k' }, { l: 'Active', v: '12,408' }, { l: 'Churn', v: '0.8%' }, { l: 'NPS', v: '72' },
          ].map((k, i) =>
            h('div', { key: i, style: { background: i === 0 ? profile.palette.primary : '#1c1c1c', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 } }, [
              h('span', { key: 'l', style: { fontFamily: fonts.body, fontSize: 11, color: '#FFF', opacity: 0.7, letterSpacing: '0.16em', textTransform: 'uppercase' } }, k.l),
              h('span', { key: 'v', style: { fontFamily: fonts.heading, fontSize: 36, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' } }, k.v),
            ])
          )),
          h('div', { key: 'chart', style: { background: '#1c1c1c', borderRadius: 14, padding: 24, flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10 } }, Array.from({ length: 18 }).map((_, i) =>
            h('div', { key: i, style: { flex: 1, height: `${30 + ((i * 13) % 70)}%`, background: i % 3 === 0 ? profile.palette.primary : '#3a3a3a', borderRadius: 6 } })
          )),
        ]),
      ]);
    },
  },

  {
    id: 'landing-stack',
    name: 'Landing Stack',
    description: 'Vertical scroll-style landing page sections.',
    render: ({ profile, style, surface, fonts, region }) => {
      const sections = [
        { bg: profile.palette.primary, ink: '#FFF', eb: 'Hero', text: profile.tagline },
        { bg: surface.subtle, ink: surface.ink, eb: 'Mission', text: profile.mission },
        { bg: '#0A0A0A', ink: '#FFF', eb: 'CTA', text: 'Start with ' + profile.name + '.' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 24, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Scroll, see, decide.'),
        h('div', { key: 'frame', style: { borderRadius: style.layout.cardCorner, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.3)' : 'none', border: `1px solid ${surface.border}` } }, sections.map((s, i) =>
          h('div', { key: i, style: { background: s.bg, color: s.ink, padding: 32, flex: 1, display: 'flex', alignItems: 'center', gap: 28 } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.7, letterSpacing: '0.24em', textTransform: 'uppercase', minWidth: 100 } }, s.eb),
            h(FitText, { key: 't', as: 'span', maxSize: 44, minSize: 16, width: region.width - 200, height: 120, style: { fontFamily: fonts.heading, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', color: s.ink } }, s.text),
          ])
        )),
      ]);
    },
  },

  {
    id: 'chat-bubbles',
    name: 'Chat Bubbles',
    description: 'Messaging interface with brand-colored bubbles.',
    render: ({ profile, style, surface, fonts, region }) => {
      const bubbles: { side: 'l' | 'r'; text: string }[] = [
        { side: 'l', text: 'Hey — heard about ' + profile.name + '?' },
        { side: 'r', text: profile.tagline },
        { side: 'l', text: 'Sounds like exactly what I need.' },
        { side: 'r', text: profile.mission.slice(0, 80) + (profile.mission.length > 80 ? '…' : '') },
        { side: 'l', text: 'Sign me up.' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Conversational.'),
        h('div', { key: 'phone', style: { width: 520, alignSelf: 'center', flex: 1, background: surface.subtle, borderRadius: 36, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -16px rgba(0,0,0,0.35)' : 'none', border: `1px solid ${surface.border}` } }, bubbles.map((b, i) =>
          h('div', { key: i, style: { display: 'flex', justifyContent: b.side === 'r' ? 'flex-end' : 'flex-start' } },
            h('span', { style: { maxWidth: '75%', padding: '12px 18px', borderRadius: 22, background: b.side === 'r' ? profile.palette.primary : '#FFF', color: b.side === 'r' ? '#FFF' : '#0A0A0A', fontFamily: fonts.body, fontSize: 15, lineHeight: 1.4, border: b.side === 'l' ? `1px solid ${surface.border}` : 'none' } }, b.text)
          )
        )),
      ]);
    },
  },

  {
    id: 'ad-network',
    name: 'Ad Network',
    description: 'Four ad placements: banner, square, story, vertical.',
    render: ({ profile, style, surface, fonts, region }) => {
      const ads = [
        { kind: 'Banner 728×90', w: 'span 2', h: 110, accent: true },
        { kind: 'Square 1:1', w: 'span 1', h: 280, accent: false },
        { kind: 'Story 9:16', w: 'span 1', h: 280, accent: true },
        { kind: 'Vertical 300×600', w: 'span 2', h: 200, accent: false },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Across the network.'),
        h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: style.spacing.blockGap, flex: 1 } }, ads.map((a, i) =>
          h('div', { key: i, style: { gridColumn: a.w, height: a.h, borderRadius: style.layout.cardCorner, background: a.accent ? profile.palette.primary : surface.subtle, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.18)' : 'none' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, color: a.accent ? '#FFF' : surface.ink, opacity: 0.75, letterSpacing: '0.24em', textTransform: 'uppercase' } }, a.kind),
            h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: a.h > 200 ? 56 : 32, fontWeight: 800, color: a.accent ? '#FFF' : surface.ink, letterSpacing: '-0.03em', lineHeight: 1 } }, profile.name),
            h('span', { key: 'cta', style: { fontFamily: fonts.body, fontSize: 11, color: a.accent ? '#FFF' : surface.ink, opacity: 0.85, letterSpacing: '0.18em', textTransform: 'uppercase' } }, 'Learn more →'),
          ])
        )),
      ]);
    },
  },

  {
    id: 'social-feed',
    name: 'Social Feed',
    description: 'Instagram/Twitter-style feed posts.',
    render: ({ profile, style, surface, fonts, region }) => {
      const posts = [
        { user: profile.name, time: '2h', text: profile.tagline },
        { user: profile.name + ' Studio', time: '1d', text: 'Behind every line of code: ' + profile.mission.slice(0, 60) + '…' },
        { user: profile.name + ' Team', time: '3d', text: 'New release dropping. Stay close.' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Where it spreads.'),
        h('div', { key: 'feed', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: style.spacing.blockGap, flex: 1 } }, posts.map((p, i) =>
          h('div', { key: i, style: { background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, border: `1px solid ${surface.border}` } }, [
            h('div', { key: 'u', style: { display: 'flex', alignItems: 'center', gap: 12 } }, [
              h('span', { key: 'av', style: { width: 38, height: 38, borderRadius: 999, background: profile.palette.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontFamily: fonts.heading, fontSize: 16, fontWeight: 700 } }, profile.name.charAt(0)),
              h('div', { key: 'meta', style: { display: 'flex', flexDirection: 'column' } }, [
                h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: surface.ink } }, p.user),
                h('span', { key: 't', style: { fontFamily: fonts.body, fontSize: 11, color: surface.ink, opacity: 0.6 } }, '@' + profile.name.toLowerCase().replace(/\s+/g, '') + ' · ' + p.time),
              ]),
            ]),
            h('div', { key: 'box', style: { aspectRatio: '1.4', background: i === 1 ? profile.palette.primary : '#0A0A0A', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'flex-end', color: '#FFF', fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' } }, profile.name),
            h('span', { key: 'tx', style: { fontFamily: fonts.body, fontSize: 13, color: surface.ink, lineHeight: 1.5, opacity: 0.85 } }, p.text),
          ])
        )),
      ]);
    },
  },

  {
    id: 'widget-grid',
    name: 'Widget Grid',
    description: 'Six product widgets / cards.',
    render: ({ profile, style, surface, fonts, region }) => {
      const widgets = [
        { l: 'Today', v: '24', s: 'tasks' },
        { l: 'Streak', v: '12d', s: 'going strong' },
        { l: 'Goal', v: '78%', s: 'of weekly' },
        { l: 'Balance', v: '$2.4k', s: 'available' },
        { l: 'Health', v: '92', s: 'of 100' },
        { l: 'Mood', v: 'Calm', s: 'today' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Pieces, in place.'),
        h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: style.spacing.blockGap, flex: 1 } }, widgets.map((w, i) =>
          h('div', { key: i, style: { background: i === 0 || i === 4 ? profile.palette.primary : surface.subtle, borderRadius: style.layout.cardCorner, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 12px 30px -8px rgba(0,0,0,0.15)' : 'none' } }, [
            h('span', { key: 'l', style: { fontFamily: fonts.body, fontSize: 11, color: i === 0 || i === 4 ? '#FFF' : surface.ink, opacity: 0.75, letterSpacing: '0.2em', textTransform: 'uppercase' } }, w.l),
            h('span', { key: 'v', style: { fontFamily: fonts.heading, fontSize: 56, fontWeight: 800, color: i === 0 || i === 4 ? '#FFF' : surface.ink, letterSpacing: '-0.04em', lineHeight: 1 } }, w.v),
            h('span', { key: 's', style: { fontFamily: fonts.body, fontSize: 12, color: i === 0 || i === 4 ? '#FFF' : surface.ink, opacity: 0.7 } }, w.s),
          ])
        )),
      ]);
    },
  },

  {
    id: 'device-stack',
    name: 'Device Stack',
    description: 'Laptop + tablet + phone in perspective.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Every device, one system.'),
        h('div', { key: 'stage', style: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, [
          // Laptop
          h('div', { key: 'lap', style: { position: 'relative', width: 760, height: 460, background: '#0A0A0A', borderRadius: 18, padding: 16, boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -16px rgba(0,0,0,0.4)' : 'none' } },
            h('div', { style: { width: '100%', height: '100%', borderRadius: 8, background: profile.palette.primary, padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' } },
              h('span', { style: { fontFamily: fonts.heading, fontSize: 96, fontWeight: 900, letterSpacing: '-0.04em' } }, profile.name)
            )
          ),
          // Tablet
          h('div', { key: 'tab', style: { position: 'absolute', right: 90, bottom: 30, width: 240, height: 320, background: '#0A0A0A', borderRadius: 22, padding: 12, boxShadow: style.effect.shadow !== 'none' ? '0 22px 48px -12px rgba(0,0,0,0.4)' : 'none', transform: 'rotate(8deg)' } },
            h('div', { style: { width: '100%', height: '100%', borderRadius: 14, background: surface.bg, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${surface.border}` } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 9, color: surface.ink, opacity: 0.6, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'Tablet'),
              h('span', { key: 'h', style: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: surface.ink, lineHeight: 1.05 } }, profile.tagline.slice(0, 40)),
              h('span', { key: 'cta', style: { padding: '8px 12px', borderRadius: 8, background: profile.palette.primary, color: '#FFF', fontFamily: fonts.body, fontSize: 10, fontWeight: 700, alignSelf: 'flex-start' } }, 'Open'),
            ])
          ),
          // Phone
          h('div', { key: 'ph', style: { position: 'absolute', left: 70, bottom: 60, width: 140, height: 280, background: '#0A0A0A', borderRadius: 24, padding: 8, boxShadow: style.effect.shadow !== 'none' ? '0 22px 48px -12px rgba(0,0,0,0.4)' : 'none', transform: 'rotate(-6deg)' } },
            h('div', { style: { width: '100%', height: '100%', borderRadius: 18, background: profile.palette.primary, padding: 14, display: 'flex', alignItems: 'flex-end', color: '#FFF', fontFamily: fonts.heading, fontSize: 18, fontWeight: 800 } }, profile.name.charAt(0))
          ),
        ]),
      ]);
    },
  },

  {
    id: 'app-onboarding',
    name: 'App Onboarding',
    description: 'Three-screen onboarding with brand language.',
    render: ({ profile, style, surface, fonts, region }) => {
      const phoneW = 320;
      const phoneH = 600;
      const screens = [
        { eb: '01', heading: 'Welcome to ' + profile.name + '.', body: profile.mission, accent: false },
        { eb: '02', heading: profile.tagline, body: 'Built for everyone who refuses to compromise.', accent: true },
        { eb: '03', heading: 'Ready when you are.', body: 'Tap continue to begin.', accent: false },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'First impression.'),
        h('div', { key: 'row', style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36, flex: 1 } }, screens.map((s, i) =>
          h('div', { key: i, style: { width: phoneW, height: phoneH, borderRadius: 44, background: '#0A0A0A', padding: 12, boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.4)' : 'none' } },
            h('div', { style: { width: '100%', height: '100%', borderRadius: 32, background: s.accent ? profile.palette.primary : surface.bg, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: s.accent ? 'none' : `1px solid ${surface.border}` } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 12, color: s.accent ? '#FFF' : surface.ink, opacity: 0.7, letterSpacing: '0.24em' } }, s.eb + ' / 03'),
              h('div', { key: 'mid', style: { display: 'flex', flexDirection: 'column', gap: 14 } }, [
                h(FitText, { key: 'h', as: 'span', maxSize: 40, minSize: 14, width: phoneW - 56, height: 180, style: { fontFamily: fonts.heading, fontWeight: 700, color: s.accent ? '#FFF' : surface.ink, lineHeight: 1.05, letterSpacing: '-0.02em' } }, s.heading),
                h(FitText, { key: 'b', as: 'div', maxSize: 14, minSize: 10, width: phoneW - 56, height: 100, style: { fontFamily: fonts.body, color: s.accent ? '#FFF' : surface.ink, opacity: 0.85, lineHeight: 1.5 } }, s.body),
              ]),
              h('div', { key: 'btn', style: { padding: '14px 16px', borderRadius: style.id === 'playful' ? 999 : 12, background: s.accent ? '#FFF' : profile.palette.primary, color: s.accent ? '#0A0A0A' : '#FFF', fontFamily: fonts.body, fontSize: 13, fontWeight: 700, textAlign: 'center' } }, i === 2 ? 'Get started' : 'Continue'),
            ])
          )
        )),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'browser-hero',
  monolith: 'device-stack',
  playful: 'chat-bubbles',
  editorial: 'landing-stack',
  magazine: 'social-feed',
  swiss: 'dashboard-app',
  minimal: 'phone-trio',
  modern: 'app-onboarding',
  brutalist: 'ad-network',
  technical: 'widget-grid',
};

export const DIGITAL_CATALOG: ShapeCatalog = {
  archetype: 'digital',
  categoryLabel: 'Digital',
  shapes: DIGITAL_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? DIGITAL_SHAPES[0].id,
};
