import { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { GUIDELINE_TEMPLATES } from '@/features/guidelines/templates/template-registry';

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

  const filteredTemplates =
    filter === 'All'
      ? GUIDELINE_TEMPLATES
      : GUIDELINE_TEMPLATES.filter(
          (t) => categoryMap[t.category] === filter
        );

  const filters: CategoryFilter[] = ['All', 'Professional', 'Creative'];

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
              onClick={() => {
                toast.success('Template selected', {
                  description: `"${template.name}" template has been selected.`,
                });
              }}
              className="group text-left rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
      </div>
    </DashboardLayout>
  );
}
