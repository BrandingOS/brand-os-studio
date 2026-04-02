import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TemplateGallery } from './TemplateGallery';
import { LogoFilesModule } from './LogoFilesModule';
import { SettingsModule } from './SettingsModule';
import { QRCodeModule } from './QRCodeModule';
import { AnimationsModule } from './AnimationsModule';
import { DesignToolModule } from './DesignToolModule';
import { ColorSystemModule } from './colors/ColorSystemModule';
import { BrandVoiceModule } from './BrandVoiceModule';
import { BrandStrategyModule } from './BrandStrategyModule';
import { TypographyModule } from './TypographyModule';
import { GuidelinesDocument } from '../../guidelines/pages/GuidelinesDocument';
import { getModuleConfig } from '../data/modules';
import type { Brand } from '@/shared/types/brand';

interface BrandKitModuleViewProps {
  moduleId: string;
  brand: Brand;
  slug: string;
  onBrandUpdate?: (patch: Partial<Brand>) => void;
}

export function BrandKitModuleView({ moduleId, brand, slug, onBrandUpdate }: BrandKitModuleViewProps) {
  const navigate = useNavigate();
  const moduleConfig = getModuleConfig(moduleId);

  if (!moduleConfig) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Module not found.</p>
        <button
          onClick={() => navigate(`/dashboard/brand/${slug}/brandkit`)}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:underline"
        >
          Back to Brand Kit
        </button>
      </div>
    );
  }

  const renderModule = () => {
    switch (moduleId) {
      case 'settings':
        return <SettingsModule brand={brand} onUpdate={onBrandUpdate} />;
      case 'color-system':
        return <ColorSystemModule brand={brand} onUpdate={onBrandUpdate} />;
      case 'brand-voice':
        return <BrandVoiceModule brand={brand} />;
      case 'brand-strategy':
        return <BrandStrategyModule brand={brand} />;
      case 'brand-guides':
        return <GuidelinesDocument brand={brand} />;
      case 'typography':
        return <TypographyModule brand={brand} />;
      case 'logo-files':
        return <LogoFilesModule brand={brand} />;
      case 'qr-code':
        return <QRCodeModule brand={brand} />;
      case 'animations':
        return <AnimationsModule brand={brand} />;
      case 'design-tool':
        return <DesignToolModule brand={brand} />;
      default:
        // Template-based modules use the gallery
        return <TemplateGallery moduleConfig={moduleConfig} brand={brand} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate(`/dashboard/brand/${slug}/brandkit`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Brand Kit
      </button>

      {/* Module Header (for template-based modules) */}
      {!['settings', 'logo-files', 'qr-code', 'animations', 'design-tool', 'color-system', 'brand-voice', 'brand-strategy', 'typography', 'brand-guides'].includes(moduleId) && (
        <div>
          <h2 className="text-2xl font-bold mb-1">{moduleConfig.name}</h2>
          <p className="text-muted-foreground">{moduleConfig.description}</p>
        </div>
      )}

      {/* Module Content */}
      {renderModule()}
    </div>
  );
}
