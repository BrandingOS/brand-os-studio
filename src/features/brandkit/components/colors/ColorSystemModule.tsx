import { useState, useMemo } from 'react';
import { Plus, X, Check, AlertTriangle, Info, Palette, Sparkles, Eye, Copy } from 'lucide-react';
import {
  type BrandColor, type ColorRole, type PaletteHarmony,
  getColorInfo, checkContrast, generateHarmonies, generateShades,
  suggestNeutrals, suggestAccent, validatePalette, suggestColorName,
} from '../../engine/colorEngine';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface ColorSystemModuleProps {
  brand: Brand;
  onUpdate?: (patch: Partial<Brand>) => void;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`Copied ${text}`));
}

function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const result = checkContrast(fg, bg);
  const color = result.grade === 'pass' ? 'text-green-600 bg-green-50' : result.grade === 'warn' ? 'text-yellow-600 bg-yellow-50' : 'text-red-500 bg-red-50';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
      {result.ratio.toFixed(1)}:1 {result.aa ? 'AA' : result.aaLarge ? 'AA Large' : 'Fail'}
    </span>
  );
}

export function ColorSystemModule({ brand, onUpdate }: ColorSystemModuleProps) {
  const [activeTab, setActiveTab] = useState<'palette' | 'harmonies' | 'contrast' | 'shades'>('palette');
  const [selectedColor, setSelectedColor] = useState<string>(brand.primaryColor);

  // Build palette from brand data
  const palette = useMemo<BrandColor[]>(() => {
    const colors: BrandColor[] = [
      { hex: brand.primaryColor, name: brand.guidelines?.colorPalette?.primary?.name || suggestColorName(brand.primaryColor), role: 'primary', locked: true },
    ];
    if (brand.secondaryColor) {
      colors.push({ hex: brand.secondaryColor, name: brand.guidelines?.colorPalette?.secondary?.name || suggestColorName(brand.secondaryColor), role: 'secondary' });
    }
    if (brand.guidelines?.colorPalette?.accent) {
      colors.push({ hex: brand.guidelines.colorPalette.accent.hex, name: brand.guidelines.colorPalette.accent.name, role: 'accent' });
    }
    brand.guidelines?.colorPalette?.neutral?.forEach(n => {
      colors.push({ hex: n.hex, name: n.name, role: 'neutral' });
    });
    return colors;
  }, [brand]);

  const issues = useMemo(() => validatePalette(palette), [palette]);
  const harmonies = useMemo(() => generateHarmonies(selectedColor), [selectedColor]);
  const shades = useMemo(() => generateShades(selectedColor), [selectedColor]);
  const suggestedNeutrals = useMemo(() => suggestNeutrals(brand.primaryColor), [brand.primaryColor]);
  const suggestedAccentColor = useMemo(() => suggestAccent(brand.primaryColor), [brand.primaryColor]);

  const tabs = [
    { key: 'palette' as const, label: 'Palette', icon: Palette },
    { key: 'harmonies' as const, label: 'Harmonies', icon: Sparkles },
    { key: 'contrast' as const, label: 'Contrast', icon: Eye },
    { key: 'shades' as const, label: 'Shades', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Color System</h2>
        <p className="text-muted-foreground">
          Manage, validate, and explore your brand color palette.
        </p>
      </div>

      {/* Validation Issues */}
      {issues.length > 0 && (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              issue.severity === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
              issue.severity === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
              'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
            }`}>
              {issue.severity === 'error' ? <AlertTriangle className="h-4 w-4 shrink-0" /> :
               issue.severity === 'warning' ? <AlertTriangle className="h-4 w-4 shrink-0" /> :
               <Info className="h-4 w-4 shrink-0" />}
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PALETTE TAB ── */}
      {activeTab === 'palette' && (
        <div className="space-y-6">
          {/* Main Palette Swatch Bar */}
          <div className="flex rounded-xl overflow-hidden h-24 border border-border">
            {palette.filter(c => c.role !== 'neutral').map((color, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(color.hex)}
                className={`flex-1 relative group transition-all ${selectedColor === color.hex ? 'ring-2 ring-primary ring-inset' : ''}`}
                style={{ backgroundColor: color.hex }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">{color.hex.toUpperCase()}</span>
                </div>
                <div className="absolute bottom-1 left-1">
                  <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-white/20 text-white/80 capitalize">{color.role}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Color Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {palette.map((color, i) => {
              const info = getColorInfo(color.hex);
              return (
                <div
                  key={i}
                  onClick={() => setSelectedColor(color.hex)}
                  className={`rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selectedColor === color.hex ? 'ring-2 ring-primary' : 'border-border'
                  }`}
                >
                  <div className="h-16" style={{ backgroundColor: color.hex }} />
                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{color.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(color.hex); }} className="p-0.5 hover:bg-muted rounded">
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">{color.hex.toUpperCase()}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{color.role}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      HSL({info.hsl.h}°, {info.hsl.s}%, {info.hsl.l}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Neutral Palette */}
          {palette.filter(c => c.role === 'neutral').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Neutrals</h3>
              <div className="flex rounded-xl overflow-hidden h-12 border border-border">
                {palette.filter(c => c.role === 'neutral').map((color, i) => (
                  <div key={i} className="flex-1 relative group" style={{ backgroundColor: color.hex }}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
                      <span className={`text-[10px] font-mono ${getColorInfo(color.hex).isLight ? 'text-gray-800' : 'text-white'}`}>
                        {color.hex.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Colors */}
          <div className="border-t pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Suggested Additions</h3>
            <div className="grid grid-cols-2 gap-3">
              {!palette.find(c => c.role === 'accent') && (
                <div className="rounded-xl border border-dashed border-border p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: suggestedAccentColor }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Suggested Accent</p>
                    <p className="text-xs text-muted-foreground font-mono">{suggestedAccentColor.toUpperCase()}</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
                </div>
              )}
              {palette.filter(c => c.role === 'neutral').length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-3">
                  <p className="text-sm font-medium mb-2">Suggested Neutrals</p>
                  <div className="flex gap-1">
                    {suggestedNeutrals.map((n, i) => (
                      <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: n }} title={n} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HARMONIES TAB ── */}
      {activeTab === 'harmonies' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground">Base color:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColor }} />
              <span className="text-sm font-mono">{selectedColor.toUpperCase()}</span>
            </div>
          </div>

          {harmonies.map((harmony, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="flex h-16">
                {harmony.colors.map((c, j) => (
                  <button
                    key={j}
                    onClick={() => copyToClipboard(c)}
                    className="flex-1 relative group"
                    style={{ backgroundColor: c }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
                      <span className="text-white text-xs font-mono">{c.toUpperCase()}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{harmony.name}</p>
                <p className="text-xs text-muted-foreground">{harmony.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTRAST TAB ── */}
      {activeTab === 'contrast' && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            WCAG contrast checking for text readability on different backgrounds.
          </p>

          {/* Contrast Matrix */}
          <div className="grid gap-3">
            {palette.filter(c => c.role !== 'neutral').map((fgColor) => (
              <div key={fgColor.hex} className="rounded-xl border border-border overflow-hidden">
                <div className="p-3 flex items-center gap-3 bg-muted/30">
                  <div className="w-5 h-5 rounded" style={{ backgroundColor: fgColor.hex }} />
                  <span className="text-sm font-medium">{fgColor.name}</span>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['#FFFFFF', '#F5F5F5', '#0A0A0F', brand.primaryColor].filter((bg, i, arr) => arr.indexOf(bg) === i && bg !== fgColor.hex).map(bg => (
                    <div key={bg} className="rounded-lg border border-border overflow-hidden">
                      <div className="h-10 flex items-center justify-center px-2" style={{ backgroundColor: bg }}>
                        <span className="text-xs font-semibold" style={{ color: fgColor.hex }}>Aa</span>
                      </div>
                      <div className="p-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">{bg === '#FFFFFF' ? 'White' : bg === '#F5F5F5' ? 'Light' : bg === '#0A0A0F' ? 'Dark' : 'Brand'}</span>
                        <ContrastBadge fg={fgColor.hex} bg={bg} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SHADES TAB ── */}
      {activeTab === 'shades' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground">Generating shades for:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColor }} />
              <span className="text-sm font-mono">{selectedColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Shade strips for each non-neutral color */}
          {palette.filter(c => c.role !== 'neutral').map(color => {
            const colorShades = generateShades(color.hex);
            return (
              <div key={color.hex}>
                <h4 className="text-sm font-medium mb-2">{color.name}</h4>
                <div className="flex rounded-xl overflow-hidden h-14 border border-border">
                  {colorShades.map((shade, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(shade)}
                      className="flex-1 relative group"
                      style={{ backgroundColor: shade }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex flex-col items-center justify-center">
                        <span className="text-white text-[9px] font-mono">{shade.toUpperCase()}</span>
                        <span className="text-white/60 text-[8px]">{(i + 1) * 100}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
