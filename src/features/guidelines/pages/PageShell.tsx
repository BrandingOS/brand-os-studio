/**
 * PageShell — the wrapper for every guideline page.
 * Handles consistent sizing, numbering, and page chrome.
 */
import type { Brand } from '@/shared/types/brand';

export interface GuidelinePageProps {
  brand: Brand;
  pageNumber?: number;
  totalPages?: number;
  className?: string;
}

interface PageShellProps {
  children: React.ReactNode;
  brand: Brand;
  pageNumber?: number;
  totalPages?: number;
  dark?: boolean;
  brandColor?: boolean;
  className?: string;
}

export function PageShell({ children, brand, pageNumber, totalPages, dark, brandColor, className = '' }: PageShellProps) {
  const bg = brandColor ? brand.primaryColor : dark ? '#0A0A0F' : '#ffffff';
  const text = (dark || brandColor) ? '#ffffff' : '#0A0A0F';

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {/* Content */}
      <div className="absolute inset-0 p-[6%] flex flex-col">
        {children}
      </div>

      {/* Page Number */}
      {pageNumber && (
        <div className="absolute bottom-[4%] right-[4%] text-[10px] opacity-40 font-mono">
          {String(pageNumber).padStart(2, '0')}{totalPages ? ` / ${String(totalPages).padStart(2, '0')}` : ''}
        </div>
      )}

      {/* Brand mark */}
      <div className="absolute bottom-[4%] left-[4%] text-[9px] opacity-30 font-medium tracking-wider uppercase">
        {brand.name}
      </div>
    </div>
  );
}

export function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: color || 'currentColor', opacity: color ? 1 : 0.4 }}>
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[clamp(24px,3.5vw,48px)] font-bold leading-[1.1] mb-4">{children}</h2>;
}

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[clamp(11px,1.2vw,16px)] leading-relaxed opacity-60 max-w-[60%]">{children}</p>;
}

export function Divider({ color, vertical }: { color?: string; vertical?: boolean }) {
  if (vertical) return <div className="w-px h-full" style={{ backgroundColor: color || 'currentColor', opacity: 0.15 }} />;
  return <div className="w-full h-px" style={{ backgroundColor: color || 'currentColor', opacity: 0.15 }} />;
}
