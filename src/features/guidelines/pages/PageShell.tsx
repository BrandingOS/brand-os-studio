import type { Brand } from '@/shared/types/brand';
import type { GuidelineTheme } from './themes';

export interface GuidelinePageProps {
  brand: Brand;
  pageNumber?: number;
  totalPages?: number;
  theme?: GuidelineTheme;
  className?: string;
}

interface PageShellProps {
  children: React.ReactNode;
  brand: Brand;
  pageNumber?: number;
  totalPages?: number;
  dark?: boolean;
  brandColor?: boolean;
  theme?: GuidelineTheme;
  className?: string;
}

export function PageShell({ children, brand, pageNumber, totalPages, dark, brandColor, theme, className = '' }: PageShellProps) {
  let bg: string;
  let text: string;

  if (brandColor) {
    bg = brand.primaryColor;
    text = '#ffffff';
  } else if (dark) {
    bg = theme?.pageBg.secondary || '#0A0A0F';
    text = '#ffffff';
  } else {
    bg = theme?.pageBg.primary || '#ffffff';
    text = theme?.textPrimary || '#0A0A0F';
  }

  // Bold theme: primary bg is already dark
  if (theme?.id === 'bold' && !brandColor) {
    text = '#ffffff';
  }

  const pad = theme?.density === 'compact' ? 'p-[4%]' : theme?.density === 'spacious' ? 'p-[7%]' : 'p-[6%]';

  return (
    <div className={`relative w-full aspect-video overflow-hidden ${className}`} style={{ backgroundColor: bg, color: text }}>
      <div className={`absolute inset-0 ${pad} flex flex-col`}>{children}</div>

      {(theme?.showPageNumbers !== false) && pageNumber && (
        <div className="absolute bottom-[4%] right-[4%] text-[10px] opacity-30 font-mono">
          {String(pageNumber).padStart(2, '0')}{totalPages ? ` / ${String(totalPages).padStart(2, '0')}` : ''}
        </div>
      )}

      {(theme?.showBrandMark !== false) && (
        <div className="absolute bottom-[4%] left-[4%] text-[9px] opacity-20 font-medium tracking-wider uppercase">
          {brand.name}
        </div>
      )}
    </div>
  );
}

export function SectionLabel({ children, color, theme }: { children: React.ReactNode; color?: string; theme?: GuidelineTheme }) {
  const style = theme?.sectionLabelStyle || 'uppercase-small';

  if (style === 'accent-bar') {
    return (
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-1 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>{children}</span>
      </div>
    );
  }
  if (style === 'large-bold') {
    return <div className="text-[12px] font-bold tracking-wider mb-1" style={{ color, opacity: 0.7 }}>{children}</div>;
  }
  if (style === 'numbered') {
    return <div className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 pb-2 border-b border-current/10" style={{ color }}>{children}</div>;
  }
  return <div className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: color || 'currentColor', opacity: color ? 1 : 0.4 }}>{children}</div>;
}

export function PageTitle({ children, theme }: { children: React.ReactNode; theme?: GuidelineTheme }) {
  const s = theme?.titleScale === 'huge' ? 'text-[clamp(28px,4.5vw,64px)]' : theme?.titleScale === 'medium' ? 'text-[clamp(20px,2.8vw,38px)]' : 'text-[clamp(24px,3.5vw,48px)]';
  return <h2 className={`${s} font-bold leading-[1.1] mb-4`}>{children}</h2>;
}

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[clamp(11px,1.2vw,16px)] leading-relaxed opacity-60 max-w-[60%]">{children}</p>;
}

export function Divider({ color, vertical }: { color?: string; vertical?: boolean }) {
  if (vertical) return <div className="w-px h-full" style={{ backgroundColor: color || 'currentColor', opacity: 0.15 }} />;
  return <div className="w-full h-px" style={{ backgroundColor: color || 'currentColor', opacity: 0.15 }} />;
}
