/**
 * Template-specific page renderers.
 * Each template ID maps to its own render function for every page type.
 * These are entirely different visual layouts — not just color swaps.
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import { PageFrame } from './PageFrame';
import { contrastRatio } from '@/features/brandkit/engine/brandRules';

interface PageProps {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
}

// ─── COVER PAGES ───────────────────────────────────────────────

export function CoverHyperHyve({ brand, layout, pageNumber, totalPages }: PageProps) {
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand Guidelines" pageNumber={pageNumber} totalPages={totalPages} brandColor>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {brand.logo && <img src={brand.logo} alt="" className="h-10 object-contain mb-6" style={{ filter: 'brightness(0) invert(1)' }} />}
        <h1 className="text-[clamp(24px,3.5vw,52px)] font-bold text-white leading-tight mb-2">Brand<br />Guidelines</h1>
        <p className="text-[11px] text-white/50">{brand.name} — {new Date().getFullYear()}</p>
      </div>
    </PageFrame>
  );
}

export function CoverIdentity({ brand, layout, pageNumber, totalPages }: PageProps) {
  return (
    <PageFrame brand={brand} layout={layout} pageNumber={pageNumber} totalPages={totalPages} brandColor>
      <div className="flex-1 flex flex-col justify-end">
        <h1 className="text-[clamp(36px,6vw,80px)] font-black text-white leading-[0.95] mb-2">
          {brand.name}<br />Brand<br />Guidelines
        </h1>
        <p className="text-[10px] text-white/40 mt-2">{new Date().getFullYear()}</p>
      </div>
    </PageFrame>
  );
}

export function CoverNoteform({ brand, layout, pageNumber, totalPages }: PageProps) {
  return (
    <PageFrame brand={brand} layout={layout} sectionName="" pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-[10px] text-white/30 mb-4 uppercase tracking-[0.3em]">Brand Guidelines</p>
        <h1 className="text-[clamp(40px,7vw,96px)] font-bold text-white leading-[0.9] tracking-tight">
          {brand.name}
        </h1>
        <p className="text-[clamp(10px,1vw,14px)] text-white/40 mt-6 max-w-[50%]">
          {brand.guidelines?.strategy?.positioning || brand.strategy || 'A comprehensive guide to our brand identity system.'}
        </p>
      </div>
    </PageFrame>
  );
}

export function CoverSignal({ brand, layout, pageNumber, totalPages }: PageProps) {
  return (
    <PageFrame brand={brand} layout={layout} pageNumber={pageNumber} totalPages={totalPages}>
      <div className="flex-1 flex">
        {/* Left: dark section */}
        <div className="w-[45%] bg-[#1a1a1a] -m-[5%] mr-0 p-[5%] flex flex-col justify-end rounded-none">
          <p className="text-[10px] text-white/30 mb-2 uppercase tracking-[0.3em]">Brand Guidelines</p>
          <h1 className="text-[clamp(28px,4vw,52px)] font-extrabold text-white leading-[0.95]">{brand.name}</h1>
          <p className="text-[9px] text-white/30 mt-3">{new Date().getFullYear()}</p>
        </div>
        {/* Right: brand color with oversized number */}
        <div className="flex-1 flex items-center justify-center -m-[5%] ml-0" style={{ backgroundColor: brand.primaryColor }}>
          <span className="text-[clamp(80px,15vw,200px)] font-black text-white/20 leading-none">01</span>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── SECTION DIVIDER PAGES ─────────────────────────────────────

export function SectionDivider({ brand, layout, pageNumber, totalPages, sectionNumber, sectionTitle, sectionSubtitle }: PageProps & { sectionNumber: string; sectionTitle: string; sectionSubtitle?: string }) {
  if (layout.sectionDividerStyle === 'hero-number') {
    return (
      <PageFrame brand={brand} layout={layout} sectionName={sectionTitle} pageNumber={pageNumber} totalPages={totalPages}>
        <div className="flex-1 flex">
          <div className="w-[55%] flex flex-col justify-center" style={{ backgroundColor: brand.primaryColor, margin: `-${layout.chrome.pagePadding}%`, marginRight: 0, padding: `${layout.chrome.pagePadding}%` }}>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2">{sectionSubtitle || 'Section'}</p>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-white leading-tight">{sectionTitle}</h2>
          </div>
          <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]" style={{ margin: `-${layout.chrome.pagePadding}%`, marginLeft: 0 }}>
            <span className="text-[clamp(60px,12vw,160px)] font-black text-white/10">{sectionNumber}</span>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (layout.sectionDividerStyle === 'full-color') {
    return (
      <PageFrame brand={brand} layout={layout} sectionName={sectionTitle} pageNumber={pageNumber} totalPages={totalPages} brandColor>
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-[clamp(32px,5vw,72px)] font-black text-white leading-[0.95]">{sectionTitle}</h2>
          {sectionSubtitle && <p className="text-[12px] text-white/50 mt-2">{sectionSubtitle}</p>}
        </div>
      </PageFrame>
    );
  }

  // numbered-large (HyperHyve style)
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand Guidelines" pageNumber={pageNumber} totalPages={totalPages}>
      <div className="flex-1 flex items-center gap-8">
        <span className="text-[clamp(48px,8vw,120px)] font-bold opacity-10">{sectionNumber}</span>
        <div>
          <h2 className="text-[clamp(24px,3.5vw,48px)] font-bold leading-tight">{sectionTitle}</h2>
          {sectionSubtitle && <p className="text-[clamp(10px,1vw,14px)] opacity-40 mt-1">{sectionSubtitle}</p>}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── CONTENT PAGES ─────────────────────────────────────────────

export function ContentPage({ brand, layout, pageNumber, totalPages, sectionName, title, children }: PageProps & { sectionName: string; title: string; children: React.ReactNode }) {
  const isDark = layout.darkPageBg === '#1a1a1a' || layout.darkPageBg === '#000000';

  return (
    <PageFrame brand={brand} layout={layout} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages}>
      <div className="flex-1 flex flex-col">
        <h3 className="text-[clamp(18px,2.5vw,32px)] font-bold leading-tight mb-4">{title}</h3>
        <div className="flex-1">{children}</div>
      </div>
    </PageFrame>
  );
}

export function ContentPageDark({ brand, layout, pageNumber, totalPages, sectionName, title, children }: PageProps & { sectionName: string; title: string; children: React.ReactNode }) {
  return (
    <PageFrame brand={brand} layout={layout} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col">
        <h3 className="text-[clamp(18px,2.5vw,32px)] font-bold leading-tight mb-4 text-white">{title}</h3>
        <div className="flex-1">{children}</div>
      </div>
    </PageFrame>
  );
}

// ─── CLOSING PAGE ──────────────────────────────────────────────

export function ClosingTemplatePage({ brand, layout, pageNumber, totalPages }: PageProps) {
  if (layout.id === 'identity') {
    return (
      <PageFrame brand={brand} layout={layout} pageNumber={pageNumber} totalPages={totalPages} brandColor>
        <div className="flex-1 flex items-center justify-start">
          <h2 className="text-[clamp(36px,6vw,80px)] font-black text-white">Thank You</h2>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame brand={brand} layout={layout} pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {brand.logo && <img src={brand.logo} alt="" className="h-10 object-contain mb-4" style={{ filter: 'brightness(0) invert(1)' }} />}
        <p className="text-[14px] text-white/50">Thank you</p>
        <p className="text-[10px] text-white/25 mt-1">{brand.name} — {new Date().getFullYear()}</p>
      </div>
    </PageFrame>
  );
}
