import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { brandsService } from '@/features/brand/services/brands.local';
import type { Brand } from '@/shared/types/brand';

interface SocialMediaToolProps {
  brandId: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function SocialMediaTool({ brandId }: SocialMediaToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadBrand(); }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      setBrand(await brandsService.getById(brandId));
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!brand) {
    return <div className="text-center p-8"><p className="text-muted-foreground">Brand not found</p></div>;
  }

  const primary = brand.primaryColor || '#000000';
  const secondary = brand.secondaryColor || '#666666';
  const contrastOnPrimary = getContrastColor(primary);
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const brandInitial = brand.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Share2 className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Social Media Kit</h2>
      </div>

      {/* Profile Picture */}
      <Card className="p-4">
        <h3 className="font-medium mb-1">Profile Picture</h3>
        <p className="text-xs text-muted-foreground mb-3">1:1 square - works across all platforms</p>
        <div className="flex justify-center">
          <div
            className="rounded-lg shadow-md flex items-center justify-center overflow-hidden"
            style={{
              width: '200px',
              height: '200px',
              backgroundColor: primary,
              fontFamily,
            }}
          >
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={`${brand.name} logo`}
                className="w-24 h-24 object-contain"
                style={{ filter: contrastOnPrimary === '#FFFFFF' ? 'brightness(0) invert(1)' : 'none' }}
              />
            ) : (
              <span
                className="text-7xl font-bold"
                style={{ color: contrastOnPrimary }}
              >
                {brandInitial}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* LinkedIn Banner */}
      <Card className="p-4">
        <h3 className="font-medium mb-1">LinkedIn Banner</h3>
        <p className="text-xs text-muted-foreground mb-3">4:1 ratio - recommended 1584 x 396px</p>
        <div className="flex justify-center">
          <div
            className="rounded-lg shadow-md flex items-center justify-center overflow-hidden"
            style={{
              width: '100%',
              maxWidth: '400px',
              height: '100px',
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
              fontFamily,
            }}
          >
            <div className="flex items-center gap-3">
              {brand.logo && (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="h-8 w-auto object-contain"
                  style={{ filter: contrastOnPrimary === '#FFFFFF' ? 'brightness(0) invert(1)' : 'none' }}
                />
              )}
              <span
                className="text-xl font-bold tracking-wide"
                style={{ color: contrastOnPrimary }}
              >
                {brand.name}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Instagram Post */}
      <Card className="p-4">
        <h3 className="font-medium mb-1">Instagram Post</h3>
        <p className="text-xs text-muted-foreground mb-3">1:1 square - 1080 x 1080px</p>
        <div className="flex justify-center">
          <div
            className="rounded-lg shadow-md flex flex-col items-center justify-center overflow-hidden gap-3 p-6"
            style={{
              width: '280px',
              height: '280px',
              background: `linear-gradient(160deg, ${primary} 0%, ${secondary} 50%, ${primary} 100%)`,
              fontFamily,
            }}
          >
            {brand.logo && (
              <img
                src={brand.logo}
                alt={`${brand.name} logo`}
                className="h-10 w-auto object-contain mb-1"
                style={{ filter: contrastOnPrimary === '#FFFFFF' ? 'brightness(0) invert(1)' : 'none' }}
              />
            )}
            <span
              className="text-2xl font-bold text-center"
              style={{ color: contrastOnPrimary }}
            >
              {brand.name}
            </span>
            <span
              className="text-sm text-center opacity-80"
              style={{ color: contrastOnPrimary }}
            >
              Your brand tagline goes here
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
