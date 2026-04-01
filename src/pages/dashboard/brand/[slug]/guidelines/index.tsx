import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { GuidelinesEditor } from '@/features/guidelines';
import { InteractiveGuidelinesEditor } from '@/features/guidelines/components/InteractiveGuidelinesEditor';
import { BrandGuidelinePage } from '@/features/guidelines/components/BrandGuidelinePage';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { FileText, Edit, Download, Share2, ArrowLeft, BookOpen } from 'lucide-react';

const GUIDELINE_DOCS = [
  { id: 'brand-strategy', name: 'Brand Strategy', description: 'Core brand positioning and values' },
  { id: 'logo-system', name: 'Logo System', description: 'Logo usage and variations' },
  { id: 'color-palette', name: 'Color Palette', description: 'Brand color definitions and usage' },
  { id: 'typography', name: 'Typography', description: 'Font selections and hierarchy' },
  { id: 'voice-tone', name: 'Voice & Tone', description: 'Brand communication guidelines' },
  { id: 'applications', name: 'Applications', description: 'Brand implementation examples' },
];

export default function GuidelinesHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const [viewMode, setViewMode] = useState<'guidelines' | 'editor'>('guidelines');

  // Default to editor unless 'hub' param is present
  const urlParams = new URLSearchParams(window.location.search);
  const showHub = urlParams.get('hub') === 'true';

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading guidelines...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error || !brand) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The requested brand could not be found.'}</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  if (!showHub) {
    return (
      <div className="min-h-screen">
        {/* View toggle */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('guidelines')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'guidelines'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Guidelines
              </button>
              <button
                onClick={() => setViewMode('editor')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'editor'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Edit className="w-4 h-4" />
                Editor
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'guidelines' && brand ? (
          <BrandGuidelinePage brand={brand} />
        ) : (
          <InteractiveGuidelinesEditor />
        )}
      </div>
    );
  }

  return (
    <Container className="py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Brand Guidelines</h1>
              <p className="text-muted-foreground">Comprehensive brand documentation and editor</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/dashboard/brand/${slug}/guidelines`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Open Editor
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Main Guidelines Editor Card */}
        <Card className="p-8 mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Brand Guidelines Editor</h2>
                <p className="text-muted-foreground">
                  Create, customize, and export comprehensive brand guidelines with our powerful editor
                </p>
              </div>
            </div>
            <Button 
              size="lg"
              onClick={() => navigate(`/dashboard/brand/${slug}/guidelines`)}
            >
              <Edit className="w-5 h-5 mr-2" />
              Launch Editor
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-border/50">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-1">Customize Design</h3>
              <p className="text-sm text-muted-foreground">Templates, sizes, spacing, and layout options</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-1">Complete Guidelines</h3>
              <p className="text-sm text-muted-foreground">All sections from strategy to applications</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium mb-1">Export Ready</h3>
              <p className="text-sm text-muted-foreground">PDF, PNG, and shareable formats</p>
            </div>
          </div>
        </Card>
        
        {/* Individual Guideline Documents */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Individual Sections</h2>
          <p className="text-muted-foreground mb-6">
            Quick access to specific guideline sections
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GUIDELINE_DOCS.map((doc) => (
            <Card key={doc.id} className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">{doc.name}</h3>
              <p className="text-muted-foreground mb-4 text-sm">{doc.description}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/dashboard/brand/${slug}/guidelines/${doc.id}`)}
                >
                  View
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/guidelines?section=${doc.id}`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}