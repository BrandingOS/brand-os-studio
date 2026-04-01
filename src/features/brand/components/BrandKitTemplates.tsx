import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BrandTemplate {
  id: string;
  name: string;
  category: string;
  type: 'Business Card' | 'Letterhead' | 'Social Media';
  colors: string[];
  layout: 'minimal' | 'centered' | 'split' | 'gradient' | 'bold';
}

const BRAND_KIT_TEMPLATES: BrandTemplate[] = [
  // Business Card templates
  {
    id: 'bc-minimal',
    name: 'Minimal',
    category: 'Clean',
    type: 'Business Card',
    colors: ['#f8f9fa', '#212529', '#6c757d'],
    layout: 'minimal',
  },
  {
    id: 'bc-corporate',
    name: 'Corporate',
    category: 'Professional',
    type: 'Business Card',
    colors: ['#1a365d', '#ffffff', '#2b6cb0'],
    layout: 'split',
  },
  {
    id: 'bc-creative',
    name: 'Creative',
    category: 'Creative',
    type: 'Business Card',
    colors: ['#7c3aed', '#ec4899', '#f97316'],
    layout: 'gradient',
  },
  // Letterhead templates
  {
    id: 'lh-classic',
    name: 'Classic',
    category: 'Traditional',
    type: 'Letterhead',
    colors: ['#ffffff', '#1a202c', '#a0aec0'],
    layout: 'minimal',
  },
  {
    id: 'lh-modern',
    name: 'Modern',
    category: 'Contemporary',
    type: 'Letterhead',
    colors: ['#f0fdf4', '#166534', '#22c55e'],
    layout: 'split',
  },
  // Social Media templates
  {
    id: 'sm-bold',
    name: 'Bold',
    category: 'Impactful',
    type: 'Social Media',
    colors: ['#ef4444', '#fbbf24', '#000000'],
    layout: 'bold',
  },
  {
    id: 'sm-clean',
    name: 'Clean',
    category: 'Minimal',
    type: 'Social Media',
    colors: ['#ffffff', '#0ea5e9', '#64748b'],
    layout: 'centered',
  },
  {
    id: 'sm-gradient',
    name: 'Gradient',
    category: 'Vibrant',
    type: 'Social Media',
    colors: ['#8b5cf6', '#3b82f6', '#06b6d4'],
    layout: 'gradient',
  },
];

function TemplatePreview({ template }: { template: BrandTemplate }) {
  const [c1, c2, c3] = template.colors;

  switch (template.layout) {
    case 'minimal':
      return (
        <div
          className="w-full h-full flex flex-col justify-between p-3"
          style={{ backgroundColor: c1 }}
        >
          <div className="w-6 h-6 rounded" style={{ backgroundColor: c2 }} />
          <div className="space-y-1">
            <div
              className="h-1.5 w-16 rounded-full"
              style={{ backgroundColor: c2 }}
            />
            <div
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: c3 }}
            />
          </div>
        </div>
      );
    case 'centered':
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2 p-3"
          style={{ backgroundColor: c1 }}
        >
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: c2 }}
          />
          <div
            className="h-1.5 w-14 rounded-full"
            style={{ backgroundColor: c3 }}
          />
          <div
            className="h-1.5 w-10 rounded-full"
            style={{ backgroundColor: c3 }}
          />
        </div>
      );
    case 'split':
      return (
        <div className="w-full h-full flex">
          <div
            className="w-1/3 h-full"
            style={{ backgroundColor: c1 }}
          />
          <div
            className="w-2/3 h-full flex flex-col justify-center gap-1.5 p-3"
            style={{ backgroundColor: c2 }}
          >
            <div
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: c3 }}
            />
            <div
              className="h-1.5 w-16 rounded-full opacity-60"
              style={{ backgroundColor: c3 }}
            />
          </div>
        </div>
      );
    case 'gradient':
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2 p-3"
          style={{
            background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`,
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/30 backdrop-blur" />
          <div className="h-1.5 w-14 rounded-full bg-white/50" />
        </div>
      );
    case 'bold':
      return (
        <div
          className="w-full h-full flex flex-col p-3"
          style={{ backgroundColor: c3 }}
        >
          <div
            className="w-full h-1/2 rounded-md mb-2"
            style={{ backgroundColor: c1 }}
          />
          <div className="flex gap-1">
            <div
              className="h-3 w-8 rounded-sm"
              style={{ backgroundColor: c2 }}
            />
            <div
              className="h-3 w-8 rounded-sm"
              style={{ backgroundColor: c1 }}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

type TemplateType = 'All' | 'Business Card' | 'Letterhead' | 'Social Media';

export function BrandKitTemplates() {
  const [typeFilter, setTypeFilter] = useState<TemplateType>('All');

  const types: TemplateType[] = [
    'All',
    'Business Card',
    'Letterhead',
    'Social Media',
  ];

  const filtered =
    typeFilter === 'All'
      ? BRAND_KIT_TEMPLATES
      : BRAND_KIT_TEMPLATES.filter((t) => t.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Brand Kit Templates
        </h2>
        <p className="text-sm text-muted-foreground">
          Ready-to-use templates for your brand collateral
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {types.map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/50 group"
          >
            {/* Preview */}
            <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
              <TemplatePreview template={template} />
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {template.type}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {template.category}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  toast.success('Template applied', {
                    description: `"${template.name}" ${template.type} template is ready to use.`,
                  });
                }}
              >
                Use Template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
