/**
 * PaletteGenerator — A curated color palette browser for logo presentations.
 * Sources: Tailwind CSS, Open Color, Material Design, Radix Colors, classic branding.
 */
import { useState } from 'react';
import { Palette, Check, X, Sparkles } from 'lucide-react';
import {
  CURATED_PALETTES,
  PALETTE_CATEGORIES,
  type CuratedPalette,
  type PaletteCategory,
} from '../data/palettes';

interface PaletteGeneratorProps {
  onSelect: (primary: string, accent: string) => void;
  currentPrimary?: string;
  currentAccent?: string;
  onClose: () => void;
}

export function PaletteGenerator({
  onSelect,
  currentPrimary,
  currentAccent,
  onClose,
}: PaletteGeneratorProps) {
  const [category, setCategory] = useState<PaletteCategory>('All');
  const [hoveredPalette, setHoveredPalette] = useState<string | null>(null);

  const filtered =
    category === 'All'
      ? CURATED_PALETTES
      : CURATED_PALETTES.filter((p) => p.category === category);

  const isSelected = (p: CuratedPalette) =>
    p.primary === currentPrimary && p.accent === currentAccent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-[#141414] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Palette className="w-4 h-4 text-white/50" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/80">Color Palette Library</h2>
              <p className="text-[10px] text-white/30">
                {CURATED_PALETTES.length} palettes from Tailwind, Material Design, Open Color, Radix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b border-white/[0.06] shrink-0 overflow-x-auto scrollbar-thin">
          <div className="flex gap-1.5">
            {PALETTE_CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? CURATED_PALETTES.length
                  : CURATED_PALETTES.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    category === cat
                      ? 'bg-white/[0.1] text-white/80 border border-white/[0.1]'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {cat}
                  <span className="text-[9px] text-white/20">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((palette) => {
              const selected = isSelected(palette);
              const hovered = hoveredPalette === palette.name;
              return (
                <button
                  key={palette.name}
                  onClick={() => onSelect(palette.primary, palette.accent)}
                  onMouseEnter={() => setHoveredPalette(palette.name)}
                  onMouseLeave={() => setHoveredPalette(null)}
                  className={`group relative rounded-xl border p-3 text-left transition-all duration-200 ${
                    selected
                      ? 'border-white/20 bg-white/[0.06] ring-1 ring-white/10'
                      : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Check indicator */}
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white/70" />
                    </div>
                  )}

                  {/* Color swatches */}
                  <div className="flex gap-1 mb-3">
                    {palette.colors.map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-10 first:rounded-l-lg last:rounded-r-lg transition-transform duration-200"
                        style={{
                          backgroundColor: color,
                          transform: hovered ? `scaleY(1.1)` : 'scaleY(1)',
                          transitionDelay: `${i * 20}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/70 truncate">
                        {palette.name}
                      </p>
                      <p className="text-[9px] text-white/25 mt-0.5">{palette.source}</p>
                    </div>
                    {/* Primary + Accent preview */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className="w-4 h-4 rounded-sm border border-white/10"
                        style={{ backgroundColor: palette.primary }}
                        title={`Primary: ${palette.primary}`}
                      />
                      <div
                        className="w-4 h-4 rounded-sm border border-white/10"
                        style={{ backgroundColor: palette.accent }}
                        title={`Accent: ${palette.accent}`}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="w-8 h-8 text-white/15 mb-3" />
              <p className="text-sm text-white/30">No palettes in this category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-white/20">
            Click any palette to apply its primary & accent colors
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
