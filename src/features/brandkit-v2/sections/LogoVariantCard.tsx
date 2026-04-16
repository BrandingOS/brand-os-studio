import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import type { CollapsedVariantGroup } from '@/shared/color/collapseVariants';
import { cn } from '@/lib/utils';

interface LogoVariantCardProps {
  group: CollapsedVariantGroup;
  onDownload?: (variantId: string) => void;
}

export function LogoVariantCard({ group, onDownload }: LogoVariantCardProps) {
  const [selectedBg, setSelectedBg] = useState(0);
  const { representative, backgrounds } = group;
  const currentBg = backgrounds[selectedBg];
  const currentVariant = group.variants[selectedBg];

  // Determine if background is dark for contrast
  const isDark = currentBg.color !== 'transparent' && currentBg.color !== '#ffffff' && currentBg.color !== '#FFFFFF';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Logo preview */}
      <div
        className="relative flex items-center justify-center p-8 min-h-[180px]"
        style={{ backgroundColor: currentBg.color === 'transparent' ? undefined : currentBg.color }}
      >
        {currentBg.color === 'transparent' && (
          <div className="absolute inset-0 bg-[repeating-conic-gradient(#e5e5e5_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]" />
        )}
        <img
          src={representative.logoSrc}
          alt={representative.name}
          className="relative max-h-[100px] max-w-[80%] object-contain"
          style={{ filter: currentVariant?.logoFilter || representative.logoFilter || undefined }}
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{representative.name}</p>
            {backgrounds.length > 1 && (
              <p className="text-[11px] text-muted-foreground">{backgrounds.length} backgrounds</p>
            )}
          </div>
          {onDownload && (
            <button
              onClick={() => onDownload(currentVariant?.id || representative.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Background picker */}
        {backgrounds.length > 1 && (
          <div className="flex items-center gap-1.5 pt-1">
            {backgrounds.map((bg, i) => (
              <button
                key={bg.id}
                onClick={() => setSelectedBg(i)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all',
                  i === selectedBg ? 'border-primary scale-110' : 'border-border hover:border-muted-foreground',
                )}
                style={{
                  backgroundColor: bg.color === 'transparent' ? '#fff' : bg.color,
                  backgroundImage: bg.color === 'transparent'
                    ? 'repeating-conic-gradient(#e5e5e5 0% 25%, transparent 0% 50%)'
                    : undefined,
                  backgroundSize: bg.color === 'transparent' ? '8px 8px' : undefined,
                }}
                title={bg.label}
              >
                {i === selectedBg && (
                  <Check className={cn('h-3 w-3 mx-auto', isDark ? 'text-white' : 'text-primary')} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Contrast score */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className={cn(
            'px-1.5 py-0.5 rounded font-medium',
            currentBg.contrastScore >= 7 ? 'bg-green-100 text-green-700' :
            currentBg.contrastScore >= 4.5 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {currentBg.contrastScore >= 7 ? 'AAA' : currentBg.contrastScore >= 4.5 ? 'AA' : 'Low'}
          </span>
          <span className="text-muted-foreground">{currentBg.contrastScore.toFixed(1)}:1</span>
        </div>

        {/* Tags */}
        {representative.tags && representative.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {representative.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
