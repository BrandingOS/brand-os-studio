import { cn } from '@/lib/utils';
import { LAYOUT_PRESETS } from '../data/layouts';
import type { LogoLayout } from '../types';

interface LayoutSelectorProps {
  selected: LogoLayout;
  onSelect: (layout: LogoLayout) => void;
}

/** Mini SVG thumbnails to represent each layout visually */
function LayoutThumbnail({ layout, active }: { layout: LogoLayout; active: boolean }) {
  const fill = active ? 'currentColor' : 'currentColor';
  const opacity = active ? 1 : 0.4;

  switch (layout) {
    case 'stacked':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <rect x="18" y="8" width="12" height="12" rx="3" fill={fill} />
          <rect x="10" y="26" width="28" height="4" rx="2" fill={fill} />
          <rect x="14" y="34" width="20" height="3" rx="1.5" fill={fill} opacity={0.5} />
        </svg>
      );
    case 'horizontal':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <rect x="6" y="16" width="12" height="12" rx="3" fill={fill} />
          <rect x="22" y="18" width="20" height="4" rx="2" fill={fill} />
          <rect x="22" y="26" width="14" height="3" rx="1.5" fill={fill} opacity={0.5} />
        </svg>
      );
    case 'wordmark':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <rect x="6" y="18" width="36" height="6" rx="3" fill={fill} />
          <rect x="10" y="28" width="28" height="3" rx="1.5" fill={fill} opacity={0.5} />
        </svg>
      );
    case 'symbol':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <rect x="12" y="12" width="24" height="24" rx="6" fill={fill} />
        </svg>
      );
    case 'embedded':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <rect x="4" y="18" width="12" height="6" rx="2" fill={fill} />
          <rect x="18" y="14" width="12" height="14" rx="3" fill={fill} />
          <rect x="32" y="18" width="12" height="6" rx="2" fill={fill} />
        </svg>
      );
    case 'badge':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full" opacity={opacity}>
          <circle cx="24" cy="24" r="18" fill="none" stroke={fill} strokeWidth="2.5" />
          <rect x="18" y="14" width="12" height="10" rx="3" fill={fill} />
          <rect x="13" y="28" width="22" height="3" rx="1.5" fill={fill} opacity={0.7} />
        </svg>
      );
    default:
      return null;
  }
}

export function LayoutSelector({ selected, onSelect }: LayoutSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Logo Layout</p>
      <div className="grid grid-cols-3 gap-2">
        {LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            title={preset.description}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
              'hover:bg-accent hover:text-accent-foreground',
              selected === preset.id
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'bg-muted/50 text-muted-foreground',
            )}
          >
            <div className="w-10 h-10">
              <LayoutThumbnail layout={preset.id} active={selected === preset.id} />
            </div>
            <span className="text-[10px] font-medium leading-none">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
