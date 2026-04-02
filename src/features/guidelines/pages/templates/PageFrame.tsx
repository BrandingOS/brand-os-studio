/**
 * PageFrame — renders the chrome (header, footer, corners) for any template.
 * This replaces the old PageShell when using template layouts.
 * Every element position is configurable via the TemplateLayout config.
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout, ChromeContent } from './layout-config';

export interface FramePageProps {
  brand: Brand;
  layout: TemplateLayout;
  sectionName?: string;
  pageNumber?: number;
  totalPages?: number;
  dark?: boolean;
  brandColor?: boolean;
  children: React.ReactNode;
}

function renderChromeItem(item: ChromeContent, brand: Brand, sectionName?: string, pageNumber?: number, totalPages?: number): React.ReactNode {
  switch (item.type) {
    case 'logo':
      return brand.logo ? (
        <img src={brand.logo} alt="" className="h-3 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
      ) : null;
    case 'brandName':
      return <span>{brand.name}</span>;
    case 'sectionName':
      return <span>{sectionName || ''}</span>;
    case 'pageNumber':
      if (!pageNumber) return null;
      if (item.format === 'padded') return <span>{String(pageNumber).padStart(2, '0')}</span>;
      if (item.format === 'of-total') return <span>{pageNumber}/{totalPages || '—'}</span>;
      return <span>{pageNumber}</span>;
    case 'date':
      if (item.format === 'year') return <span>© {new Date().getFullYear()}</span>;
      return <span>{new Date().toLocaleDateString()}</span>;
    case 'text':
      return <span>{item.value}</span>;
    case 'divider':
      return <span className="opacity-20">|</span>;
    case 'none':
      return null;
    default:
      return null;
  }
}

function ChromeRow({ items, brand, sectionName, pageNumber, totalPages, align }: {
  items?: ChromeContent[];
  brand: Brand;
  sectionName?: string;
  pageNumber?: number;
  totalPages?: number;
  align: 'left' | 'center' | 'right';
}) {
  if (!items || items.length === 0) return null;
  const justify = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={`flex items-center gap-2 text-[8px] font-medium tracking-wider opacity-40 ${justify}`}>
      {items.map((item, i) => (
        <span key={i}>{renderChromeItem(item, brand, sectionName, pageNumber, totalPages)}</span>
      ))}
    </div>
  );
}

export function PageFrame({ brand, layout, sectionName, pageNumber, totalPages, dark, brandColor, children }: FramePageProps) {
  let bg: string;
  let textColor: string;

  if (brandColor) {
    bg = layout.accentPageBg === 'brand' ? brand.primaryColor : layout.accentPageBg;
    textColor = '#ffffff';
  } else if (dark) {
    bg = layout.darkPageBg;
    textColor = '#ffffff';
  } else {
    bg = layout.lightPageBg;
    textColor = bg === '#ffffff' || bg === '#f5f5f0' || bg === '#F5F5F5' ? '#0A0A0F' : '#ffffff';
  }

  const pad = `${layout.chrome.pagePadding}%`;

  return (
    <div className="relative w-full aspect-video overflow-hidden" style={{ backgroundColor: bg, color: textColor }}>
      {/* Header Chrome */}
      {(layout.chrome.topLeft || layout.chrome.topCenter || layout.chrome.topRight) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between z-10"
          style={{
            padding: `${pad} ${pad} 0 ${pad}`,
            paddingBottom: layout.chrome.headerBar ? '8px' : '0',
            borderBottom: layout.chrome.headerBarBorder ? '1px solid rgba(128,128,128,0.15)' : 'none',
          }}
        >
          <ChromeRow items={layout.chrome.topLeft} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="left" />
          <ChromeRow items={layout.chrome.topCenter} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="center" />
          <ChromeRow items={layout.chrome.topRight} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="right" />
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col" style={{ padding: pad, paddingTop: layout.chrome.headerBar ? `calc(${pad} + 28px)` : pad }}>
        {children}
      </div>

      {/* Footer Chrome */}
      {(layout.chrome.bottomLeft || layout.chrome.bottomCenter || layout.chrome.bottomRight) && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between z-10"
          style={{
            padding: `0 ${pad} ${pad} ${pad}`,
            paddingTop: layout.chrome.headerBarBorder ? '8px' : '0',
            borderTop: layout.showFooterRule ? '1px solid rgba(128,128,128,0.15)' : 'none',
          }}
        >
          <ChromeRow items={layout.chrome.bottomLeft} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="left" />
          <ChromeRow items={layout.chrome.bottomCenter} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="center" />
          <ChromeRow items={layout.chrome.bottomRight} brand={brand} sectionName={sectionName} pageNumber={pageNumber} totalPages={totalPages} align="right" />
        </div>
      )}
    </div>
  );
}
