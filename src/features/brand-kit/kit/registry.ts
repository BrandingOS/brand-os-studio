/**
 * Deliverable Registry — the single definition of how each Brand Kit
 * deliverable behaves: its template type, aspect ratio, editable
 * content fields, control groups, generation defaults, and export
 * capabilities. Adding a new deliverable = renderer + one entry here;
 * pages and the card editor stay untouched.
 *
 * This module also owns the per-template-type helpers that previously
 * lived as switch statements inside `BrandKitCardEditor`
 * (`getEditorFields`, `getDefaultOverrides`, `aspectFor`) so every
 * consumer resolves type behavior from one place.
 */
import type { ComponentType } from 'react';
import {
  Type,
  AtSign,
  Mail,
  Phone,
  Globe,
  Megaphone,
  MessageSquare,
  Hash,
  FileText,
} from 'lucide-react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { KitSectionKey } from '../components/BrandKitSidebar';
import type { TemplateOverrides } from '../types';
import { deliverableKey, type DeliverableKey } from './types';

export type EditorField = {
  key: keyof TemplateOverrides;
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder?: string;
};

export type ControlGroupId = 'content' | 'colors' | 'logo' | 'typography';

export type CustomControlsProps = {
  brand: MockBrand;
  overrides: TemplateOverrides;
  onChange: (next: Partial<TemplateOverrides>) => void;
};

export type RankContext = {
  /** Stable per-brand seed (brand id) — drives the deterministic
   *  shuffle so different brands see different candidate sets. */
  seed: string;
  brand: MockBrand;
};

export type DeliverableDef = {
  key: DeliverableKey;
  sectionKey: KitSectionKey;
  label: string;
  /** BrandKitTemplate type this deliverable's variants carry. */
  templateType: string;
  /** Width / height the renderers were designed for. */
  aspect: number;
  contentFields: EditorField[];
  controlGroups: ControlGroupId[];
  /** Escape hatch for deliverable-specific controls the schema-driven
   *  panel can't express. Rendered after the schema groups. */
  CustomControls?: ComponentType<CustomControlsProps>;
  /** Candidates produced per generation round. */
  candidateCount: number;
  /** Curated variant ids ranked before everything else. */
  featuredIds?: string[];
  /** Optional ranking override; default is featured-first + seeded shuffle. */
  rank?: (templates: BrandKitTemplate[], ctx: RankContext) => BrandKitTemplate[];
  /** Returns a user-facing blocker (e.g. "Add a logo in Setup first")
   *  or null when generation can proceed. */
  validate?: (brand: MockBrand) => string | null;
  exportFormats: ReadonlyArray<'png'>;
  /**
   * The Design content type this deliverable instantiates as — what
   * `Use Template` / `Edit Template` write into the document and what the
   * shell resolves a renderer from.
   *
   * It must name a config in `editor/content-types` whose `renderer` is
   * `'template-instance'`, or Design opens the handed-off document on
   * Fabric and paints an empty canvas. The Brand Kit's own ids live in
   * `content-types/brandKit.configs.ts`; `invoice` is the one that
   * predates them.
   *
   * Absent is a real answer, not a gap: Brand Guides are drawn from the
   * BRAND rather than from a deliverable's content, so there is nothing
   * for Design's properties panel to edit and no content kind for them in
   * `content/kinds.ts`. Several deliverables deliberately share an id —
   * Profile and Favicon are both a square logo container, Website and
   * Landing Page are both a web hero, the four decks are one presentation.
   */
  contentTypeId?: string;
};

/* ── Per-type helpers (moved from BrandKitCardEditor) ─────────────── */

/** Fields shown in the editor's Content group, by template type. */
export function contentFieldsForType(templateType: string): EditorField[] {
  switch (templateType) {
    case 'business-cards':
      return [
        { key: 'title', label: 'Full Name', icon: Type, placeholder: 'Jane Smith' },
        { key: 'subtitle', label: 'Job Title', icon: AtSign, placeholder: 'Brand Manager' },
        { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'jane@company.com' },
        { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+1 234 56789' },
        { key: 'website', label: 'Website', icon: Globe, placeholder: 'company.com' },
      ];
    case 'facebook-covers':
      return [
        { key: 'headline', label: 'Headline', icon: Megaphone, placeholder: 'Your tagline here' },
        { key: 'body', label: 'Description', icon: MessageSquare, placeholder: 'Supporting text...' },
      ];
    case 'instagram-posts':
      return [
        { key: 'headline', label: 'Post Headline', icon: Megaphone, placeholder: 'Bold statement' },
        { key: 'body', label: 'Post Body', icon: MessageSquare, placeholder: 'Supporting copy...' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Learn More' },
      ];
    case 'instagram-stories':
      return [
        { key: 'headline', label: 'Story Headline', icon: Megaphone, placeholder: 'Your headline' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Swipe Up' },
      ];
    case 'presentations':
    case 'pres-pitch':
    case 'pres-plan':
    case 'pres-portfolio':
    case 'pres-proposal':
    case 'pres-case':
      return [
        { key: 'slideTitle', label: 'Slide Title', icon: FileText, placeholder: 'Presentation Title' },
        { key: 'slideSubtitle', label: 'Subtitle', icon: MessageSquare, placeholder: 'Subtitle or date' },
      ];
    case 'invoices':
      return [
        { key: 'title', label: 'Company Name', icon: Type, placeholder: 'Client Corp' },
        { key: 'subtitle', label: 'Invoice #', icon: Hash, placeholder: 'INV-0042' },
      ];
    case 'brand-guides':
    case 'guide-logo':
    case 'guide-color':
    case 'guide-typography':
    case 'guide-voice':
    case 'guide-imagery':
      return [
        { key: 'slideTitle', label: 'Guide Title', icon: FileText, placeholder: 'Brand Guidelines' },
        { key: 'slideSubtitle', label: 'Version', icon: Hash, placeholder: 'v2.0 — 2025' },
      ];
    case 'profile-icons':
    case 'favicon':
    case 'web-favicon':
    case 'anim-reveal':
    case 'anim-slide':
    case 'anim-fade':
    case 'anim-rotate':
      return [];
    case 'mockups':
    case 'mockup-mug':
    case 'mockup-tshirt':
    case 'mockup-billboard':
    case 'mockup-tote':
    case 'mockup-sticker':
      return [
        { key: 'headline', label: 'Product Label', icon: Type, placeholder: 'Your product' },
      ];
    case 'letterhead':
    case 'envelope':
    case 'notecard':
      return [
        { key: 'title', label: 'Recipient', icon: Type, placeholder: 'Dear ...' },
        { key: 'body', label: 'Body', icon: MessageSquare, placeholder: 'Letter body…' },
      ];
    default:
      if (templateType.startsWith('brand-asset-')) return [];
      return [
        { key: 'headline', label: 'Headline', icon: Type, placeholder: 'Your text here' },
      ];
  }
}

export function defaultOverridesForType(
  templateType: string,
  brand: MockBrand,
): TemplateOverrides {
  const slug = brand.name.toLowerCase().replace(/\s+/g, '-');
  const base: TemplateOverrides = {
    name: brand.name,
    primaryColor: brand.colors.core[0]?.hex,
    secondaryColor: brand.colors.core[1]?.hex ?? brand.colors.accent[0]?.hex,
    showLogo: true,
  };
  switch (templateType) {
    case 'business-cards':
      return {
        ...base,
        title: 'Jane Smith',
        subtitle: 'Brand Manager',
        email: `jane@${slug}.com`,
        phone: '+1 234 56789',
        website: `${slug}.com`,
      };
    case 'invoices':
      return { ...base, title: 'Acme Corp', subtitle: 'INV-0042' };
    case 'instagram-posts':
      return { ...base, headline: 'Bold statement here', body: 'Supporting copy', cta: 'Learn More' };
    case 'instagram-stories':
      return { ...base, headline: 'Your story headline', cta: 'Swipe Up' };
    case 'facebook-covers':
      return { ...base, headline: `${brand.name}`, body: brand.voice?.essay ?? '' };
    default:
      return { ...base, headline: brand.name };
  }
}

/** Native aspect ratio (width / height) the renderer was designed for. */
export function aspectForType(templateType: string): number {
  switch (templateType) {
    case 'instagram-posts':
    case 'profile-icons':
    case 'favicon':
    case 'web-favicon':
    case 'mockup-mug':
    case 'mockup-tote':
    case 'mockup-sticker':
    case 'qr-branded':
    case 'qr-minimal':
    case 'qr-rounded':
    case 'qr-square':
    case 'anim-reveal':
    case 'anim-rotate':
      return 1;
    case 'brand-asset-logo':
    case 'brand-asset-color':
    case 'brand-asset-font':
    case 'brand-asset-icon':
    case 'brand-asset-photo':
    case 'brand-asset-about':
      return 4 / 3;
    case 'instagram-stories':
      return 9 / 16;
    case 'mockup-tshirt':
      return 4 / 5;
    case 'facebook-covers':
      return 820 / 312;
    case 'mockup-billboard':
    case 'website':
    case 'web-website':
    case 'pres-pitch':
    case 'pres-plan':
    case 'pres-portfolio':
    case 'pres-proposal':
    case 'pres-case':
    case 'guide-logo':
    case 'guide-color':
    case 'guide-typography':
    case 'guide-voice':
    case 'guide-imagery':
    case 'landing':
    case 'web-landing-page':
    case 'anim-slide':
    case 'anim-fade':
      return 16 / 9;
    case 'email-sig':
    case 'web-email-signature':
      return 3 / 1;
    case 'letterhead':
    case 'notecard':
      return 1 / 1.414;
    case 'envelope':
      return 2.3;
    default:
      return 1.6;
  }
}

/* ── The registry ─────────────────────────────────────────────────── */

const ALL_GROUPS: ControlGroupId[] = ['content', 'colors', 'logo', 'typography'];

type DefInput = {
  label: string;
  templateType: string;
  controlGroups?: ControlGroupId[];
  featuredIds?: string[];
  candidateCount?: number;
  validate?: DeliverableDef['validate'];
  contentTypeId?: string;
};

function makeDefs(sectionKey: KitSectionKey, inputs: DefInput[]): DeliverableDef[] {
  return inputs.map((input) => {
    const contentFields = contentFieldsForType(input.templateType);
    const groups =
      input.controlGroups ??
      (contentFields.length > 0 ? ALL_GROUPS : ALL_GROUPS.filter((g) => g !== 'content'));
    return {
      key: deliverableKey(sectionKey, input.label),
      sectionKey,
      label: input.label,
      templateType: input.templateType,
      aspect: aspectForType(input.templateType),
      contentFields,
      controlGroups: groups,
      candidateCount: input.candidateCount ?? 3,
      featuredIds: input.featuredIds,
      validate: input.validate,
      exportFormats: ['png'],
      contentTypeId: input.contentTypeId,
    };
  });
}

/** Every generatable deliverable, in kit display order. Brand Assets
 *  (Logos / Colors / …) are core assets, not deliverables — they are
 *  intentionally absent. */
export const DELIVERABLES: DeliverableDef[] = [
  ...makeDefs('stationery', [
    {
      label: 'Business Card',
      templateType: 'business-cards',
      featuredIds: ['business-cards-ext-3', 'business-cards-ext-4', 'business-cards-ext-113'],
      contentTypeId: 'business-card-kit',
    },
    {
      label: 'Letterhead',
      templateType: 'letterhead',
      featuredIds: ['letterhead-ext-6', 'letterhead-ext-69', 'letterhead-ext-73'],
      contentTypeId: 'letterhead-kit',
    },
    {
      label: 'Envelope',
      templateType: 'envelope',
      featuredIds: ['envelope-ext-30', 'envelope-ext-3', 'envelope-ext-127'],
      contentTypeId: 'envelope-kit',
    },
    {
      label: 'Invoice',
      templateType: 'invoices',
      featuredIds: ['invoices-ext-4', 'invoices-ext-3', 'invoices-ext-8'],
      contentTypeId: 'invoice',
    },
  ]),
  ...makeDefs('social', [
    {
      label: 'Profile',
      templateType: 'profile-icons',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'profile-icon-kit',
    },
    { label: 'Cover', templateType: 'facebook-covers', contentTypeId: 'social-cover-kit' },
    { label: 'Post', templateType: 'instagram-posts', contentTypeId: 'social-post-kit' },
    { label: 'Story', templateType: 'instagram-stories', contentTypeId: 'social-story-kit' },
  ]),
  ...makeDefs('web', [
    {
      label: 'Favicon',
      templateType: 'favicon',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'profile-icon-kit',
    },
    { label: 'Website', templateType: 'website', contentTypeId: 'web-page-kit' },
    { label: 'Email Signature', templateType: 'email-sig', contentTypeId: 'email-signature-kit' },
    { label: 'Landing Page', templateType: 'landing', contentTypeId: 'web-page-kit' },
  ]),
  ...makeDefs('brand-guides', [
    { label: 'Logo Guide', templateType: 'guide-logo' },
    { label: 'Color Guide', templateType: 'guide-color' },
    { label: 'Typography Guide', templateType: 'guide-typography' },
    { label: 'Voice Guide', templateType: 'guide-voice' },
    { label: 'Imagery Guide', templateType: 'guide-imagery' },
  ]),
  ...makeDefs('presentations', [
    { label: 'Pitch Deck', templateType: 'pres-pitch', contentTypeId: 'presentation-kit' },
    { label: 'Business Plan', templateType: 'pres-plan', contentTypeId: 'presentation-kit' },
    { label: 'Proposal', templateType: 'pres-proposal', contentTypeId: 'presentation-kit' },
    { label: 'Case Studies', templateType: 'pres-case', contentTypeId: 'presentation-kit' },
  ]),
  ...makeDefs('animations', [
    {
      label: 'Logo Reveal',
      templateType: 'anim-reveal',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'animation-kit',
    },
    {
      label: 'Slide In',
      templateType: 'anim-slide',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'animation-kit',
    },
    {
      label: 'Fade',
      templateType: 'anim-fade',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'animation-kit',
    },
    {
      label: 'Rotate',
      templateType: 'anim-rotate',
      controlGroups: ['colors', 'logo'],
      contentTypeId: 'animation-kit',
    },
  ]),
];

const BY_KEY: ReadonlyMap<DeliverableKey, DeliverableDef> = new Map(
  DELIVERABLES.map((d) => [d.key, d]),
);

export function getDeliverable(
  sectionKey: KitSectionKey,
  label: string,
): DeliverableDef | undefined {
  return BY_KEY.get(deliverableKey(sectionKey, label));
}

export function getDeliverableByKey(key: DeliverableKey): DeliverableDef | undefined {
  return BY_KEY.get(key);
}

export function deliverablesForSection(sectionKey: KitSectionKey): DeliverableDef[] {
  return DELIVERABLES.filter((d) => d.sectionKey === sectionKey);
}

/** True when the given card is a generatable deliverable (vs a core
 *  brand-asset card, which is always visible). */
export function isDeliverableCard(sectionKey: KitSectionKey, label: string): boolean {
  return BY_KEY.has(deliverableKey(sectionKey, label));
}
