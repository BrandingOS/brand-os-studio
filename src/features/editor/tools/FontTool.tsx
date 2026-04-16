import { useState, useEffect } from 'react';
import { Type, Check, Settings } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { services } from '@/shared/services/registry';
import { useBrandUpdate } from '@/shared/hooks/useBrandUpdate';
import type { Brand } from '@/shared/types/brand';
import { useBrandSettingsSafe } from '@/shared/brand-settings';

interface FontToolProps {
  brandId: string;
}

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Playfair Display',
  'Merriweather',
  'Raleway',
  'Oswald',
  'Source Sans 3',
  'Nunito',
  'PT Sans',
  'Work Sans',
  'Rubik',
  'DM Sans',
  'Space Grotesk',
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
];

function loadGoogleFont(fontName: string) {
  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function FontTool({ brandId }: FontToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryFont, setPrimaryFont] = useState('Inter');
  const [secondaryFont, setSecondaryFont] = useState('Inter');
  const [isSaving, setIsSaving] = useState(false);
  const settings = useBrandSettingsSafe();

  useEffect(() => {
    loadBrand();
  }, [brandId]);

  useEffect(() => {
    GOOGLE_FONTS.forEach(loadGoogleFont);
  }, []);

  useEffect(() => {
    if (brand?.fonts) {
      setPrimaryFont(brand.fonts.primary || 'Inter');
      setSecondaryFont(brand.fonts.secondary || 'Inter');
    }
  }, [brand]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      const brandData = await services.brands.getById(brandId);
      setBrand(brandData);
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { updateBrand } = useBrandUpdate();

  const saveFonts = async () => {
    if (!brand) return;

    try {
      setIsSaving(true);
      const patch = { fonts: { primary: primaryFont, secondary: secondaryFont } };
      await updateBrand(brandId, patch, 'Fonts updated');
      setBrand({ ...brand, ...patch });
    } catch (error) {
      console.error('Failed to update fonts:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    brand?.fonts?.primary !== primaryFont ||
    brand?.fonts?.secondary !== secondaryFont;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Brand not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Type className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Typography</h2>
      </div>

      {settings && (
        <Button size="sm" variant="outline" onClick={() => settings.openSettingsTab('typography')} className="mb-4">
          <Settings className="h-3.5 w-3.5 mr-1" />
          Edit in Brand Settings
        </Button>
      )}

      {/* Primary Font */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Primary Font</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Used for headings and titles
        </p>
        <select
          value={primaryFont}
          onChange={(e) => setPrimaryFont(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {GOOGLE_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </Card>

      {/* Secondary Font */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Secondary Font</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Used for body text and paragraphs
        </p>
        <select
          value={secondaryFont}
          onChange={(e) => setSecondaryFont(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {GOOGLE_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </Card>

      {/* Font Preview */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Preview</h3>
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Primary: {primaryFont}
            </p>
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: `'${primaryFont}', sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-1">
              Secondary: {secondaryFont}
            </p>
            <p
              className="text-base"
              style={{ fontFamily: `'${secondaryFont}', sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog. Pack my box with five
              dozen liquor jugs. How vexingly quick daft zebras jump.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <Button onClick={saveFonts} disabled={isSaving} className="w-full">
          <Check className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Font Changes'}
        </Button>
      )}
    </div>
  );
}
