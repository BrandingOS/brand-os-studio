// Phase 4.1 — consolidated template seeds.
//
// 11 categories × 8-12 templates each = ~100 brand-bound seed
// templates. Each template is a base layout × a TemplateMood —
// the mood swaps headline weight, accent color choice, decorative
// shape opacity, and background tone via the moodChoices() helper.
//
// Every emitted document:
//   • parses against BrandOSDocumentSchema (verified by
//     seeds.test.ts at src/features/templates/seeds/seeds.test.ts).
//   • binds colors + fonts through SlotRefs (verified by the same
//     test — at least one SlotRef color per template, at least one
//     SlotRef font per text-bearing template).
//   • carries a stable id, slug, name, mood, tags, dimensions,
//     thumbnail data URI.
//
// Adding a new template: pick the right category section below,
// add a `mk(...)` call. Adding a new category: extend
// SEED_CATEGORIES + add a section here.

import type { BrandOSDocument } from '@/features/editor/schema';
import type { Template, TemplateMood } from '../types';
import {
  ACCENT, BODY_FONT, HEADING_FONT, N_DARK, N_LIGHT, N_MID, PRIMARY,
  SECONDARY, doc, ellipse, line, logo, moodChoices, page, rect, text,
  thumbnail,
} from './builders';

export { SEED_CATEGORIES } from './categories';
import { PROMPT_PRESET_TEMPLATES } from './promptPresets';

// ─── Template factory ──────────────────────────────────────────────────

interface MkArgs {
  slug: string;
  name: string;
  mood: TemplateMood;
  tags: string[];
  width: number;
  height: number;
  document: BrandOSDocument;
  categoryId: string;
}

function mk(args: MkArgs): Template {
  return {
    id: `tpl-${args.slug}`,
    slug: args.slug,
    name: args.name,
    description: null,
    source: 'curated',
    categoryId: args.categoryId,
    document: args.document,
    // Phase 5 — render the actual first page as the thumbnail SVG.
    // The mood drives a stand-in palette so SlotRefs in the doc
    // resolve to colors that match the variant's intent (the live
    // editor swaps in the real brand kit on open).
    thumbnailUrl: thumbnail({ page: args.document.pages[0], mood: args.mood }),
    previewImageUrl: null,
    width: args.width,
    height: args.height,
    tags: args.tags,
    mood: args.mood,
    promptText: null,
    promptSystemHints: null,
    rasterImageUrl: null,
    uploadedByUserId: null,
    uploadStatus: null,
    uploadedAt: null,
    approvedAt: null,
    approvedByUserId: null,
    rejectionReason: null,
    visibility: 'public',
    isPremium: false,
    requiredPlan: null,
    useCount: 0,
  };
}

// ─── Category 1 — SOCIAL POSTS (square 1080×1080) ──────────────────────

function socialPostHero(mood: TemplateMood, headline: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1080, h = 1080;
  return doc({
    contentType: 'social-post',
    pages: [page({
      width: w, height: h, background: m.heroBg,
      layers: [
        logo({ name: 'Logo', x: w * 0.06, y: w * 0.06, w: w * 0.18, h: w * 0.1 }),
        text({
          name: 'Headline', x: w * 0.06, y: w * 0.36, w: w * 0.88, h: w * 0.3,
          text: headline, fontSize: w * 0.07, fontWeight: m.headlineWeight,
          color: m.headlineColor, fontFamily: HEADING_FONT, lineHeight: 1.1,
        }),
        rect({ name: 'Divider', x: w * 0.06, y: w * 0.7, w: w * 0.15, h: 4, fill: m.accentColor }),
        text({
          name: 'Tag', x: w * 0.06, y: w * 0.74, w: w * 0.5, h: w * 0.04,
          text: 'YOURBRAND.COM', fontSize: w * 0.022, fontWeight: 600,
          color: m.headlineColor, letterSpacing: 0.1,
        }),
      ],
    })],
  });
}

function socialPostQuote(mood: TemplateMood, quote: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1080, h = 1080;
  return doc({
    contentType: 'social-post',
    pages: [page({
      width: w, height: h, background: m.bodyBg,
      layers: [
        ellipse({
          name: 'Decor', x: w * 0.6, y: -w * 0.15, w: w * 0.7, h: w * 0.7,
          fill: m.accentColor, opacity: m.decorOpacity,
        }),
        text({
          name: 'Quote mark', x: w * 0.06, y: w * 0.18, w: w * 0.2, h: w * 0.16,
          text: '“', fontSize: w * 0.18, fontWeight: 800,
          color: m.accentColor, fontFamily: HEADING_FONT,
        }),
        text({
          name: 'Quote', x: w * 0.06, y: w * 0.4, w: w * 0.78, h: w * 0.4,
          text: quote, fontSize: w * 0.05, fontWeight: m.headlineWeight,
          color: m.bodyColor, fontFamily: HEADING_FONT, lineHeight: 1.25,
        }),
        text({
          name: 'Attribution', x: w * 0.06, y: w * 0.84, w: w * 0.6, h: w * 0.04,
          text: '— Your team', fontSize: w * 0.025,
          color: m.bodyColor, fontFamily: BODY_FONT,
        }),
      ],
    })],
  });
}

function socialStoryCTA(mood: TemplateMood, headline: string, cta: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1080, h = 1920;
  return doc({
    contentType: 'social-post',
    pages: [page({
      width: w, height: h, background: m.heroBg,
      layers: [
        logo({ name: 'Logo', x: w * 0.08, y: h * 0.05, w: w * 0.25, h: h * 0.05 }),
        text({
          name: 'Headline', x: w * 0.08, y: h * 0.32, w: w * 0.84, h: h * 0.25,
          text: headline, fontSize: h * 0.05, fontWeight: m.headlineWeight,
          color: m.headlineColor, fontFamily: HEADING_FONT, lineHeight: 1.1,
        }),
        rect({
          name: 'CTA bg', x: w * 0.08, y: h * 0.62, w: w * 0.5, h: h * 0.06,
          fill: m.accentColor, cornerRadius: 12,
        }),
        text({
          name: 'CTA', x: w * 0.08, y: h * 0.625, w: w * 0.5, h: h * 0.05,
          text: cta, fontSize: h * 0.024, fontWeight: 700,
          color: m.headlineColor, align: 'center',
        }),
      ],
    })],
  });
}

const SOCIAL_TEMPLATES: Template[] = (
  [
    ['professional', 'Launch your product with clarity'],
    ['bold', 'BIG IDEAS DESERVE BIG REACH'],
    ['minimal', 'Less, but better'],
    ['elegant', 'A new chapter begins today'],
    ['playful', 'Hey there! 👋'],
  ] as Array<[TemplateMood, string]>
).map(([mood, headline], i) =>
  mk({
    slug: `social-hero-${mood}`,
    name: `Social hero — ${moodLabel(mood)}`,
    mood, tags: ['social', 'hero', mood], width: 1080, height: 1080,
    document: socialPostHero(mood, headline), categoryId: 'cat-social-posts',
  }),
).concat(
  ([
    ['minimal', 'The future belongs to those who build with clarity.'],
    ['elegant', 'Craft is what remains when the trend has passed.'],
    ['vintage', 'Old wisdom, new tools.'],
  ] as Array<[TemplateMood, string]>).map(([mood, q]) =>
    mk({
      slug: `social-quote-${mood}`,
      name: `Quote post — ${moodLabel(mood)}`,
      mood, tags: ['social', 'quote', mood], width: 1080, height: 1080,
      document: socialPostQuote(mood, q), categoryId: 'cat-social-posts',
    }),
  ),
).concat(
  ([
    ['bold', 'Your money.\nYour rules.\nYour clarity.', 'Get started'],
    ['playful', 'Ready to launch?\nWe got you.', 'Try free'],
  ] as Array<[TemplateMood, string, string]>).map(([mood, hl, cta]) =>
    mk({
      slug: `social-story-${mood}`,
      name: `Story CTA — ${moodLabel(mood)}`,
      mood, tags: ['social', 'story', 'cta', mood], width: 1080, height: 1920,
      document: socialStoryCTA(mood, hl, cta), categoryId: 'cat-social-posts',
    }),
  ),
);

// ─── Category 2 — PRESENTATIONS (16:9) ─────────────────────────────────

function presentationCover(mood: TemplateMood, title: string, subtitle: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1920, h = 1080;
  return doc({
    contentType: 'presentation',
    pages: [page({
      width: w, height: h, background: m.heroBg, name: 'Cover',
      layers: [
        logo({ name: 'Logo', x: w * 0.05, y: h * 0.06, w: w * 0.12, h: h * 0.08 }),
        rect({
          name: 'Decor band', x: 0, y: h * 0.78, w, h: h * 0.04,
          fill: m.accentColor, opacity: m.decorOpacity * 2,
        }),
        text({
          name: 'Title', x: w * 0.05, y: h * 0.32, w: w * 0.6, h: h * 0.32,
          text: title, fontSize: h * 0.09, fontWeight: m.headlineWeight,
          color: m.headlineColor, fontFamily: HEADING_FONT, lineHeight: 1.05,
        }),
        text({
          name: 'Subtitle', x: w * 0.05, y: h * 0.7, w: w * 0.5, h: h * 0.05,
          text: subtitle, fontSize: h * 0.03, fontWeight: m.bodyWeight,
          color: m.headlineColor, opacity: 0.7,
        }),
      ],
    })],
  });
}

function presentationContent(mood: TemplateMood, label: string, body: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1920, h = 1080;
  return doc({
    contentType: 'presentation',
    pages: [page({
      width: w, height: h, background: m.bodyBg, name: 'Content',
      layers: [
        logo({ name: 'Logo', x: w * 0.05, y: h * 0.06, w: w * 0.08, h: h * 0.06 }),
        text({
          name: 'Label', x: w * 0.05, y: h * 0.3, w: w * 0.9, h: h * 0.05,
          text: label, fontSize: h * 0.025, fontWeight: 700,
          color: m.accentColor, letterSpacing: 0.15,
        }),
        text({
          name: 'Body', x: w * 0.05, y: h * 0.4, w: w * 0.7, h: h * 0.45,
          text: body, fontSize: h * 0.055, fontWeight: m.headlineWeight,
          color: m.bodyColor, fontFamily: HEADING_FONT, lineHeight: 1.2,
        }),
      ],
    })],
  });
}

const PRESENTATION_TEMPLATES: Template[] = (
  [
    ['professional', 'Quarterly Business Review', 'Q1 2026'],
    ['bold', 'WE ARE GROWING.', 'A 2026 product update'],
    ['minimal', 'Strategy 2026', 'How we win'],
    ['elegant', 'A look ahead', 'Vision · Roadmap · People'],
    ['modern', 'Investor pitch', 'Series A — Q2 2026'],
    ['tech', 'Architecture review', 'May 2026'],
  ] as Array<[TemplateMood, string, string]>
).map(([mood, title, sub]) =>
  mk({
    slug: `pres-cover-${mood}`,
    name: `Cover — ${moodLabel(mood)}`,
    mood, tags: ['presentation', 'cover', mood], width: 1920, height: 1080,
    document: presentationCover(mood, title, sub), categoryId: 'cat-presentations',
  }),
).concat(
  ([
    ['professional', 'PROBLEM', 'Brands die when their kit lives in 4 different tools.'],
    ['bold', 'WHAT IF', 'You ran your entire brand from one place?'],
    ['modern', 'SOLUTION', 'One operating system. Brand, design, AI, distribution — all under one roof.'],
    ['tech', 'ARCHITECTURE', 'Schema-first. Adapter-bound. Brand-aware. Open to extend.'],
  ] as Array<[TemplateMood, string, string]>).map(([mood, label, body]) =>
    mk({
      slug: `pres-content-${mood}`,
      name: `Content — ${moodLabel(mood)}`,
      mood, tags: ['presentation', 'content', mood], width: 1920, height: 1080,
      document: presentationContent(mood, label, body), categoryId: 'cat-presentations',
    }),
  ),
);

// ─── Category 3 — BUSINESS CARDS (1050×600 print-safe) ─────────────────

function businessCardLayout(mood: TemplateMood, layout: 'left' | 'centered' | 'horizontal-bar'): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1050, h = 600;
  const layers = (() => {
    if (layout === 'centered') {
      return [
        logo({ name: 'Logo', x: w * 0.4, y: h * 0.1, w: w * 0.2, h: h * 0.25 }),
        text({
          name: 'Name', x: w * 0.1, y: h * 0.42, w: w * 0.8, h: h * 0.1,
          text: 'Jane Smith', fontSize: h * 0.09, fontWeight: m.headlineWeight,
          color: m.bodyColor, align: 'center', fontFamily: HEADING_FONT,
        }),
        text({
          name: 'Title', x: w * 0.1, y: h * 0.55, w: w * 0.8, h: h * 0.06,
          text: 'Brand Manager', fontSize: h * 0.05,
          color: m.accentColor, align: 'center',
        }),
        text({
          name: 'Contact', x: w * 0.1, y: h * 0.78, w: w * 0.8, h: h * 0.05,
          text: 'jane@yourbrand.com  ·  +1 234 56789',
          fontSize: h * 0.035, color: m.bodyColor, align: 'center',
        }),
      ];
    }
    if (layout === 'horizontal-bar') {
      return [
        rect({ name: 'Side bar', x: 0, y: 0, w: w * 0.35, h: h, fill: m.accentColor }),
        logo({ name: 'Logo', x: w * 0.04, y: h * 0.4, w: w * 0.25, h: h * 0.2 }),
        text({
          name: 'Name', x: w * 0.4, y: h * 0.3, w: w * 0.55, h: h * 0.1,
          text: 'Jane Smith', fontSize: h * 0.09, fontWeight: m.headlineWeight,
          color: m.bodyColor, fontFamily: HEADING_FONT,
        }),
        text({
          name: 'Title', x: w * 0.4, y: h * 0.43, w: w * 0.55, h: h * 0.06,
          text: 'Brand Manager', fontSize: h * 0.05, color: m.bodyColor,
        }),
        text({
          name: 'Email', x: w * 0.4, y: h * 0.62, w: w * 0.55, h: h * 0.05,
          text: 'jane@yourbrand.com', fontSize: h * 0.035, color: m.bodyColor,
        }),
        text({
          name: 'Phone', x: w * 0.4, y: h * 0.7, w: w * 0.55, h: h * 0.05,
          text: '+1 234 56789', fontSize: h * 0.035, color: m.bodyColor,
        }),
      ];
    }
    // left
    return [
      logo({ name: 'Logo', x: w * 0.06, y: h * 0.08, w: w * 0.25, h: h * 0.25 }),
      text({
        name: 'Name', x: w * 0.06, y: h * 0.45, w: w * 0.88, h: h * 0.1,
        text: 'Jane Smith', fontSize: h * 0.08, fontWeight: m.headlineWeight,
        color: m.bodyColor, fontFamily: HEADING_FONT,
      }),
      text({
        name: 'Title', x: w * 0.06, y: h * 0.56, w: w * 0.88, h: h * 0.06,
        text: 'Brand Manager', fontSize: h * 0.05, color: m.accentColor,
      }),
      text({
        name: 'Email', x: w * 0.06, y: h * 0.7, w: w * 0.88, h: h * 0.05,
        text: 'jane@yourbrand.com', fontSize: h * 0.04, color: m.bodyColor,
      }),
      text({
        name: 'Phone', x: w * 0.06, y: h * 0.78, w: w * 0.88, h: h * 0.05,
        text: '+1 234 56789', fontSize: h * 0.04, color: m.bodyColor,
      }),
      rect({ name: 'Accent bar', x: 0, y: h * 0.92, w, h: h * 0.08, fill: m.accentColor }),
    ];
  })();
  return doc({ contentType: 'business-card', pages: [page({ width: w, height: h, background: m.bodyBg, layers })] });
}

const BUSINESS_CARD_TEMPLATES: Template[] = (
  [
    ['professional', 'left'], ['minimal', 'left'], ['elegant', 'left'],
    ['professional', 'centered'], ['modern', 'centered'], ['playful', 'centered'],
    ['bold', 'horizontal-bar'], ['vintage', 'horizontal-bar'], ['tech', 'horizontal-bar'],
  ] as Array<[TemplateMood, 'left' | 'centered' | 'horizontal-bar']>
).map(([mood, layout]) =>
  mk({
    slug: `bc-${layout}-${mood}`,
    name: `Business card — ${moodLabel(mood)} ${layout}`,
    mood, tags: ['business-card', layout, mood], width: 1050, height: 600,
    document: businessCardLayout(mood, layout), categoryId: 'cat-business-cards',
  }),
);

// ─── Category 4 — INVOICES (1080×1920 portrait) ───────────────────────

function invoiceLayout(mood: TemplateMood): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1080, h = 1920;
  return doc({
    contentType: 'invoice',
    pages: [page({
      width: w, height: h, background: '#ffffff',
      layers: [
        logo({ name: 'Logo', x: w * 0.06, y: h * 0.04, w: w * 0.25, h: h * 0.05 }),
        text({
          name: 'Label', x: w * 0.65, y: h * 0.04, w: w * 0.29, h: h * 0.04,
          text: 'INVOICE', fontSize: h * 0.03, fontWeight: 700,
          color: m.accentColor, fontFamily: HEADING_FONT, align: 'right',
        }),
        text({ name: 'Bill to label', x: w * 0.06, y: h * 0.14, w: w * 0.4, h: h * 0.02, text: 'Bill To:', fontSize: h * 0.015, fontWeight: 600, color: N_DARK }),
        text({ name: 'Client', x: w * 0.06, y: h * 0.17, w: w * 0.4, h: h * 0.025, text: 'Acme Corporation', fontSize: h * 0.018, color: N_DARK }),
        text({ name: 'Invoice #', x: w * 0.65, y: h * 0.14, w: w * 0.29, h: h * 0.02, text: '#INV-0042', fontSize: h * 0.015, fontWeight: 600, color: N_DARK, align: 'right' }),
        text({ name: 'Date', x: w * 0.65, y: h * 0.17, w: w * 0.29, h: h * 0.02, text: 'May 4, 2026', fontSize: h * 0.013, color: N_MID, align: 'right' }),
        rect({ name: 'Divider top', x: w * 0.06, y: h * 0.24, w: w * 0.88, h: 1, fill: N_MID, opacity: 0.3 }),
        text({ name: 'Item 1', x: w * 0.06, y: h * 0.27, w: w * 0.5, h: h * 0.02, text: 'Strategy Consultation', fontSize: h * 0.014, color: N_DARK }),
        text({ name: 'Price 1', x: w * 0.65, y: h * 0.27, w: w * 0.29, h: h * 0.02, text: '$2,400.00', fontSize: h * 0.014, fontWeight: 500, color: N_DARK, align: 'right' }),
        text({ name: 'Item 2', x: w * 0.06, y: h * 0.30, w: w * 0.5, h: h * 0.02, text: 'Brand Identity Package', fontSize: h * 0.014, color: N_DARK }),
        text({ name: 'Price 2', x: w * 0.65, y: h * 0.30, w: w * 0.29, h: h * 0.02, text: '$4,800.00', fontSize: h * 0.014, fontWeight: 500, color: N_DARK, align: 'right' }),
        rect({ name: 'Divider bottom', x: w * 0.06, y: h * 0.35, w: w * 0.88, h: 1, fill: N_MID, opacity: 0.3 }),
        text({ name: 'Total label', x: w * 0.5, y: h * 0.38, w: w * 0.15, h: h * 0.025, text: 'Total', fontSize: h * 0.018, fontWeight: 700, color: N_DARK }),
        text({ name: 'Total', x: w * 0.65, y: h * 0.38, w: w * 0.29, h: h * 0.025, text: '$7,200.00', fontSize: h * 0.018, fontWeight: 700, color: m.accentColor, align: 'right' }),
        rect({ name: 'Footer accent', x: 0, y: h * 0.95, w, h: h * 0.05, fill: m.accentColor, opacity: 0.85 }),
      ],
    })],
  });
}

const INVOICE_TEMPLATES: Template[] = (
  ['professional', 'minimal', 'modern', 'elegant', 'bold', 'vintage', 'tech', 'natural'] as TemplateMood[]
).map((mood) =>
  mk({
    slug: `invoice-${mood}`,
    name: `Invoice — ${moodLabel(mood)}`,
    mood, tags: ['invoice', mood], width: 1080, height: 1920,
    document: invoiceLayout(mood), categoryId: 'cat-invoices',
  }),
);

// ─── Category 5 — LETTERHEADS (A4 portrait) ───────────────────────────

function letterheadLayout(mood: TemplateMood): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1240, h = 1754;
  return doc({
    contentType: 'letterhead',
    pages: [page({
      width: w, height: h, background: '#ffffff',
      layers: [
        rect({ name: 'Top band', x: 0, y: 0, w, h: h * 0.08, fill: m.accentColor }),
        logo({ name: 'Logo', x: w * 0.06, y: h * 0.11, w: w * 0.18, h: h * 0.06 }),
        text({ name: 'Tagline', x: w * 0.06, y: h * 0.18, w: w * 0.5, h: h * 0.02, text: 'Your tagline here', fontSize: h * 0.014, color: m.accentColor, letterSpacing: 0.1 }),
        text({ name: 'Letter body', x: w * 0.1, y: h * 0.3, w: w * 0.8, h: h * 0.5, text: 'Dear [Client],\n\nThank you for [reason]. We are writing to [purpose]. Please find attached [document].\n\nKind regards,', fontSize: h * 0.014, color: N_DARK, lineHeight: 1.5 }),
        rect({ name: 'Divider', x: w * 0.1, y: h * 0.86, w: w * 0.3, h: 1, fill: N_MID, opacity: 0.4 }),
        text({ name: 'Address', x: w * 0.06, y: h * 0.92, w: w * 0.88, h: h * 0.04, text: '123 Brand Street · City, ST 00000 · yourbrand.com', fontSize: h * 0.011, color: N_MID, align: 'center' }),
      ],
    })],
  });
}

const LETTERHEAD_TEMPLATES: Template[] = (
  ['professional', 'minimal', 'elegant', 'modern', 'bold', 'vintage', 'natural', 'tech'] as TemplateMood[]
).map((mood) =>
  mk({
    slug: `letterhead-${mood}`,
    name: `Letterhead — ${moodLabel(mood)}`,
    mood, tags: ['letterhead', mood], width: 1240, height: 1754,
    document: letterheadLayout(mood), categoryId: 'cat-letterheads',
  }),
);

// ─── Category 6 — BROCHURES (multi-page; cover page seeded) ───────────

function brochureCover(mood: TemplateMood): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1650, h = 1275;
  return doc({
    contentType: 'brochure',
    pages: [
      page({
        width: w, height: h, background: m.heroBg, name: 'Cover',
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: h * 0.08, w: w * 0.15, h: h * 0.1 }),
          text({ name: 'Title', x: w * 0.06, y: h * 0.4, w: w * 0.8, h: h * 0.3, text: 'Our Services', fontSize: h * 0.12, fontWeight: m.headlineWeight, color: m.headlineColor, fontFamily: HEADING_FONT }),
          text({ name: 'Subtitle', x: w * 0.06, y: h * 0.73, w: w * 0.6, h: h * 0.05, text: 'A guide to what we do', fontSize: h * 0.04, color: m.headlineColor, opacity: 0.75 }),
          rect({ name: 'Decor', x: w * 0.7, y: h * 0.05, w: w * 0.25, h: h * 0.9, fill: m.accentColor, opacity: m.decorOpacity }),
        ],
      }),
      page({
        width: w, height: h, background: m.bodyBg, name: 'Page 2',
        layers: [
          text({ name: 'Section', x: w * 0.06, y: h * 0.1, w: w * 0.88, h: h * 0.06, text: 'WHAT WE OFFER', fontSize: h * 0.025, fontWeight: 700, color: m.accentColor, letterSpacing: 0.15 }),
          text({ name: 'Body', x: w * 0.06, y: h * 0.2, w: w * 0.88, h: h * 0.7, text: 'A short paragraph explaining your offering, philosophy, and what sets you apart.', fontSize: h * 0.025, color: m.bodyColor, lineHeight: 1.5 }),
        ],
      }),
    ],
  });
}

const BROCHURE_TEMPLATES: Template[] = (
  ['professional', 'minimal', 'elegant', 'bold', 'modern', 'vintage', 'natural', 'maximalist'] as TemplateMood[]
).map((mood) =>
  mk({
    slug: `brochure-${mood}`,
    name: `Brochure — ${moodLabel(mood)}`,
    mood, tags: ['brochure', mood], width: 1650, height: 1275,
    document: brochureCover(mood), categoryId: 'cat-brochures',
  }),
);

// ─── Category 7 — POSTERS (A3 portrait) ───────────────────────────────

function posterLayout(mood: TemplateMood, headline: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1754, h = 2480;
  return doc({
    contentType: 'poster',
    pages: [page({
      width: w, height: h, background: m.heroBg,
      layers: [
        ellipse({ name: 'Decor', x: -w * 0.3, y: h * 0.6, w: w * 1.2, h: w * 1.2, fill: m.accentColor, opacity: m.decorOpacity }),
        logo({ name: 'Logo', x: w * 0.06, y: h * 0.05, w: w * 0.18, h: h * 0.05 }),
        text({ name: 'Headline', x: w * 0.06, y: h * 0.18, w: w * 0.88, h: h * 0.4, text: headline, fontSize: h * 0.1, fontWeight: m.headlineWeight, color: m.headlineColor, fontFamily: HEADING_FONT, lineHeight: 1.0 }),
        text({ name: 'Date', x: w * 0.06, y: h * 0.66, w: w * 0.88, h: h * 0.04, text: 'May 15, 2026  ·  7:00 PM', fontSize: h * 0.025, fontWeight: 700, color: m.headlineColor, letterSpacing: 0.15 }),
        text({ name: 'Venue', x: w * 0.06, y: h * 0.71, w: w * 0.88, h: h * 0.03, text: '123 Brand Street, City', fontSize: h * 0.02, color: m.headlineColor, opacity: 0.8 }),
        rect({ name: 'Bottom band', x: 0, y: h * 0.94, w, h: h * 0.06, fill: m.accentColor }),
      ],
    })],
  });
}

const POSTER_TEMPLATES: Template[] = (
  [
    ['bold', 'EVENT\nNIGHT'],
    ['minimal', 'A talk\non craft'],
    ['vintage', 'GRAND\nOPENING'],
    ['modern', 'Launch\n2026'],
    ['playful', 'YOU\'RE\nINVITED'],
    ['elegant', 'An evening\nof art'],
    ['tech', 'BUILD\nDAY'],
    ['natural', 'Garden\nfest'],
  ] as Array<[TemplateMood, string]>
).map(([mood, headline]) =>
  mk({
    slug: `poster-${mood}`,
    name: `Poster — ${moodLabel(mood)}`,
    mood, tags: ['poster', mood], width: 1754, height: 2480,
    document: posterLayout(mood, headline), categoryId: 'cat-posters',
  }),
);

// ─── Category 8 — BANNERS (1500×500) ──────────────────────────────────

function bannerLayout(mood: TemplateMood, headline: string, sub: string): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1500, h = 500;
  return doc({
    contentType: 'banner',
    pages: [page({
      width: w, height: h, background: m.heroBg,
      layers: [
        logo({ name: 'Logo', x: w * 0.04, y: h * 0.18, w: w * 0.12, h: h * 0.4 }),
        text({ name: 'Headline', x: w * 0.2, y: h * 0.25, w: w * 0.55, h: h * 0.3, text: headline, fontSize: h * 0.16, fontWeight: m.headlineWeight, color: m.headlineColor, fontFamily: HEADING_FONT }),
        text({ name: 'Subhead', x: w * 0.2, y: h * 0.62, w: w * 0.5, h: h * 0.12, text: sub, fontSize: h * 0.07, color: m.headlineColor, opacity: 0.8 }),
        ellipse({ name: 'Accent', x: w * 0.78, y: -h * 0.2, w: h * 1.0, h: h * 1.0, fill: m.accentColor, opacity: m.decorOpacity }),
      ],
    })],
  });
}

const BANNER_TEMPLATES: Template[] = (
  [
    ['professional', 'A new way to brand', 'Ship faster. Stay on-brand.'],
    ['bold', 'BUILT FOR SCALE', 'For agencies and creators'],
    ['minimal', 'Simple. Powerful.', 'Your brand. Your control.'],
    ['modern', 'The brand OS', 'For teams that move fast'],
    ['playful', "Let's make it fun", 'Branding without the headache'],
    ['elegant', 'Crafted for craft', 'A studio in your browser'],
    ['vintage', 'Made with care', 'A modern take on craft'],
    ['tech', 'API-first branding', 'Schema-driven · Adapter-bound'],
  ] as Array<[TemplateMood, string, string]>
).map(([mood, hl, sub]) =>
  mk({
    slug: `banner-${mood}`,
    name: `Banner — ${moodLabel(mood)}`,
    mood, tags: ['banner', mood], width: 1500, height: 500,
    document: bannerLayout(mood, hl, sub), categoryId: 'cat-banners',
  }),
);

// ─── Category 9 — EMAIL SIGNATURES (600×200) ──────────────────────────

function emailSigLayout(mood: TemplateMood): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 600, h = 200;
  return doc({
    contentType: 'email-signature',
    pages: [page({
      width: w, height: h, background: '#ffffff',
      layers: [
        logo({ name: 'Logo', x: w * 0.04, y: h * 0.2, w: w * 0.18, h: h * 0.6 }),
        rect({ name: 'Divider', x: w * 0.26, y: h * 0.15, w: 2, h: h * 0.7, fill: m.accentColor }),
        text({ name: 'Name', x: w * 0.3, y: h * 0.18, w: w * 0.66, h: h * 0.18, text: 'Jane Smith', fontSize: h * 0.12, fontWeight: 700, color: N_DARK, fontFamily: HEADING_FONT }),
        text({ name: 'Title', x: w * 0.3, y: h * 0.4, w: w * 0.66, h: h * 0.12, text: 'Brand Manager · Your Company', fontSize: h * 0.08, color: m.accentColor }),
        text({ name: 'Email', x: w * 0.3, y: h * 0.6, w: w * 0.66, h: h * 0.1, text: 'jane@yourbrand.com', fontSize: h * 0.07, color: N_MID }),
        text({ name: 'Phone', x: w * 0.3, y: h * 0.75, w: w * 0.66, h: h * 0.1, text: '+1 234 56789', fontSize: h * 0.07, color: N_MID }),
      ],
    })],
  });
}

const EMAIL_SIG_TEMPLATES: Template[] = (
  ['professional', 'minimal', 'modern', 'elegant', 'bold', 'tech', 'playful', 'natural'] as TemplateMood[]
).map((mood) =>
  mk({
    slug: `email-sig-${mood}`,
    name: `Email signature — ${moodLabel(mood)}`,
    mood, tags: ['email-signature', mood], width: 600, height: 200,
    document: emailSigLayout(mood), categoryId: 'cat-email-signatures',
  }),
);

// ─── Category 10 — PROFILE ICONS (1080×1080 square) ────────────────────

function profileIconLayout(mood: TemplateMood, style: 'logo-only' | 'monogram' | 'badge'): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1080, h = 1080;
  const layers = style === 'logo-only'
    ? [logo({ name: 'Logo', x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 })]
    : style === 'monogram'
    ? [
        ellipse({ name: 'Disc', x: w * 0.05, y: h * 0.05, w: w * 0.9, h: h * 0.9, fill: m.heroBg }),
        text({ name: 'Initial', x: 0, y: h * 0.3, w, h: h * 0.5, text: 'B', fontSize: w * 0.5, fontWeight: 800, color: m.headlineColor, fontFamily: HEADING_FONT, align: 'center' }),
      ]
    : [
        rect({ name: 'Frame', x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8, fill: m.heroBg, cornerRadius: 24 }),
        logo({ name: 'Logo', x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.5 }),
      ];
  // Background is the brand's lightest neutral so the logo's auto
  // variant has a contrast surface to compute against AND every
  // profile-icon template carries a SlotRef-bound color (satisfies
  // the brand-bound rule even on the logo-only style).
  return doc({ contentType: 'profile-icon', pages: [page({ width: w, height: h, background: N_LIGHT, layers })] });
}

const PROFILE_ICON_TEMPLATES: Template[] = (
  [
    ['professional', 'logo-only'], ['minimal', 'logo-only'], ['modern', 'logo-only'],
    ['bold', 'monogram'], ['elegant', 'monogram'], ['vintage', 'monogram'],
    ['playful', 'badge'], ['natural', 'badge'], ['tech', 'badge'],
  ] as Array<[TemplateMood, 'logo-only' | 'monogram' | 'badge']>
).map(([mood, style]) =>
  mk({
    slug: `profile-${style}-${mood}`,
    name: `${capitalize(style.replace('-', ' '))} — ${moodLabel(mood)}`,
    mood, tags: ['profile-icon', style, mood], width: 1080, height: 1080,
    document: profileIconLayout(mood, style), categoryId: 'cat-profile-icons',
  }),
);

// ─── Category 11 — BRAND GUIDELINES (1920×1080 multi-page) ────────────

function brandGuidelinesCover(mood: TemplateMood): BrandOSDocument {
  const m = moodChoices(mood);
  const w = 1920, h = 1080;
  return doc({
    contentType: 'brand-guideline-slide',
    pages: [
      page({
        width: w, height: h, background: '#ffffff', name: 'Cover',
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: h * 0.06, w: w * 0.2, h: h * 0.1 }),
          text({ name: 'Title', x: w * 0.06, y: h * 0.4, w: w * 0.6, h: h * 0.3, text: 'Brand\nGuidelines', fontSize: h * 0.1, fontWeight: m.headlineWeight, color: N_DARK, fontFamily: HEADING_FONT, lineHeight: 1.05 }),
          text({ name: 'Version', x: w * 0.06, y: h * 0.72, w: w * 0.4, h: h * 0.04, text: 'Version 1.0 — 2026', fontSize: h * 0.03, color: N_MID }),
          rect({ name: 'Side band', x: w * 0.65, y: 0, w: w * 0.35, h, fill: m.accentColor, opacity: m.decorOpacity * 1.5 }),
        ],
      }),
      page({
        width: w, height: h, background: m.bodyBg, name: 'Logo usage',
        layers: [
          text({ name: 'Section', x: w * 0.06, y: h * 0.1, w: w * 0.88, h: h * 0.06, text: 'LOGO USAGE', fontSize: h * 0.022, fontWeight: 700, color: m.accentColor, letterSpacing: 0.2 }),
          logo({ name: 'Sample logo', x: w * 0.4, y: h * 0.35, w: w * 0.2, h: h * 0.25 }),
          text({ name: 'Caption', x: w * 0.06, y: h * 0.78, w: w * 0.88, h: h * 0.04, text: 'Maintain clear space equal to the height of the logo on all sides.', fontSize: h * 0.025, color: m.bodyColor, align: 'center' }),
        ],
      }),
    ],
  });
}

const BRAND_GUIDELINES_TEMPLATES: Template[] = (
  ['professional', 'minimal', 'modern', 'elegant', 'bold', 'vintage', 'tech', 'natural'] as TemplateMood[]
).map((mood) =>
  mk({
    slug: `brand-guidelines-${mood}`,
    name: `Brand guidelines — ${moodLabel(mood)}`,
    mood, tags: ['brand-guidelines', mood], width: 1920, height: 1080,
    document: brandGuidelinesCover(mood), categoryId: 'cat-brand-guidelines',
  }),
);

// ─── Compose ──────────────────────────────────────────────────────────

export const SEED_TEMPLATES: Template[] = [
  ...SOCIAL_TEMPLATES,
  ...PRESENTATION_TEMPLATES,
  ...BUSINESS_CARD_TEMPLATES,
  ...INVOICE_TEMPLATES,
  ...LETTERHEAD_TEMPLATES,
  ...BROCHURE_TEMPLATES,
  ...POSTER_TEMPLATES,
  ...BANNER_TEMPLATES,
  ...EMAIL_SIG_TEMPLATES,
  ...PROFILE_ICON_TEMPLATES,
  ...BRAND_GUIDELINES_TEMPLATES,
  ...PROMPT_PRESET_TEMPLATES, // Phase 4.3 — AI prompt presets
];

// ─── Helpers ─────────────────────────────────────────────────────────

function moodLabel(m: TemplateMood): string {
  return m.charAt(0).toUpperCase() + m.slice(1);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
