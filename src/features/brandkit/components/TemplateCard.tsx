import { cn } from '@/lib/utils';
import type { BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';

interface TemplateCardProps {
  template: BrandKitTemplate;
  brand: Brand;
  onUse: (template: BrandKitTemplate) => void;
}

function generateTemplatePattern(template: BrandKitTemplate, brand: Brand) {
  const primary = brand.primaryColor || '#2563eb';
  const secondary = brand.secondaryColor || '#f59e0b';
  const name = template.name;

  const patternVariants = [
    // Gradient with geometric shapes
    (
      <div className="w-full h-full relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}15, ${secondary}15)` }}>
        <div className="absolute top-4 left-4 w-16 h-16 rounded-xl" style={{ backgroundColor: `${primary}25` }} />
        <div className="absolute bottom-6 right-6 w-24 h-8 rounded-lg" style={{ backgroundColor: `${primary}35` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="w-10 h-10 object-contain opacity-60" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: primary, color: '#fff' }}>
              {brand.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="h-1.5 rounded-full w-2/3 mb-1.5" style={{ backgroundColor: `${primary}20` }} />
          <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: `${secondary}15` }} />
        </div>
      </div>
    ),
    // Bold blocks
    (
      <div className="w-full h-full relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${primary}10, ${secondary}08)` }}>
        <div className="absolute inset-x-0 top-0 h-1/3" style={{ backgroundColor: `${primary}18` }} />
        <div className="absolute top-3 left-3">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="w-8 h-8 object-contain opacity-50" />
          ) : (
            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primary, color: '#fff' }}>
              {brand.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 space-y-1.5">
          <div className="h-2 rounded w-3/4" style={{ backgroundColor: `${primary}22` }} />
          <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: `${secondary}18` }} />
          <div className="h-1.5 rounded w-2/3" style={{ backgroundColor: `${primary}12` }} />
        </div>
      </div>
    ),
    // Circular accent
    (
      <div className="w-full h-full relative overflow-hidden bg-background">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ backgroundColor: `${primary}12` }} />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full" style={{ backgroundColor: `${secondary}15` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="w-12 h-12 object-contain mx-auto opacity-50 mb-2" />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2" style={{ backgroundColor: primary, color: '#fff' }}>
              {brand.name.charAt(0)}
            </div>
          )}
          <div className="h-1 rounded w-16 mx-auto" style={{ backgroundColor: `${primary}30` }} />
        </div>
      </div>
    ),
    // Striped
    (
      <div className="w-full h-full relative overflow-hidden" style={{ background: `linear-gradient(45deg, ${primary}08, ${secondary}05)` }}>
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: `${primary}40` }} />
        <div className="absolute top-4 left-4 right-4 space-y-2">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="w-8 h-8 object-contain opacity-40" />
          ) : (
            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primary, color: '#fff' }}>
              {brand.name.charAt(0)}
            </div>
          )}
          <div className="h-1.5 rounded w-full" style={{ backgroundColor: `${primary}15` }} />
          <div className="h-1 rounded w-2/3" style={{ backgroundColor: `${secondary}12` }} />
        </div>
        <div className="absolute bottom-3 right-3">
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: `${secondary}20` }} />
        </div>
      </div>
    ),
  ];

  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return patternVariants[hash % patternVariants.length];
}

export function TemplateCard({ template, brand, onUse }: TemplateCardProps) {
  const aspectRatio = template.orientation === 'portrait' ? 'aspect-[9/16]'
    : template.orientation === 'square' ? 'aspect-square'
    : 'aspect-video';

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      <div className={cn('relative overflow-hidden', aspectRatio)}>
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          generateTemplatePattern(template, brand)
        )}
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
