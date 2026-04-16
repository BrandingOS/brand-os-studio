import { useState, useRef } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { GUIDELINE_TEMPLATES } from '@/features/guidelines/templates/template-registry';
import type { GuidelineTemplate } from '@/features/guidelines/types/guidelines';

type CategoryFilter = 'All' | 'Professional' | 'Creative';

const categoryMap: Record<string, CategoryFilter> = {
  minimal: 'Professional',
  corporate: 'Professional',
  creative: 'Creative',
  modern: 'Creative',
  Creative: 'Creative',
  Professional: 'Professional',
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<GuidelineTemplate | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const filteredTemplates =
    filter === 'All'
      ? GUIDELINE_TEMPLATES
      : GUIDELINE_TEMPLATES.filter(
          (t) => categoryMap[t.category] === filter
        );

  const filters: CategoryFilter[] = ['All', 'Professional', 'Creative'];

  const handleSelectTemplate = (template: GuidelineTemplate) => {
    setSelectedTemplate(template);
    // Scroll to detail panel after a brief delay for render
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Template Gallery
                </h1>
                <p className="text-sm text-muted-foreground">
                  Browse and apply professional brand guideline templates
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2">
          {filters.map((cat) => (
            <Button
              key={cat}
              variant={filter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className={`group text-left rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selectedTemplate?.id === template.id ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              {/* Preview Image */}
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">{template.name}</h3>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {categoryMap[template.category] ?? template.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {template.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Template Detail Panel */}
        {selectedTemplate && (
          <div
            ref={detailRef}
            className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-lg font-semibold">{selectedTemplate.name} Template</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 pb-6">
              {/* Larger preview */}
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={selectedTemplate.preview}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {categoryMap[selectedTemplate.category] ?? selectedTemplate.category}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This template provides a complete set of brand guideline layouts including
                    typography scales, color palettes, logo usage rules, and spacing guidelines.
                    Apply it to your brand to instantly generate a professional guideline document.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    toast.info('Apply to Brand — coming soon.', {
                      description: `Template application will be available in a future update.`,
                    });
                  }}
                  className="gap-2 w-fit"
                >
                  <Check className="h-4 w-4" />
                  Apply to Brand
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
