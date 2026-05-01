// Template seed functions — produce a fresh `BrandOSDocument` for
// each brandkit template family the user can pick from the gallery.
//
// Step 9 commit 2 of 5. Replaces `getTemplateContent()` from the
// legacy `src/features/brandkit/components/editor/CanvasEditor.tsx`.
// The legacy switch hardcoded literal hex colors and font strings
// from `brand.primaryColor` / `brand.fonts?.primary`. The seeds
// here emit the SAME visual layouts but with brand-bound SlotRefs
// (`brand.color.primary`, `brand.font.heading`, etc.) so the unified
// editor's Brand Engine resolves and re-applies them on brand
// switch / Re-apply / cross-page propagation. That's the entire
// point of the migration — without slot binding, the gallery would
// just be 9 hardcoded designs that ignore the brand.
//
// Scope notes:
//   • Mockups are intentionally absent — see vision doc Phase 3.5
//     absorption note + Step 9 audit. Mockup studio is its own
//     feature, deferred to a post-Phase-5 phase.
//   • Each seed targets the brandkit family's "canonical" preset
//     dimensions. Users can resize / pick another preset from the
//     editor once it's open.
//   • Every seed binds copy text and decorative shape fills through
//     SlotRefs where it makes sense. Dummy copy (placeholder name,
//     phone, etc.) stays as literal strings — the user's intent is
//     to overwrite those, not have them brand-bound.

import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
  type Layer,
  type LogoLayer,
  type Page,
  type ResolvedValue,
  type ShapeLayer,
  type SlotRef,
  type TextLayer,
} from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

// ─── Slot-ref shorthands ───────────────────────────────────────────────

const PRIMARY: SlotRef = { type: 'brand.color.primary' };
const SECONDARY: SlotRef = { type: 'brand.color.secondary' };
const HEADING_FONT: SlotRef = { type: 'brand.font.heading' };
const BODY_FONT: SlotRef = { type: 'brand.font.body' };
// Light & dark neutrals for legible text on brand vs white surfaces.
const NEUTRAL_LIGHT: SlotRef = { type: 'brand.color.neutral', neutralIndex: 0 };
const NEUTRAL_DARK: SlotRef = { type: 'brand.color.neutral', neutralIndex: 5 };

// ─── Layer constructors ────────────────────────────────────────────────

interface LayerBaseOpts {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

function baseFields(opts: LayerBaseOpts) {
  return {
    id: crypto.randomUUID(),
    name: opts.name,
    transform: {
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
      rotation: opts.rotation ?? 0,
      scaleX: 1,
      scaleY: 1,
    },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  };
}

function text(
  opts: LayerBaseOpts & {
    text: string;
    fontSize: number;
    fontWeight?: number;
    color: ResolvedValue;
    fontFamily?: ResolvedValue;
    align?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: number;
    letterSpacing?: number;
  },
): TextLayer {
  return {
    ...baseFields(opts),
    kind: 'text',
    text: opts.text,
    fontFamily: opts.fontFamily ?? BODY_FONT,
    fontSize: opts.fontSize,
    fontWeight: opts.fontWeight ?? 400,
    lineHeight: opts.lineHeight ?? 1.2,
    letterSpacing: opts.letterSpacing ?? 0,
    textAlign: opts.align ?? 'left',
    direction: 'auto',
    color: opts.color,
  };
}

function rect(
  opts: LayerBaseOpts & {
    fill: ResolvedValue | null;
    cornerRadius?: number;
    opacity?: number;
  },
): ShapeLayer {
  return {
    ...baseFields(opts),
    opacity: opts.opacity ?? 1,
    kind: 'shape',
    shape: 'rectangle',
    fill: opts.fill,
    stroke: null,
    strokeWidth: 0,
    cornerRadius: opts.cornerRadius ?? 0,
  };
}

function ellipse(
  opts: LayerBaseOpts & { fill: ResolvedValue | null; opacity?: number },
): ShapeLayer {
  return {
    ...baseFields(opts),
    opacity: opts.opacity ?? 1,
    kind: 'shape',
    shape: 'ellipse',
    fill: opts.fill,
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

function logo(
  opts: LayerBaseOpts & {
    variant?: LogoLayer['variant'];
  },
): LogoLayer {
  return {
    ...baseFields(opts),
    kind: 'logo',
    // 'auto' routes through pickLogoOnBackground at render time —
    // picks the most readable variant against the layer's
    // effective background (brand-aware).
    variant: opts.variant ?? 'auto',
  };
}

// ─── Page + document helpers ───────────────────────────────────────────

function makePage(args: {
  width: number;
  height: number;
  background: ResolvedValue;
  layers: Layer[];
  name?: string;
}): Page {
  return {
    id: crypto.randomUUID(),
    name: args.name ?? 'Page 1',
    width: args.width,
    height: args.height,
    background: args.background,
    masterPageId: null,
    layers: args.layers,
  };
}

function makeDocument(args: {
  contentType: string;
  brand: Brand;
  pages: Page[];
}): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType: args.contentType,
    brandId: args.brand.id,
    masterPages: [],
    pages: args.pages,
    metadata: {},
  };
}

// ─── Per-family seeds ──────────────────────────────────────────────────

// Family 1: business-cards → 'business-card'. Print-safe 1050×600.
export function seedBusinessCardTemplate(brand: Brand): BrandOSDocument {
  const w = 1050;
  const h = 600;
  const domain = `${brand.name.toLowerCase().replace(/\s+/g, '')}.com`;
  return makeDocument({
    contentType: 'business-card',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: '#ffffff',
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: h * 0.08, width: w * 0.25, height: h * 0.25 }),
          text({
            name: 'Name', x: w * 0.06, y: h * 0.45, width: w * 0.88, height: h * 0.1,
            text: 'Jane Smith', fontSize: h * 0.08, fontWeight: 600,
            color: NEUTRAL_DARK, fontFamily: HEADING_FONT,
          }),
          text({
            name: 'Title', x: w * 0.06, y: h * 0.56, width: w * 0.88, height: h * 0.06,
            text: 'Brand Manager', fontSize: h * 0.05, color: PRIMARY,
          }),
          text({
            name: 'Phone', x: w * 0.06, y: h * 0.66, width: w * 0.88, height: h * 0.05,
            text: '+1 234 56789', fontSize: h * 0.04, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Email', x: w * 0.06, y: h * 0.73, width: w * 0.88, height: h * 0.05,
            text: `jane@${domain}`, fontSize: h * 0.04, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Website', x: w * 0.06, y: h * 0.80, width: w * 0.88, height: h * 0.05,
            text: domain, fontSize: h * 0.04, color: NEUTRAL_DARK,
          }),
          rect({
            name: 'Accent bar', x: 0, y: h * 0.92, width: w, height: h * 0.08, fill: PRIMARY,
          }),
        ],
      }),
    ],
  });
}

// Family 2: facebook-covers → 'banner' content type w/ FB-cover preset.
export function seedFacebookCoverTemplate(brand: Brand): BrandOSDocument {
  const w = 1640;
  const h = 624;
  const domain = `${brand.name.toLowerCase().replace(/\s+/g, '')}.com`;
  return makeDocument({
    contentType: 'banner',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: PRIMARY,
        layers: [
          logo({ name: 'Logo', x: w * 0.05, y: h * 0.15, width: w * 0.2, height: h * 0.3 }),
          text({
            name: 'Headline', x: w * 0.05, y: h * 0.5, width: w * 0.55, height: h * 0.25,
            text: `${brand.name} — Built on a real brand system`,
            fontSize: h * 0.1, fontWeight: 700,
            color: NEUTRAL_LIGHT, fontFamily: HEADING_FONT,
          }),
          text({
            name: 'URL', x: w * 0.05, y: h * 0.82, width: w * 0.4, height: h * 0.08,
            text: domain, fontSize: h * 0.05, color: NEUTRAL_LIGHT, opacity: 0.6,
          } as never),
          ellipse({
            name: 'Accent circle', x: w * 0.7, y: h * 0.05, width: h * 0.5, height: h * 0.5,
            fill: SECONDARY, opacity: 0.15,
          }),
        ],
      }),
    ],
  });
}

// Family 3: instagram-posts → 'social-post' content type, square preset.
export function seedInstagramPostTemplate(brand: Brand): BrandOSDocument {
  const w = 1080;
  const h = 1080;
  const domain = `${brand.name.toLowerCase().replace(/\s+/g, '')}.com`;
  return makeDocument({
    contentType: 'social-post',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: PRIMARY,
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: w * 0.06, width: w * 0.18, height: w * 0.1 }),
          text({
            name: 'Quote', x: w * 0.06, y: w * 0.35, width: w * 0.88, height: w * 0.25,
            text: '"The future belongs to those who build with clarity."',
            fontSize: w * 0.055, fontWeight: 600,
            color: NEUTRAL_LIGHT, fontFamily: HEADING_FONT,
          }),
          rect({
            name: 'Divider', x: w * 0.06, y: w * 0.65, width: w * 0.15, height: 4,
            fill: SECONDARY,
          }),
          text({
            name: 'URL', x: w * 0.06, y: w * 0.72, width: w * 0.5, height: w * 0.04,
            text: domain, fontSize: w * 0.03, color: NEUTRAL_LIGHT,
          }),
        ],
      }),
    ],
  });
}

// Family 4: instagram-stories → 'social-post' content type, Story 9:16.
export function seedInstagramStoryTemplate(brand: Brand): BrandOSDocument {
  const w = 1080;
  const h = 1920;
  const domain = `${brand.name.toLowerCase().replace(/\s+/g, '')}.com`;
  return makeDocument({
    contentType: 'social-post',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: PRIMARY,
        layers: [
          logo({ name: 'Logo', x: w * 0.08, y: h * 0.05, width: w * 0.25, height: h * 0.05 }),
          text({
            name: 'Headline', x: w * 0.08, y: h * 0.35, width: w * 0.84, height: h * 0.2,
            text: 'Your money.\nYour rules.\nYour clarity.',
            fontSize: h * 0.045, fontWeight: 700, lineHeight: 1.1,
            color: NEUTRAL_LIGHT, fontFamily: HEADING_FONT,
          }),
          rect({
            name: 'CTA bg', x: w * 0.08, y: h * 0.62, width: w * 0.3, height: h * 0.05,
            fill: SECONDARY, cornerRadius: 8,
          }),
          text({
            name: 'CTA', x: w * 0.08, y: h * 0.625, width: w * 0.3, height: h * 0.04,
            text: 'Get Started', fontSize: h * 0.022, fontWeight: 600,
            color: NEUTRAL_LIGHT, align: 'center',
          }),
          text({
            name: 'URL', x: w * 0.08, y: h * 0.92, width: w * 0.4, height: h * 0.02,
            text: domain, fontSize: h * 0.018, color: NEUTRAL_LIGHT,
          }),
        ],
      }),
    ],
  });
}

// Family 5: presentations → 'presentation' content type, single slide seeded.
export function seedPresentationTemplate(brand: Brand): BrandOSDocument {
  const w = 1920;
  const h = 1080;
  return makeDocument({
    contentType: 'presentation',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: NEUTRAL_DARK,
        name: 'Cover',
        layers: [
          logo({ name: 'Logo', x: w * 0.05, y: h * 0.06, width: w * 0.12, height: h * 0.08 }),
          text({
            name: 'Title', x: w * 0.05, y: h * 0.35, width: w * 0.6, height: h * 0.3,
            text: 'Quarterly\nBusiness Review',
            fontSize: h * 0.09, fontWeight: 700, lineHeight: 1.05,
            color: NEUTRAL_LIGHT, fontFamily: HEADING_FONT,
          }),
          text({
            name: 'Subtitle', x: w * 0.05, y: h * 0.7, width: w * 0.4, height: h * 0.05,
            text: 'Q1 2026 — Confidential', fontSize: h * 0.035,
            color: NEUTRAL_LIGHT, opacity: 0.6,
          } as never),
          rect({
            name: 'Accent line', x: w * 0.05, y: h * 0.85, width: w * 0.12, height: 4,
            fill: SECONDARY,
          }),
        ],
      }),
    ],
  });
}

// Family 6: invoices → 'invoice' content type (new in Step 9.3 commit 1).
export function seedInvoiceTemplate(brand: Brand): BrandOSDocument {
  const w = 1080;
  const h = 1920;
  return makeDocument({
    contentType: 'invoice',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: '#ffffff',
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: h * 0.04, width: w * 0.25, height: h * 0.05 }),
          text({
            name: 'Label', x: w * 0.65, y: h * 0.04, width: w * 0.29, height: h * 0.04,
            text: 'INVOICE', fontSize: h * 0.03, fontWeight: 700,
            color: PRIMARY, fontFamily: HEADING_FONT, align: 'right',
          }),
          text({
            name: 'Bill to label', x: w * 0.06, y: h * 0.14, width: w * 0.4, height: h * 0.02,
            text: 'Bill To:', fontSize: h * 0.015, fontWeight: 600, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Client', x: w * 0.06, y: h * 0.17, width: w * 0.4, height: h * 0.025,
            text: 'Acme Corporation', fontSize: h * 0.018, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Invoice number', x: w * 0.65, y: h * 0.14, width: w * 0.29, height: h * 0.02,
            text: '#INV-0042', fontSize: h * 0.015, fontWeight: 600,
            color: NEUTRAL_DARK, align: 'right',
          }),
          text({
            name: 'Date', x: w * 0.65, y: h * 0.17, width: w * 0.29, height: h * 0.02,
            text: 'May 1, 2026', fontSize: h * 0.013, color: NEUTRAL_DARK, align: 'right',
          }),
          rect({
            name: 'Divider top', x: w * 0.06, y: h * 0.24, width: w * 0.88, height: 1,
            fill: NEUTRAL_DARK, opacity: 0.15,
          }),
          text({
            name: 'Item 1', x: w * 0.06, y: h * 0.27, width: w * 0.5, height: h * 0.02,
            text: 'Strategy Consultation', fontSize: h * 0.014, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Price 1', x: w * 0.65, y: h * 0.27, width: w * 0.29, height: h * 0.02,
            text: '$2,400.00', fontSize: h * 0.014, fontWeight: 500,
            color: NEUTRAL_DARK, align: 'right',
          }),
          text({
            name: 'Item 2', x: w * 0.06, y: h * 0.30, width: w * 0.5, height: h * 0.02,
            text: 'Brand Identity Package', fontSize: h * 0.014, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Price 2', x: w * 0.65, y: h * 0.30, width: w * 0.29, height: h * 0.02,
            text: '$4,800.00', fontSize: h * 0.014, fontWeight: 500,
            color: NEUTRAL_DARK, align: 'right',
          }),
          rect({
            name: 'Divider bottom', x: w * 0.06, y: h * 0.35, width: w * 0.88, height: 1,
            fill: NEUTRAL_DARK, opacity: 0.15,
          }),
          text({
            name: 'Total label', x: w * 0.5, y: h * 0.38, width: w * 0.15, height: h * 0.025,
            text: 'Total', fontSize: h * 0.018, fontWeight: 700, color: NEUTRAL_DARK,
          }),
          text({
            name: 'Total', x: w * 0.65, y: h * 0.38, width: w * 0.29, height: h * 0.025,
            text: '$7,200.00', fontSize: h * 0.018, fontWeight: 700,
            color: NEUTRAL_DARK, align: 'right',
          }),
        ],
      }),
    ],
  });
}

// Family 7: brand-guides → 'brand-guideline-slide' content type (multi-page).
export function seedBrandGuidesTemplate(brand: Brand): BrandOSDocument {
  const w = 1920;
  const h = 1080;
  return makeDocument({
    contentType: 'brand-guideline-slide',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: '#ffffff',
        name: 'Cover',
        layers: [
          logo({ name: 'Logo', x: w * 0.06, y: h * 0.06, width: w * 0.2, height: h * 0.1 }),
          text({
            name: 'Title', x: w * 0.06, y: h * 0.4, width: w * 0.6, height: h * 0.3,
            text: 'Brand\nGuidelines',
            fontSize: h * 0.1, fontWeight: 700, lineHeight: 1.05,
            color: NEUTRAL_DARK, fontFamily: HEADING_FONT,
          }),
          text({
            name: 'Version', x: w * 0.06, y: h * 0.72, width: w * 0.4, height: h * 0.04,
            text: 'Version 2.0 — 2026', fontSize: h * 0.03,
            color: NEUTRAL_DARK, opacity: 0.5,
          } as never),
          rect({
            name: 'Accent bg far', x: w * 0.65, y: h * 0.7, width: w * 0.35, height: h * 0.3,
            fill: PRIMARY, opacity: 0.07,
          }),
          rect({
            name: 'Accent bg near', x: w * 0.72, y: h * 0.78, width: w * 0.28, height: h * 0.22,
            fill: PRIMARY, opacity: 0.13,
          }),
        ],
      }),
    ],
  });
}

// Family 8: profile-icons → 'profile-icon' content type (new in Step 9.3 commit 1).
export function seedProfileIconTemplate(brand: Brand): BrandOSDocument {
  const w = 1080;
  const h = 1080;
  return makeDocument({
    contentType: 'profile-icon',
    brand,
    pages: [
      makePage({
        width: w,
        height: h,
        background: PRIMARY,
        layers: [
          logo({ name: 'Logo', x: w * 0.2, y: h * 0.2, width: w * 0.6, height: h * 0.6 }),
        ],
      }),
    ],
  });
}

// ─── Family → seed dispatcher ──────────────────────────────────────────

/**
 * Brandkit family ids → seed function. Drives `TemplateGallery` —
 * clicking a card resolves to the family's seed, persists it through
 * the designs service, and navigates to the unified editor.
 *
 * The set of keys must match `Object.keys(TEMPLATE_LIBRARY)` from
 * `src/features/brandkit/data/templates.ts`, MINUS `mockups` (which
 * is dropped per Step 9.3a — see vision doc Phase 3.5 absorption note).
 */
export const TEMPLATE_SEEDS: Record<string, (brand: Brand) => BrandOSDocument> = {
  'business-cards': seedBusinessCardTemplate,
  'facebook-covers': seedFacebookCoverTemplate,
  'instagram-posts': seedInstagramPostTemplate,
  'instagram-stories': seedInstagramStoryTemplate,
  'presentations': seedPresentationTemplate,
  'invoices': seedInvoiceTemplate,
  'brand-guides': seedBrandGuidesTemplate,
  'profile-icons': seedProfileIconTemplate,
};

/**
 * Look up a seed by brandkit family id. Throws on unknown family
 * (including `mockups`, intentionally unsupported).
 */
export function getTemplateSeed(
  familyId: string,
): (brand: Brand) => BrandOSDocument {
  const seed = TEMPLATE_SEEDS[familyId];
  if (!seed) {
    throw new Error(
      `Unknown brandkit template family: ${familyId}. ` +
        `Registered: ${Object.keys(TEMPLATE_SEEDS).join(', ')}. ` +
        `(Mockups intentionally absent — see vision doc Phase 3.5.)`,
    );
  }
  return seed;
}

/**
 * Validate a seeded document against `BrandOSDocumentSchema`. Used
 * by the unit tests + as a runtime guard inside the route handler.
 */
export function validateSeed(doc: BrandOSDocument): BrandOSDocument {
  return BrandOSDocumentSchema.parse(doc);
}
