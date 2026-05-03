// Phase 4.3 — AI prompt presets.
//
// 25 pre-written prompts users can click to seed an AI generation
// flow. Stored as Templates with `source: 'ai_prompt_preset'` and
// `document: null`. Distributed across categories so each category's
// "Generate with AI" picker has relevant suggestions.
//
// Click → prefills the AI prompt input → user submits → Phase 3.5's
// applyCommand path returns a kind:'replace' BrandOSDocument (Mode 1
// zero-state generate, forward-pulled into Phase 4.3).

import type { Template, TemplateMood } from '../types';

interface PresetSpec {
  slug: string;
  name: string;
  prompt: string;
  systemHints?: string;
  categoryId: string;
  mood: TemplateMood;
  width: number;
  height: number;
}

const PRESET_SPECS: PresetSpec[] = [
  // Social posts (square 1080×1080)
  { slug: 'p-social-product-launch', name: 'Product launch announcement', prompt: 'Instagram post announcing a product launch with a bold headline and a clear CTA.', categoryId: 'cat-social-posts', mood: 'bold', width: 1080, height: 1080 },
  { slug: 'p-social-quote', name: 'Inspirational quote post', prompt: 'Quote post for social media — single bold quote, brand colors, attribution at bottom.', categoryId: 'cat-social-posts', mood: 'minimal', width: 1080, height: 1080 },
  { slug: 'p-social-event', name: 'Event invite post', prompt: 'Instagram post inviting followers to an event — date, time, venue prominent.', categoryId: 'cat-social-posts', mood: 'modern', width: 1080, height: 1080 },
  { slug: 'p-social-thanks', name: 'Thank-you post', prompt: 'A warm thank-you post celebrating a customer milestone (e.g. 10K followers).', categoryId: 'cat-social-posts', mood: 'playful', width: 1080, height: 1080 },
  { slug: 'p-social-tips', name: '3 quick tips', prompt: 'Tips post: a 3-bullet list with brand-colored numbered markers.', categoryId: 'cat-social-posts', mood: 'professional', width: 1080, height: 1080 },

  // Presentations (16:9)
  { slug: 'p-pres-pitch', name: '5-slide investor pitch', prompt: '5-slide pitch deck for an investor meeting: cover, problem, solution, traction, ask.', categoryId: 'cat-presentations', mood: 'professional', width: 1920, height: 1080 },
  { slug: 'p-pres-quarterly', name: 'Quarterly business review', prompt: '6-slide QBR deck: cover, KPIs, wins, challenges, plan, ask.', categoryId: 'cat-presentations', mood: 'minimal', width: 1920, height: 1080 },
  { slug: 'p-pres-launch', name: 'Product launch deck', prompt: '4-slide launch deck: hero shot, why now, what\'s new, get started.', categoryId: 'cat-presentations', mood: 'bold', width: 1920, height: 1080 },

  // Business cards
  { slug: 'p-bc-creative', name: 'Creative business card', prompt: 'Business card for a creative professional — bold typography, brand accent stripe.', categoryId: 'cat-business-cards', mood: 'bold', width: 1050, height: 600 },
  { slug: 'p-bc-corporate', name: 'Corporate business card', prompt: 'Conservative business card for a financial advisor — minimal, professional.', categoryId: 'cat-business-cards', mood: 'professional', width: 1050, height: 600 },

  // Invoices
  { slug: 'p-invoice-freelance', name: 'Freelancer invoice', prompt: 'Clean invoice for a freelance designer — itemized rows, total line, brand header.', categoryId: 'cat-invoices', mood: 'minimal', width: 1080, height: 1920 },
  { slug: 'p-invoice-agency', name: 'Agency invoice', prompt: 'Agency invoice with project breakdown and payment terms.', categoryId: 'cat-invoices', mood: 'professional', width: 1080, height: 1920 },

  // Letterheads
  { slug: 'p-letterhead-formal', name: 'Formal correspondence', prompt: 'Formal letterhead for client correspondence — top brand band, bottom contact info.', categoryId: 'cat-letterheads', mood: 'elegant', width: 1240, height: 1754 },
  { slug: 'p-letterhead-thank-you', name: 'Thank-you letter', prompt: 'Letterhead for a thank-you note to a client — warm, modern.', categoryId: 'cat-letterheads', mood: 'natural', width: 1240, height: 1754 },

  // Brochures
  { slug: 'p-brochure-services', name: 'Services brochure', prompt: 'Bi-fold services brochure with 3 service offerings highlighted.', categoryId: 'cat-brochures', mood: 'modern', width: 1650, height: 1275 },

  // Posters
  { slug: 'p-poster-event', name: 'Event poster', prompt: 'A3 event poster with event name, date, time, venue, and a bold visual.', categoryId: 'cat-posters', mood: 'bold', width: 1754, height: 2480 },
  { slug: 'p-poster-promo', name: 'Promotional poster', prompt: 'Promotional poster for a sale — discount %, dates, store info.', categoryId: 'cat-posters', mood: 'playful', width: 1754, height: 2480 },

  // Banners
  { slug: 'p-banner-twitter', name: 'Twitter / X header', prompt: 'Twitter header banner showcasing brand identity — logo, tagline, accent shape.', categoryId: 'cat-banners', mood: 'modern', width: 1500, height: 500 },
  { slug: 'p-banner-linkedin', name: 'LinkedIn cover', prompt: 'LinkedIn personal cover banner — professional, clean, brand-aware.', categoryId: 'cat-banners', mood: 'professional', width: 1584, height: 396 },
  { slug: 'p-banner-facebook', name: 'Facebook cover', prompt: 'Facebook business cover — bold headline, contact info, CTA.', categoryId: 'cat-banners', mood: 'bold', width: 1640, height: 624 },

  // Email signatures
  { slug: 'p-email-sig', name: 'Standard email signature', prompt: 'Email signature with logo, name, title, contact info — clean, scannable.', categoryId: 'cat-email-signatures', mood: 'minimal', width: 600, height: 200 },

  // Profile icons
  { slug: 'p-profile-monogram', name: 'Monogram avatar', prompt: 'Avatar with brand-color background and large initial in heading font.', categoryId: 'cat-profile-icons', mood: 'bold', width: 1080, height: 1080 },
  { slug: 'p-profile-logo', name: 'Logo avatar', prompt: 'Avatar showing the brand logo centered on a brand-color background.', categoryId: 'cat-profile-icons', mood: 'modern', width: 1080, height: 1080 },

  // Brand guidelines
  { slug: 'p-brand-guide-mini', name: 'One-page brand snapshot', prompt: 'Single-page brand guidelines snapshot: logo, colors, typography sample, tagline.', categoryId: 'cat-brand-guidelines', mood: 'minimal', width: 1920, height: 1080 },
  { slug: 'p-brand-guide-full', name: 'Multi-page brand guide', prompt: '6-slide brand guide: cover, logo usage, color system, typography, voice, contact.', categoryId: 'cat-brand-guidelines', mood: 'elegant', width: 1920, height: 1080 },
];

const PLACEHOLDER_PRESET_THUMB =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#6366f1'/><stop offset='1' stop-color='#1a1a2e'/>" +
    "</linearGradient></defs>" +
    "<rect width='100%' height='100%' fill='url(#g)'/>" +
    "<text x='50' y='52' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#ffffff' font-weight='600'>AI</text>" +
    "<text x='50' y='66' text-anchor='middle' font-family='sans-serif' font-size='8' fill='#ffffffcc'>preset</text>" +
    "</svg>",
  );

export const PROMPT_PRESET_TEMPLATES: Template[] = PRESET_SPECS.map((spec) => ({
  id: `tpl-${spec.slug}`,
  slug: spec.slug,
  name: spec.name,
  description: null,
  source: 'ai_prompt_preset',
  categoryId: spec.categoryId,
  document: null, // presets carry a prompt, not a doc
  thumbnailUrl: PLACEHOLDER_PRESET_THUMB,
  previewImageUrl: null,
  width: spec.width,
  height: spec.height,
  tags: ['ai', 'preset', spec.mood, spec.categoryId.replace('cat-', '')],
  mood: spec.mood,
  promptText: spec.prompt,
  promptSystemHints: spec.systemHints ?? null,
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
}));
