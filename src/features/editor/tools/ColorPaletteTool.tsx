import { useState, useEffect, useMemo } from 'react';
import { Palette, Check, AlertTriangle, Lightbulb, Settings } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { useBrandUpdate } from '@/shared/hooks/useBrandUpdate';
import { services } from '@/shared/services/registry';
import { analyzeContrast, contrastMatrix, suggestAccessibleColor, type ContrastResult } from '@/shared/utils/color-utils';
import type { Brand } from '@/shared/types/brand';
import { useBrandSettingsSafe } from '@/shared/brand-settings';

interface ColorPaletteToolProps {
  brandId: string;
}

function ContrastBadge({ result }: { result: ContrastResult }) {
  const level = result.normalText;
  const colors = level === 'AAA'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : level === 'AA'
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  const icon = level === 'Fail'
    ? <AlertTriangle className="h-3 w-3" />
    : <Check className="h-3 w-3" />;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colors}`}>
      {icon} {result.ratioText} ({level})
    </span>
  );
}

export function ColorPaletteTool({ brandId }: ColorPaletteToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { updateBrandSilent } = useBrandUpdate();
  const settings = useBrandSettingsSafe();

  useEffect(() => { loadBrand(); }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      setBrand(await services.brands.getById(brandId));
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrimaryColor = async (color: string) => {
    if (!brand) return;
    try {
      await updateBrandSilent(brandId, { primaryColor: color });
      setBrand({ ...brand, primaryColor: color });
    } catch (error) { console.error('Failed to update primary color:', error); }
  };

  const updateSecondaryColor = async (color: string) => {
    if (!brand) return;
    try {
      await updateBrandSilent(brandId, { secondaryColor: color });
      setBrand({ ...brand, secondaryColor: color });
    } catch (error) { console.error('Failed to update secondary color:', error); }
  };

  // WCAG contrast analysis
  const contrastResults = useMemo(() => {
    if (!brand) return { onWhite: null, onBlack: null, pairResult: null, matrix: [] };
    const primary = brand.primaryColor || '#000000';
    const secondary = brand.secondaryColor || '#cccccc';
    return {
      onWhite: analyzeContrast(primary, '#FFFFFF'),
      onBlack: analyzeContrast(primary, '#000000'),
      pairResult: analyzeContrast(primary, secondary),
      matrix: contrastMatrix([
        { name: 'Primary', hex: primary },
        { name: 'Secondary', hex: secondary },
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Black', hex: '#000000' },
      ]),
    };
  }, [brand?.primaryColor, brand?.secondaryColor]);

  const suggestedFix = useMemo(() => {
    if (!brand || !contrastResults.onWhite || contrastResults.onWhite.passed) return null;
    return suggestAccessibleColor(brand.primaryColor || '#000000', '#FFFFFF');
  }, [brand?.primaryColor, contrastResults.onWhite]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Color Palette</h2>
      </div>

      {settings && (
        <Button size="sm" variant="outline" onClick={() => settings.openSettingsTab('colors')} className="mb-4">
          <Settings className="h-3.5 w-3.5 mr-1" />
          Edit in Brand Settings
        </Button>
      )}

      {/* Primary Color */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Primary Color</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border border-border" style={{ backgroundColor: brand.primaryColor }} />
          <div className="flex-1">
            <Input type="color" value={brand.primaryColor} onChange={(e) => updatePrimaryColor(e.target.value)} className="w-20" />
          </div>
          <Input type="text" value={brand.primaryColor} onChange={(e) => updatePrimaryColor(e.target.value)} className="w-24 font-mono text-sm" placeholder="#000000" />
        </div>
      </Card>

      {/* Secondary Color */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Secondary Color</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border border-border" style={{ backgroundColor: brand.secondaryColor || '#cccccc' }} />
          <div className="flex-1">
            <Input type="color" value={brand.secondaryColor || '#cccccc'} onChange={(e) => updateSecondaryColor(e.target.value)} className="w-20" />
          </div>
          <Input type="text" value={brand.secondaryColor || ''} onChange={(e) => updateSecondaryColor(e.target.value)} className="w-24 font-mono text-sm" placeholder="#cccccc" />
        </div>
      </Card>

      {/* WCAG Contrast Checker */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Accessibility (WCAG 2.1)
        </h3>
        <div className="space-y-3">
          {/* Primary on White */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.primaryColor }} />
              <span className="text-sm">on</span>
              <div className="w-6 h-6 rounded border bg-white" />
              <span className="text-xs text-muted-foreground">Primary on White</span>
            </div>
            {contrastResults.onWhite && <ContrastBadge result={contrastResults.onWhite} />}
          </div>

          {/* Primary on Black */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.primaryColor }} />
              <span className="text-sm">on</span>
              <div className="w-6 h-6 rounded border bg-black" />
              <span className="text-xs text-muted-foreground">Primary on Black</span>
            </div>
            {contrastResults.onBlack && <ContrastBadge result={contrastResults.onBlack} />}
          </div>

          {/* Primary on Secondary */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.primaryColor }} />
              <span className="text-sm">on</span>
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.secondaryColor || '#cccccc' }} />
              <span className="text-xs text-muted-foreground">Primary on Secondary</span>
            </div>
            {contrastResults.pairResult && <ContrastBadge result={contrastResults.pairResult} />}
          </div>

          {/* Auto-fix suggestion */}
          {suggestedFix && contrastResults.onWhite && !contrastResults.onWhite.passed && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950">
              <Lightbulb className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-xs text-yellow-800 dark:text-yellow-200">
                Suggestion: adjust primary to
              </span>
              <div className="w-5 h-5 rounded border" style={{ backgroundColor: suggestedFix }} />
              <code className="text-xs font-mono">{suggestedFix}</code>
              <Button size="sm" variant="outline" className="ml-auto text-xs h-6" onClick={() => updatePrimaryColor(suggestedFix)}>
                Apply
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Contrast Matrix */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Color Pair Matrix</h3>
        <div className="space-y-2">
          {contrastResults.matrix.map((pair, i) => (
            <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/30">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: pair.hex1 }} />
                <span className="text-xs">{pair.color1}</span>
                <span className="text-muted-foreground text-xs">+</span>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: pair.hex2 }} />
                <span className="text-xs">{pair.color2}</span>
              </div>
              <ContrastBadge result={pair.result} />
            </div>
          ))}
        </div>
      </Card>

      {/* Color Suggestions */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Suggested Palettes</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
            ['#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055'],
            ['#2D3436', '#636E72', '#DDDDDD', '#74B9FF', '#00B894'],
          ].map((palette, pi) => (
            <div key={pi} className="space-y-1">
              {palette.map((color, ci) => (
                <div
                  key={ci}
                  className="w-8 h-8 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => updatePrimaryColor(color)}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
