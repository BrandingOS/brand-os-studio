import { useState, useEffect } from 'react';
import { Save, Plus, X, Edit3, RefreshCw } from 'lucide-react';
import { BrandLogo } from './renderers/BrandLogo';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface SettingsModuleProps {
  brand: Brand;
  onUpdate?: (patch: Partial<Brand>) => void;
}

export function SettingsModule({ brand, onUpdate }: SettingsModuleProps) {
  const [name, setName] = useState(brand.name);
  const [colors, setColors] = useState<Array<{ hex: string; role: string }>>([]);
  const [fonts, setFonts] = useState({ primary: brand.fonts.primary, secondary: brand.fonts.secondary || '' });

  useEffect(() => {
    const palette: Array<{ hex: string; role: string }> = [];
    if (brand.guidelines?.colorPalette) {
      const cp = brand.guidelines.colorPalette;
      if (cp.primary) palette.push({ hex: cp.primary.hex, role: 'Primary' });
      if (cp.secondary) palette.push({ hex: cp.secondary.hex, role: 'Secondary' });
      if (cp.accent) palette.push({ hex: cp.accent.hex, role: 'Accent' });
    } else {
      palette.push({ hex: brand.primaryColor, role: 'Primary' });
      if (brand.secondaryColor) palette.push({ hex: brand.secondaryColor, role: 'Secondary' });
    }
    setColors(palette);
  }, [brand]);

  const handleSave = () => {
    onUpdate?.({
      name,
      primaryColor: colors[0]?.hex || brand.primaryColor,
      secondaryColor: colors[1]?.hex,
      fonts: { primary: fonts.primary, secondary: fonts.secondary || undefined },
    });
    toast.success('Brand settings saved');
  };

  const addColor = () => {
    setColors([...colors, { hex: '#6366f1', role: `Color ${colors.length + 1}` }]);
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, hex: string) => {
    setColors(colors.map((c, i) => i === index ? { ...c, hex } : c));
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold mb-1">Brand Settings</h2>
        <p className="text-muted-foreground">Configure your brand identity and core assets.</p>
      </div>

      {/* Brand Name */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Name</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      </section>

      {/* Logo */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <BrandLogo brand={brand} variant="monogram" size="lg" />
                <BrandLogo brand={brand} size="sm" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              <Edit3 className="h-3.5 w-3.5" />
              Edit Logo
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              Swap Logo
            </button>
          </div>
        </div>
      </section>

      {/* Icon */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Icon</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {brand.logo ? (
              <img src={brand.logo} alt="" className="w-full h-full object-contain p-1.5" />
            ) : (
              <BrandLogo brand={brand} variant="monogram" size="lg" />
            )}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Edit3 className="h-3.5 w-3.5" />
            Edit Icon
          </button>
        </div>
      </section>

      {/* Color Palette */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Color Palette</h3>
        <div className="space-y-3">
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(index, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{color.role}</p>
                <p className="text-xs text-muted-foreground font-mono">{color.hex.toUpperCase()}</p>
              </div>
              {colors.length > 1 && (
                <button
                  onClick={() => removeColor(index)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {colors.length < 6 && (
            <button
              onClick={addColor}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Add Color
            </button>
          )}
        </div>
      </section>

      {/* Fonts */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fonts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title Font</label>
            <input
              type="text"
              value={fonts.primary}
              onChange={(e) => setFonts({ ...fonts, primary: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Body Font</label>
            <input
              type="text"
              value={fonts.secondary}
              onChange={(e) => setFonts({ ...fonts, secondary: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
