import { Download } from 'lucide-react';
import { LOGO_VARIANTS } from '../data/templates';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface LogoFilesModuleProps {
  brand: Brand;
}

export function LogoFilesModule({ brand }: LogoFilesModuleProps) {
  const handleDownload = (variantName: string) => {
    toast.success(`Downloading ${variantName} logo for ${brand.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Logo Files</h2>
        <p className="text-muted-foreground">Download your logo in different variants and formats.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {LOGO_VARIANTS.map((variant) => {
          const bgColor = variant.bgColor === 'brand-primary' ? brand.primaryColor : variant.bgColor;
          const showWhiteLogo = variant.invertLogo;

          return (
            <div
              key={variant.id}
              className="rounded-xl border border-border overflow-hidden bg-card transition-all hover:shadow-lg hover:border-primary/20"
            >
              <div
                className="aspect-[4/3] flex items-center justify-center p-8 relative"
                style={{ backgroundColor: bgColor }}
              >
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={`${brand.name} - ${variant.name}`}
                    className="max-w-[60%] max-h-[60%] object-contain"
                    style={{ filter: variant.logoFilter || 'none' }}
                  />
                ) : (
                  <div
                    className="text-4xl font-bold tracking-tight"
                    style={{
                      color: showWhiteLogo ? '#ffffff' : brand.primaryColor,
                      filter: variant.logoFilter || 'none',
                    }}
                  >
                    {brand.name}
                  </div>
                )}
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{variant.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{variant.description}</p>
                </div>
                <button
                  onClick={() => handleDownload(variant.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
