/**
 * ColorsSection — palette grid with click-to-copy + harmony preview.
 *
 * Reads brand.primaryColor, brand.secondaryColor, and the extended
 * guidelines.colorPalette (accent, neutral[], semantic.*).
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { hexToCmyk, formatCmyk, formatRgb } from '../cmykApprox';
import { contrastRatio } from '@/shared/color/brandRules';
import { SectionHeader } from '../SectionHeader';
import { cn } from '@/lib/utils';

interface Swatch {
  name: string;
  hex: string;
  role?: string;
}

interface ColorsSectionProps {
  brand: Brand;
  slug: string;
}

function collectSwatches(brand: Brand): Swatch[] {
  const out: Swatch[] = [];
  if (brand.primaryColor) out.push({ name: 'Primary', hex: brand.primaryColor, role: 'Headlines, primary actions' });
  if (brand.secondaryColor) out.push({ name: 'Secondary', hex: brand.secondaryColor, role: 'Accents, highlights' });
  const palette = brand.guidelines?.colorPalette;
  if (palette?.accent?.hex) out.push({ name: 'Accent', hex: palette.accent.hex, role: 'Decorative use only' });
  palette?.neutral?.slice(0, 4).forEach((n, i) => {
    if (n?.hex) out.push({ name: `Neutral ${i + 1}`, hex: n.hex });
  });
  if (palette?.semantic) {
    (['success', 'warning', 'error', 'info'] as const).forEach((k) => {
      const c = palette.semantic?.[k];
      if (c?.hex) out.push({ name: k.charAt(0).toUpperCase() + k.slice(1), hex: c.hex, role: `${k} state` });
    });
  }
  return out;
}

export function ColorsSection({ brand, slug }: ColorsSectionProps) {
  const swatches = React.useMemo(() => collectSwatches(brand), [brand]);
  const [copiedHex, setCopiedHex] = React.useState<string | null>(null);

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      toast.success(`Copied ${hex}`);
      setTimeout(() => setCopiedHex(null), 1200);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <section>
      <SectionHeader
        eyebrow="Identity"
        title="Colors"
        subtitle="Click any swatch to copy its hex. RGB and CMYK shown for print."
        count={swatches.length}
        action={
          <Link
            to={`/b/${slug}/identity?tab=colors`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Edit3 className="h-3 w-3" />
            Edit palette
          </Link>
        }
      />

      {swatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No colors yet — set a primary color in Identity to begin.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map((s) => {
            const onWhite = contrastRatio(s.hex, '#ffffff');
            const onBlack = contrastRatio(s.hex, '#000000');
            const isCopied = copiedHex === s.hex;
            return (
              <button
                key={s.hex + s.name}
                type="button"
                onClick={() => handleCopy(s.hex)}
                className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="relative aspect-[5/3]" style={{ backgroundColor: s.hex }}>
                  <span
                    className={cn(
                      'absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur',
                      onWhite >= 4.5 ? 'bg-white/80 text-black' : 'bg-black/40 text-white',
                    )}
                  >
                    {isCopied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </span>
                </div>
                <div className="space-y-1 p-3 text-[11px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{s.hex.toUpperCase()}</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">{formatRgb(s.hex)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{formatCmyk(hexToCmyk(s.hex))}</div>
                  {s.role && <div className="pt-1 text-[10px] text-muted-foreground/80">{s.role}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Click swatches to copy · CMYK shown is an approximation for digital previews.
      </div>
    </section>
  );
}
