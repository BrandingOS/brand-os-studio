import {
  TEMPLATE_LIBRARY,
  ANIMATIONS,
  filterTemplatesByCategory,
} from '@/features/brandkit/data/templates';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { KitSectionKey } from '../components/BrandKitSidebar';
import { BUSINESS_CARDS_EXTENDED } from '../renderers/BusinessCardsExtended';
import { BUSINESS_CARDS_EXTENDED_2 } from '../renderers/BusinessCardsExtended2';
import { MOCKUPS_EXTENDED } from '../renderers/MockupsExtended';
import { LETTERHEAD_EXTENDED } from '../renderers/LetterheadExtended';
import { LETTERHEAD_EXTENDED_2 } from '../renderers/LetterheadExtended2';
import { ENVELOPE_EXTENDED } from '../renderers/EnvelopeExtended';
import { ENVELOPE_EXTENDED_2 } from '../renderers/EnvelopeExtended2';
import { NOTECARD_EXTENDED } from '../renderers/NotecardExtended';
import { NOTECARD_EXTENDED_2 } from '../renderers/NotecardExtended2';
import { INVOICES_EXTENDED } from '../renderers/InvoicesExtended';
import { INVOICES_EXTENDED_2 } from '../renderers/InvoicesExtended2';
import { SOCIAL_PROFILE_EXTENDED } from '../renderers/SocialProfileExtended';
import { SOCIAL_PROFILE_EXTENDED_2 } from '../renderers/SocialProfileExtended2';
import { SOCIAL_COVER_EXTENDED } from '../renderers/SocialCoverExtended';
import { SOCIAL_POST_EXTENDED } from '../renderers/SocialPostExtended';
import { SOCIAL_STORY_EXTENDED } from '../renderers/SocialStoryExtended';
import { WEB_FAVICON_EXTENDED } from '../renderers/WebFaviconExtended';
import { WEB_WEBSITE_EXTENDED } from '../renderers/WebWebsiteExtended';
import { WEB_EMAIL_SIG_EXTENDED } from '../renderers/WebEmailSignatureExtended';
import { WEB_LANDING_EXTENDED } from '../renderers/WebLandingPageExtended';
import { MOCKUP_MUG_EXTENDED } from '../renderers/MockupMugExtended';
import { MOCKUP_TSHIRT_EXTENDED } from '../renderers/MockupTShirtExtended';
import { MOCKUP_BILLBOARD_EXTENDED } from '../renderers/MockupBillboardExtended';
import { MOCKUP_TOTE_EXTENDED } from '../renderers/MockupToteExtended';
import { MOCKUP_STICKER_EXTENDED } from '../renderers/MockupStickerExtended';
import { LOGO_GUIDE_EXTENDED, COLOR_GUIDE_EXTENDED, TYPOGRAPHY_GUIDE_EXTENDED, VOICE_GUIDE_EXTENDED, IMAGERY_GUIDE_EXTENDED } from '../renderers/BrandGuidesExtended';
import { PITCH_DECK_EXTENDED, BUSINESS_PLAN_EXTENDED, PORTFOLIO_EXTENDED, PROPOSAL_EXTENDED, CASE_STUDY_EXTENDED } from '../renderers/PresentationsExtended';
import { LOGO_REVEAL_EXTENDED, SLIDE_IN_EXTENDED, FADE_EXTENDED, ROTATE_EXTENDED } from '../renderers/AnimationsExtended';
import { QR_BRANDED_EXTENDED, QR_MINIMAL_EXTENDED, QR_ROUNDED_EXTENDED, QR_SQUARE_EXTENDED } from '../renderers/QrCodeExtended';

/**
 * Bridge between the cosmos Brand Kit (8 sections × N labelled cards)
 * and the legacy `@/features/brandkit` module library (one moduleId
 * per template family — business-cards, mockups, instagram-posts…).
 *
 * Each cosmos card resolves to a legacy moduleId (and an optional
 * category filter inside that module). The drilldown then shows the
 * real list of templates for that module — same data the legacy
 * `/b/:slug/brandkit/<moduleId>` page renders, just under our shell.
 *
 * Cards with no legacy counterpart (e.g. `web::Favicon`) return
 * `null` from `resolveLegacyCard`; the drilldown falls back to a
 * placeholder in that case so the UI never breaks.
 */
export type LegacyCardSource = {
  /** Legacy moduleId — keys into TEMPLATE_LIBRARY. */
  moduleId: string;
  /** Optional category narrowing for the moduleId's template list. */
  category?: string;
};

const MAP: Record<KitSectionKey, Record<string, LegacyCardSource>> = {
  stationery: {
    'Business Card': { moduleId: 'business-cards' },
    // Letterhead / Envelope / Notecard live in cosmos-only extension
    // renderers — no legacy moduleId. Synthetic moduleIds route
    // through `syntheticTemplates` below.
    'Letterhead': { moduleId: '__letterhead__' },
    'Envelope': { moduleId: '__envelope__' },
    'Notecard': { moduleId: '__notecard__' },
    'Invoice': { moduleId: 'invoices' },
  },
  social: {
    'Profile': { moduleId: 'profile-icons' },
    'Cover': { moduleId: 'facebook-covers' },
    'Post': { moduleId: 'instagram-posts' },
    'Story': { moduleId: 'instagram-stories' },
  },
  web: {
    'Favicon': { moduleId: '__favicon__' },
    'Website': { moduleId: '__website__' },
    'Email Signature': { moduleId: '__email-sig__' },
    'Landing Page': { moduleId: '__landing__' },
  },
  mockups: {
    'Mug': { moduleId: '__mockup-mug__' },
    'T-Shirt': { moduleId: '__mockup-tshirt__' },
    'Billboard': { moduleId: '__mockup-billboard__' },
    'Tote': { moduleId: '__mockup-tote__' },
    'Sticker Sheet': { moduleId: '__mockup-sticker__' },
  },
  'brand-guides': {
    'Logo Guide': { moduleId: '__guide-logo__' },
    'Color Guide': { moduleId: '__guide-color__' },
    'Typography Guide': { moduleId: '__guide-typography__' },
    'Voice Guide': { moduleId: '__guide-voice__' },
    'Imagery Guide': { moduleId: '__guide-imagery__' },
  },
  presentations: {
    'Pitch Deck': { moduleId: '__pres-pitch__' },
    'Business Plan': { moduleId: '__pres-plan__' },
    'Portfolio': { moduleId: '__pres-portfolio__' },
    'Proposal': { moduleId: '__pres-proposal__' },
    'Case Studies': { moduleId: '__pres-case__' },
  },
  animations: {
    'Logo Reveal': { moduleId: '__anim-reveal__' },
    'Slide In': { moduleId: '__anim-slide__' },
    'Fade': { moduleId: '__anim-fade__' },
    'Rotate': { moduleId: '__anim-rotate__' },
  },
  'qr-code': {
    'Branded': { moduleId: '__qr-branded__' },
    'Minimal': { moduleId: '__qr-minimal__' },
    'Rounded': { moduleId: '__qr-rounded__' },
    'Square': { moduleId: '__qr-square__' },
  },
};

/** Returns the legacy data source for a cosmos card, or null if the
 *  card has no real counterpart yet. */
export function resolveLegacyCard(
  sectionKey: KitSectionKey,
  label: string,
): LegacyCardSource | null {
  return MAP[sectionKey]?.[label] ?? null;
}

/** Variants derived from cosmos-only synthetic types — items the
 *  legacy library doesn't ship (letterhead / envelope / notecard /
 *  animations / qr-code). Shaped as BrandKitTemplate so the
 *  drilldown renders them through the same path as a real template;
 *  the cosmos render dispatcher catches these types and routes to
 *  the matching extended renderer. */
function syntheticTemplates(moduleId: string, label: string): BrandKitTemplate[] {
  if (moduleId === '__letterhead__') {
    return [
      ...LETTERHEAD_EXTENDED.map((t) => ({
        id: `letterhead-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'letterhead' as BrandKitTemplate['type'],
        orientation: 'portrait' as const,
        tags: ['letterhead', 'extended', t.category],
      })),
      ...LETTERHEAD_EXTENDED_2.map((t) => ({
        id: `letterhead-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'letterhead' as BrandKitTemplate['type'],
        orientation: 'portrait' as const,
        tags: ['letterhead', 'extended', 'wave2', t.category],
      })),
    ];
  }
  if (moduleId === '__envelope__') {
    return [
      ...ENVELOPE_EXTENDED.map((t) => ({
        id: `envelope-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'envelope' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['envelope', 'extended', t.category],
      })),
      ...ENVELOPE_EXTENDED_2.map((t) => ({
        id: `envelope-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'envelope' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['envelope', 'extended', 'wave2', t.category],
      })),
    ];
  }
  if (moduleId === '__notecard__') {
    return [
      ...NOTECARD_EXTENDED.map((t) => ({
        id: `notecard-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'notecard' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['notecard', 'extended', t.category],
      })),
      ...NOTECARD_EXTENDED_2.map((t) => ({
        id: `notecard-${t.idSuffix}`,
        name: t.name,
        category: t.category,
        type: 'notecard' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['notecard', 'extended', 'wave2', t.category],
      })),
    ];
  }
  if (moduleId === '__favicon__') {
    return WEB_FAVICON_EXTENDED.map((t) => ({
      id: `favicon-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'favicon' as BrandKitTemplate['type'],
      orientation: 'square',
      tags: ['favicon', 'extended', t.category],
    }));
  }
  if (moduleId === '__website__') {
    return WEB_WEBSITE_EXTENDED.map((t) => ({
      id: `website-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'website' as BrandKitTemplate['type'],
      orientation: 'landscape',
      tags: ['website', 'extended', t.category],
    }));
  }
  if (moduleId === '__email-sig__') {
    return WEB_EMAIL_SIG_EXTENDED.map((t) => ({
      id: `email-sig-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'email-sig' as BrandKitTemplate['type'],
      orientation: 'landscape',
      tags: ['email-sig', 'extended', t.category],
    }));
  }
  if (moduleId === '__landing__') {
    return WEB_LANDING_EXTENDED.map((t) => ({
      id: `landing-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'landing' as BrandKitTemplate['type'],
      orientation: 'landscape',
      tags: ['landing', 'extended', t.category],
    }));
  }
  // Mockups (5 distinct artifacts)
  const mockupMap: Record<string, [readonly { idSuffix: string; name: string; category: string }[], string]> = {
    '__mockup-mug__': [MOCKUP_MUG_EXTENDED, 'mockup-mug'],
    '__mockup-tshirt__': [MOCKUP_TSHIRT_EXTENDED, 'mockup-tshirt'],
    '__mockup-billboard__': [MOCKUP_BILLBOARD_EXTENDED, 'mockup-billboard'],
    '__mockup-tote__': [MOCKUP_TOTE_EXTENDED, 'mockup-tote'],
    '__mockup-sticker__': [MOCKUP_STICKER_EXTENDED, 'mockup-sticker'],
  };
  if (mockupMap[moduleId]) {
    const [list, type] = mockupMap[moduleId];
    return list.map((t) => ({ id: `${type}-${t.idSuffix}`, name: t.name, category: t.category, type: type as BrandKitTemplate['type'], orientation: 'landscape', tags: [type, 'extended', t.category] }));
  }
  // Brand Guides (5)
  const guideMap: Record<string, [readonly { idSuffix: string; name: string; category: string }[], string]> = {
    '__guide-logo__': [LOGO_GUIDE_EXTENDED, 'guide-logo'],
    '__guide-color__': [COLOR_GUIDE_EXTENDED, 'guide-color'],
    '__guide-typography__': [TYPOGRAPHY_GUIDE_EXTENDED, 'guide-typography'],
    '__guide-voice__': [VOICE_GUIDE_EXTENDED, 'guide-voice'],
    '__guide-imagery__': [IMAGERY_GUIDE_EXTENDED, 'guide-imagery'],
  };
  if (guideMap[moduleId]) {
    const [list, type] = guideMap[moduleId];
    return list.map((t) => ({ id: `${type}-${t.idSuffix}`, name: t.name, category: t.category, type: type as BrandKitTemplate['type'], orientation: 'portrait', tags: [type, 'extended', t.category] }));
  }
  // Presentations (5)
  const presMap: Record<string, [readonly { idSuffix: string; name: string; category: string }[], string]> = {
    '__pres-pitch__': [PITCH_DECK_EXTENDED, 'pres-pitch'],
    '__pres-plan__': [BUSINESS_PLAN_EXTENDED, 'pres-plan'],
    '__pres-portfolio__': [PORTFOLIO_EXTENDED, 'pres-portfolio'],
    '__pres-proposal__': [PROPOSAL_EXTENDED, 'pres-proposal'],
    '__pres-case__': [CASE_STUDY_EXTENDED, 'pres-case'],
  };
  if (presMap[moduleId]) {
    const [list, type] = presMap[moduleId];
    return list.map((t) => ({ id: `${type}-${t.idSuffix}`, name: t.name, category: t.category, type: type as BrandKitTemplate['type'], orientation: 'landscape', tags: [type, 'extended', t.category] }));
  }
  // Animations (4)
  const animMap: Record<string, [readonly { idSuffix: string; name: string; category: string }[], string]> = {
    '__anim-reveal__': [LOGO_REVEAL_EXTENDED, 'anim-reveal'],
    '__anim-slide__': [SLIDE_IN_EXTENDED, 'anim-slide'],
    '__anim-fade__': [FADE_EXTENDED, 'anim-fade'],
    '__anim-rotate__': [ROTATE_EXTENDED, 'anim-rotate'],
  };
  if (animMap[moduleId]) {
    const [list, type] = animMap[moduleId];
    return list.map((t) => ({ id: `${type}-${t.idSuffix}`, name: t.name, category: t.category, type: type as BrandKitTemplate['type'], orientation: 'square', tags: [type, 'extended', t.category] }));
  }
  // QR Code (4)
  const qrMap: Record<string, [readonly { idSuffix: string; name: string; category: string }[], string]> = {
    '__qr-branded__': [QR_BRANDED_EXTENDED, 'qr-branded'],
    '__qr-minimal__': [QR_MINIMAL_EXTENDED, 'qr-minimal'],
    '__qr-rounded__': [QR_ROUNDED_EXTENDED, 'qr-rounded'],
    '__qr-square__': [QR_SQUARE_EXTENDED, 'qr-square'],
  };
  if (qrMap[moduleId]) {
    const [list, type] = qrMap[moduleId];
    return list.map((t) => ({ id: `${type}-${t.idSuffix}`, name: t.name, category: t.category, type: type as BrandKitTemplate['type'], orientation: 'square', tags: [type, 'extended', t.category] }));
  }
  if (moduleId.startsWith('__animations__')) {
    const filter = moduleId.split(':')[1];
    return ANIMATIONS.filter((a) => a.type === filter).map((a, i) => ({
      id: `animations-${a.id}`,
      name: a.name,
      category: a.type,
      type: 'animations' as BrandKitTemplate['type'],
      orientation: 'square',
      tags: ['animation', a.type],
    }));
  }
  if (moduleId === '__qr-code__') {
    const variants = ['Standard', 'Rounded Dots', 'High Contrast', 'Brand Color', 'Mono', 'Bold Eyes', 'Soft Edges', 'Compact'];
    return variants.map((name, i) => ({
      id: `qr-code-${i + 1}`,
      name: `${label} ${name}`,
      category: label,
      type: 'qr-code' as BrandKitTemplate['type'],
      orientation: 'square',
      tags: ['qr-code', label],
    }));
  }
  return [];
}

/** Cosmos-side template extensions, added without touching the
 *  legacy templates.ts. Keyed by moduleId so the lookup matches
 *  the same shape as TEMPLATE_LIBRARY. */
const EXTENDED_TEMPLATES: Record<string, BrandKitTemplate[]> = {
  'business-cards': [
    ...BUSINESS_CARDS_EXTENDED.map((t) => ({
      id: `business-cards-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'business-cards' as BrandKitTemplate['type'],
      orientation: 'landscape' as const,
      tags: ['business-cards', 'extended', t.category],
    })),
    ...BUSINESS_CARDS_EXTENDED_2.map((t) => ({
      id: `business-cards-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'business-cards' as BrandKitTemplate['type'],
      orientation: 'landscape' as const,
      tags: ['business-cards', 'extended', 'wave2', t.category],
    })),
  ],
  mockups: MOCKUPS_EXTENDED.map((t) => ({
    id: `mockups-${t.idSuffix}`,
    name: t.name,
    category: t.category,
    type: 'mockups' as BrandKitTemplate['type'],
    orientation: 'landscape',
    tags: ['mockups', 'extended', t.category],
  })),
  invoices: [
    ...INVOICES_EXTENDED.map((t) => ({
      id: `invoices-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'invoices' as BrandKitTemplate['type'],
      orientation: 'portrait' as const,
      tags: ['invoices', 'extended', t.category],
    })),
    ...INVOICES_EXTENDED_2.map((t) => ({
      id: `invoices-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'invoices' as BrandKitTemplate['type'],
      orientation: 'portrait' as const,
      tags: ['invoices', 'extended', 'wave2', t.category],
    })),
  ],
  'profile-icons': [
    ...SOCIAL_PROFILE_EXTENDED.map((t) => ({
      id: `profile-icons-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'profile-icons' as BrandKitTemplate['type'],
      orientation: 'square' as const,
      tags: ['profile-icons', 'extended', t.category],
    })),
    ...SOCIAL_PROFILE_EXTENDED_2.map((t) => ({
      id: `profile-icons-${t.idSuffix}`,
      name: t.name,
      category: t.category,
      type: 'profile-icons' as BrandKitTemplate['type'],
      orientation: 'square' as const,
      tags: ['profile-icons', 'extended', 'wave2', t.category],
    })),
  ],
  'facebook-covers': SOCIAL_COVER_EXTENDED.map((t) => ({
    id: `facebook-covers-${t.idSuffix}`,
    name: t.name,
    category: t.category,
    type: 'facebook-covers' as BrandKitTemplate['type'],
    orientation: 'landscape',
    tags: ['facebook-covers', 'extended', t.category],
  })),
  'instagram-posts': SOCIAL_POST_EXTENDED.map((t) => ({
    id: `instagram-posts-${t.idSuffix}`,
    name: t.name,
    category: t.category,
    type: 'instagram-posts' as BrandKitTemplate['type'],
    orientation: 'square',
    tags: ['instagram-posts', 'extended', t.category],
  })),
  'instagram-stories': SOCIAL_STORY_EXTENDED.map((t) => ({
    id: `instagram-stories-${t.idSuffix}`,
    name: t.name,
    category: t.category,
    type: 'instagram-stories' as BrandKitTemplate['type'],
    orientation: 'portrait',
    tags: ['instagram-stories', 'extended', t.category],
  })),
};

/** All template variants for a card — drives the drilldown grid.
 *  Concatenates the legacy template list with cosmos-side
 *  extensions so the drilldown shows both. The cosmos renderer
 *  routes templates by id suffix to the right path. */
export function variantsForCard(
  sectionKey: KitSectionKey,
  label: string,
): BrandKitTemplate[] {
  const src = resolveLegacyCard(sectionKey, label);
  if (!src) return [];
  if (src.moduleId.startsWith('__')) {
    return syntheticTemplates(src.moduleId, label);
  }
  const legacy = TEMPLATE_LIBRARY[src.moduleId] ?? [];
  const filtered = src.category ? filterTemplatesByCategory(legacy, src.category) : legacy;
  const extensions = EXTENDED_TEMPLATES[src.moduleId] ?? [];
  // Only show extensions when no category narrowing is in effect —
  // an extension's category may not match the card's filter, and
  // we'd rather show too few than show off-category designs.
  return src.category ? filtered : [...filtered, ...extensions];
}
