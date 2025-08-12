import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Download, Upload, FileText, Palette, Type } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import { useBrandStore } from '@/shared/store/brandStore';

interface BrandDetailsProps {
  brandId: string;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'guidelines', label: 'Guidelines', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Upload },
  { id: 'export', label: 'Export', icon: Download },
];

export function BrandDetails({ brandId }: BrandDetailsProps) {
  const navigate = useNavigate();
  const { current: brand, loadById, isLoading, error } = useBrandStore();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadById(brandId);
  }, [brandId, loadById]);

  if (isLoading) {
    return (
      <Section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading brand details...</p>
        </div>
      </Section>
    );
  }

  if (error || !brand) {
    return (
      <Section className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
          <p className="text-muted-foreground mb-4">{error || 'The requested brand could not be found.'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </Section>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab brand={brand} />;
      case 'guidelines':
        return <GuidelinesTab brand={brand} />;
      case 'assets':
        return <AssetsTab brand={brand} />;
      case 'export':
        return <ExportTab brand={brand} />;
      default:
        return <OverviewTab brand={brand} />;
    }
  };

  return (
    <Section container={false} className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{brand.name}</h1>
              <p className="text-muted-foreground">Brand Details & Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border border-border"
              style={{ backgroundColor: brand.primaryColor }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </Section>
  );
}

function OverviewTab({ brand }: { brand: any }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Brand Colors
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded border border-border"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground font-mono">{brand.primaryColor}</p>
            </div>
          </div>
          {brand.secondaryColor && (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: brand.secondaryColor }}
              />
              <div>
                <p className="text-sm font-medium">Secondary</p>
                <p className="text-xs text-muted-foreground font-mono">{brand.secondaryColor}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Type className="h-5 w-5" />
          Typography
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Primary Font</p>
            <p className="text-lg" style={{ fontFamily: brand.fonts?.primary }}>
              {brand.fonts?.primary || 'Default'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Brand Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tone</p>
            <p className="capitalize">{brand.tone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Target Audience</p>
            <p className="capitalize">{brand.audience}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <p className="text-sm">{new Date(brand.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GuidelinesTab({ brand }: { brand: any }) {
  const sections = [
    { id: 'strategy', title: 'Brand Strategy', content: brand.guidelines?.strategy },
    { id: 'logo', title: 'Logo System', content: brand.guidelines?.logoSystem },
    { id: 'colors', title: 'Color Guidelines', content: brand.guidelines?.colorPalette },
    { id: 'typography', title: 'Typography', content: brand.guidelines?.typography },
    { id: 'voice', title: 'Voice & Tone', content: brand.guidelines?.voiceAndTone },
    { id: 'applications', title: 'Applications', content: brand.guidelines?.applications },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.id}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{section.title}</h3>
            <Button size="sm" variant="outline">
              Edit
            </Button>
          </div>
          {section.content ? (
            <div className="prose prose-sm max-w-none">
              <p>{section.content}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No content yet</p>
              <Button size="sm" className="mt-2">
                Add {section.title}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function AssetsTab({ brand }: { brand: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Asset Library</h3>
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Assets
          </Button>
        </div>
        
        {brand.assets && brand.assets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {brand.assets.map((asset: any) => (
              <div key={asset.id} className="border border-border rounded-lg p-4">
                <div className="aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium truncate">{asset.name}</p>
                <p className="text-xs text-muted-foreground">{asset.type}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">No Assets Yet</h4>
            <p className="text-muted-foreground mb-4">
              Upload logos, images, and other brand assets to get started.
            </p>
            <Button className="flex items-center gap-2 mx-auto">
              <Upload className="h-4 w-4" />
              Upload Your First Asset
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function ExportTab({ brand }: { brand: any }) {
  const exportOptions = [
    {
      title: 'Brand Guidelines PDF',
      description: 'Complete brand guidelines document',
      format: 'PDF',
      icon: FileText,
    },
    {
      title: 'Web Brand Kit',
      description: 'Interactive web-based brand guidelines',
      format: 'HTML',
      icon: FileText,
    },
    {
      title: 'Assets Package',
      description: 'ZIP file with all brand assets',
      format: 'ZIP',
      icon: Download,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {exportOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Card key={option.title} className="text-center">
            <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
            <Button className="w-full" disabled>
              Export {option.format}
              <span className="ml-2 text-xs">(Coming Soon)</span>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}