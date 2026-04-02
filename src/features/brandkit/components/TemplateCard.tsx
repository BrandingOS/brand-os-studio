import { cn } from '@/lib/utils';
import type { BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { BusinessCardRenderer } from './renderers/BusinessCardRenderer';
import { SocialMediaRenderer } from './renderers/SocialMediaRenderer';
import { ProfileIconRenderer } from './renderers/ProfileIconRenderer';
import { PresentationRenderer } from './renderers/PresentationRenderer';
import { InvoiceRenderer } from './renderers/InvoiceRenderer';
import { BrandGuideRenderer } from './renderers/BrandGuideRenderer';
import { MockupRenderer } from './renderers/MockupRenderer';

interface TemplateCardProps {
  template: BrandKitTemplate;
  brand: Brand;
  onUse: (template: BrandKitTemplate) => void;
}

function getTemplateIndex(template: BrandKitTemplate): number {
  const match = template.id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) - 1 : 0;
}

function renderTemplatePreview(template: BrandKitTemplate, brand: Brand) {
  const idx = getTemplateIndex(template);
  const type = template.type;

  switch (type) {
    case 'business-cards':
      return <BusinessCardRenderer brand={brand} templateIndex={idx} />;
    case 'instagram-posts':
      return <SocialMediaRenderer brand={brand} templateIndex={idx} format="square" />;
    case 'instagram-stories':
      return <SocialMediaRenderer brand={brand} templateIndex={idx} format="story" />;
    case 'facebook-covers':
      return <SocialMediaRenderer brand={brand} templateIndex={idx} format="cover" />;
    case 'profile-icons':
      return <ProfileIconRenderer brand={brand} templateIndex={idx} />;
    case 'presentations':
      return <PresentationRenderer brand={brand} templateIndex={idx} />;
    case 'invoices':
      return <InvoiceRenderer brand={brand} templateIndex={idx} />;
    case 'brand-guides':
      return <BrandGuideRenderer brand={brand} templateIndex={idx} />;
    case 'mockups':
      return <MockupRenderer brand={brand} templateIndex={idx} />;
    default:
      return <BrandGuideRenderer brand={brand} templateIndex={idx} />;
  }
}

export function TemplateCard({ template, brand, onUse }: TemplateCardProps) {
  const aspectRatio = template.orientation === 'portrait' ? 'aspect-[9/16]'
    : template.orientation === 'square' ? 'aspect-square'
    : 'aspect-video';

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      <div className={cn('relative overflow-hidden', aspectRatio)}>
        {renderTemplatePreview(template, brand)}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <button
            onClick={() => onUse(template)}
            className="opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 px-5 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm shadow-lg hover:bg-gray-50"
          >
            Use Template
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate">{template.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{template.category}</p>
      </div>
    </div>
  );
}
