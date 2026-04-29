import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BusinessCardContent } from '../types';
import { renderTemplateDesign as renderLegacyTemplate } from '@/features/brandkit/components/TemplateCard';
import {
  BrandAssetLogoRenderer,
  BrandAssetColorRenderer,
  BrandAssetFontRenderer,
  BrandAssetIconRenderer,
  BrandAssetPhotoRenderer,
  BrandAssetAboutRenderer,
} from './BrandAssetsRenderers';
import { BusinessCardExtendedRenderer } from './BusinessCardsExtended';
import { BusinessCardExtended2Renderer } from './BusinessCardsExtended2';
import { MockupsExtendedRenderer } from './MockupsExtended';
import { LetterheadExtendedRenderer } from './LetterheadExtended';
import { LetterheadExtended2Renderer } from './LetterheadExtended2';
import { EnvelopeExtendedRenderer } from './EnvelopeExtended';
import { EnvelopeExtended2Renderer } from './EnvelopeExtended2';
import { NotecardExtendedRenderer } from './NotecardExtended';
import { NotecardExtended2Renderer } from './NotecardExtended2';
import { InvoicesExtendedRenderer } from './InvoicesExtended';
import { InvoicesExtended2Renderer } from './InvoicesExtended2';
import { SocialProfileExtendedRenderer } from './SocialProfileExtended';
import { SocialProfileExtended2Renderer } from './SocialProfileExtended2';
import { SocialCoverExtendedRenderer } from './SocialCoverExtended';
import { SocialPostExtendedRenderer } from './SocialPostExtended';
import { SocialStoryExtendedRenderer } from './SocialStoryExtended';
import { WebFaviconExtendedRenderer } from './WebFaviconExtended';
import { WebWebsiteExtendedRenderer } from './WebWebsiteExtended';
import { WebEmailSignatureExtendedRenderer } from './WebEmailSignatureExtended';
import { WebLandingPageExtendedRenderer } from './WebLandingPageExtended';
import { MockupMugExtendedRenderer } from './MockupMugExtended';
import { MockupTShirtExtendedRenderer } from './MockupTShirtExtended';
import { MockupBillboardExtendedRenderer } from './MockupBillboardExtended';
import { MockupToteExtendedRenderer } from './MockupToteExtended';
import { MockupStickerExtendedRenderer } from './MockupStickerExtended';
import { LogoGuideRenderer, ColorGuideRenderer, TypographyGuideRenderer, VoiceGuideRenderer, ImageryGuideRenderer } from './BrandGuidesExtended';
import { PitchDeckRenderer, BusinessPlanRenderer, PortfolioRenderer, ProposalRenderer, CaseStudyRenderer } from './PresentationsExtended';
import { LogoRevealRenderer, SlideInRenderer, FadeRenderer, RotateRenderer } from './AnimationsExtended';
import { BrandedQrRenderer, MinimalQrRenderer, RoundedQrRenderer, SquareQrRenderer } from './QrCodeExtended';

/**
 * Cosmos-side wrapper around the legacy `renderTemplateDesign`.
 *
 * Templates whose id starts with `<type>-ext-` are extensions added
 * inside `/brand-kit-v2-cosmos/` — they route to a local renderer
 * here. Anything else delegates to the legacy renderer untouched, so
 * the brandkit pages keep behaving exactly as before.
 *
 * The id-suffix → templateIndex mapping mirrors the
 * `business-cards-ext-N` → designs[N-1] convention used by the
 * legacy renderer (which extracts the trailing number from the id).
 *
 * Live editor overrides are NOT applied here — they're stitched in
 * at the DOM level by `<LivePreviewFrame>` in BrandKitCardEditor,
 * because each renderer's hardcoded text lives inside a component
 * body that React only realises into DOM at render time.
 */
export function renderCosmosTemplate(
  template: BrandKitTemplate,
  brand: Brand,
  mockBrand?: MockBrand,
  /** Optional prop-driven content per template type. Currently
   *  consumed only by the business-card renderers — replaces the
   *  fragile DOM-walker text substitution path. */
  content?: { businessCard?: Partial<BusinessCardContent> },
) {
  const extMatch = template.id.match(/-ext-(\d+)$/);
  if (extMatch) {
    const idx = parseInt(extMatch[1], 10) - 1;
    // Brand-asset templates need MockBrand (the Setup-shaped data
    // source). When mockBrand is missing the tile renders empty —
    // brand-scoped pages always pass it, so this only happens in
    // standalone previews.
    if (mockBrand) {
      switch (template.type) {
        case 'brand-asset-logo' as BrandKitTemplate['type']:
          return <BrandAssetLogoRenderer brand={mockBrand} templateIndex={idx} />;
        case 'brand-asset-color' as BrandKitTemplate['type']:
          return <BrandAssetColorRenderer brand={mockBrand} templateIndex={idx} />;
        case 'brand-asset-font' as BrandKitTemplate['type']:
          return <BrandAssetFontRenderer brand={mockBrand} templateIndex={idx} />;
        case 'brand-asset-icon' as BrandKitTemplate['type']:
          return <BrandAssetIconRenderer brand={mockBrand} templateIndex={idx} />;
        case 'brand-asset-photo' as BrandKitTemplate['type']:
          return <BrandAssetPhotoRenderer brand={mockBrand} templateIndex={idx} />;
        case 'brand-asset-about' as BrandKitTemplate['type']:
          return <BrandAssetAboutRenderer brand={mockBrand} templateIndex={idx} />;
      }
    }
    switch (template.type) {
      case 'business-cards':
        // Wave 1: ext-1..18 → BusinessCardExtendedRenderer (idx 0-17)
        // Wave 2: ext-19..118 → BusinessCardExtended2Renderer (idx 0-99)
        if (idx >= 18) {
          return (
            <BusinessCardExtended2Renderer
              brand={brand}
              templateIndex={idx - 18}
              content={content?.businessCard}
            />
          );
        }
        return (
          <BusinessCardExtendedRenderer
            brand={brand}
            templateIndex={idx}
            content={content?.businessCard}
          />
        );
      case 'mockups':
        return <MockupsExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'invoices':
        // Wave 1 (legacy 8 + 22 ext = 30 idx 0-21 in ext)
        // Wave 2 (idx 22+ → InvoicesExtended2 idx 0-99)
        if (idx >= 22) {
          return <InvoicesExtended2Renderer brand={brand} templateIndex={idx - 22} />;
        }
        return <InvoicesExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'profile-icons':
        // Wave 1: 12 legacy + 18 ext = 30 total. ext-1..18 → idx 0-17
        // Wave 2: ext-19..118 → idx 0-99 in Extended2
        if (idx >= 18) {
          return <SocialProfileExtended2Renderer brand={brand} templateIndex={idx - 18} />;
        }
        return <SocialProfileExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'facebook-covers':
        return <SocialCoverExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'instagram-posts':
        return <SocialPostExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'instagram-stories':
        return <SocialStoryExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'favicon' as BrandKitTemplate['type']:
        return <WebFaviconExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'website' as BrandKitTemplate['type']:
        return <WebWebsiteExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'email-sig' as BrandKitTemplate['type']:
        return <WebEmailSignatureExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'landing' as BrandKitTemplate['type']:
        return <WebLandingPageExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'mockup-mug' as BrandKitTemplate['type']:
        return <MockupMugExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'mockup-tshirt' as BrandKitTemplate['type']:
        return <MockupTShirtExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'mockup-billboard' as BrandKitTemplate['type']:
        return <MockupBillboardExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'mockup-tote' as BrandKitTemplate['type']:
        return <MockupToteExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'mockup-sticker' as BrandKitTemplate['type']:
        return <MockupStickerExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'guide-logo' as BrandKitTemplate['type']:
        return <LogoGuideRenderer brand={brand} templateIndex={idx} />;
      case 'guide-color' as BrandKitTemplate['type']:
        return <ColorGuideRenderer brand={brand} templateIndex={idx} />;
      case 'guide-typography' as BrandKitTemplate['type']:
        return <TypographyGuideRenderer brand={brand} templateIndex={idx} />;
      case 'guide-voice' as BrandKitTemplate['type']:
        return <VoiceGuideRenderer brand={brand} templateIndex={idx} />;
      case 'guide-imagery' as BrandKitTemplate['type']:
        return <ImageryGuideRenderer brand={brand} templateIndex={idx} />;
      case 'pres-pitch' as BrandKitTemplate['type']:
        return <PitchDeckRenderer brand={brand} templateIndex={idx} />;
      case 'pres-plan' as BrandKitTemplate['type']:
        return <BusinessPlanRenderer brand={brand} templateIndex={idx} />;
      case 'pres-portfolio' as BrandKitTemplate['type']:
        return <PortfolioRenderer brand={brand} templateIndex={idx} />;
      case 'pres-proposal' as BrandKitTemplate['type']:
        return <ProposalRenderer brand={brand} templateIndex={idx} />;
      case 'pres-case' as BrandKitTemplate['type']:
        return <CaseStudyRenderer brand={brand} templateIndex={idx} />;
      case 'anim-reveal' as BrandKitTemplate['type']:
        return <LogoRevealRenderer brand={brand} templateIndex={idx} />;
      case 'anim-slide' as BrandKitTemplate['type']:
        return <SlideInRenderer brand={brand} templateIndex={idx} />;
      case 'anim-fade' as BrandKitTemplate['type']:
        return <FadeRenderer brand={brand} templateIndex={idx} />;
      case 'anim-rotate' as BrandKitTemplate['type']:
        return <RotateRenderer brand={brand} templateIndex={idx} />;
      case 'qr-branded' as BrandKitTemplate['type']:
        return <BrandedQrRenderer brand={brand} templateIndex={idx} />;
      case 'qr-minimal' as BrandKitTemplate['type']:
        return <MinimalQrRenderer brand={brand} templateIndex={idx} />;
      case 'qr-rounded' as BrandKitTemplate['type']:
        return <RoundedQrRenderer brand={brand} templateIndex={idx} />;
      case 'qr-square' as BrandKitTemplate['type']:
        return <SquareQrRenderer brand={brand} templateIndex={idx} />;
      // Synthetic types — no legacy moduleId. Cast through unknown
      // because the legacy `BrandKitTemplate['type']` union doesn't
      // know about these new artifact types.
      case 'letterhead' as BrandKitTemplate['type']:
        // Wave 1: ext-1..30 → idx 0-29 → LetterheadExtendedRenderer
        // Wave 2: ext-31..130 → idx 0-99 → LetterheadExtended2Renderer
        if (idx >= 30) {
          return <LetterheadExtended2Renderer brand={brand} templateIndex={idx - 30} />;
        }
        return <LetterheadExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'envelope' as BrandKitTemplate['type']:
        if (idx >= 30) {
          return <EnvelopeExtended2Renderer brand={brand} templateIndex={idx - 30} />;
        }
        return <EnvelopeExtendedRenderer brand={brand} templateIndex={idx} />;
      case 'notecard' as BrandKitTemplate['type']:
        if (idx >= 30) {
          return <NotecardExtended2Renderer brand={brand} templateIndex={idx - 30} />;
        }
        return <NotecardExtendedRenderer brand={brand} templateIndex={idx} />;
      default:
        // Unknown extension type — fall through to legacy.
        return renderLegacyTemplate(template, brand);
    }
  }
  return renderLegacyTemplate(template, brand);
}
