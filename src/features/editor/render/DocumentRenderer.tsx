// Phase 8.1 — Read-only HTML/CSS renderer for a BrandOSDocument.
//
// Used by the public design portal (/d/:brandSlug/:designSlug) to
// show a saved design without mounting the full Fabric editor. Pure
// React + CSS — no canvas, no Fabric, no interaction. Good enough
// for the 80% of designs that are text + shape + image. SVG layers
// render their src as <img>; logo layers render the brand's primary
// logo (auto variant pickLogoOnBackground deferred).
//
// Multi-page documents render each page as a stacked block with a
// page label. Single-page is the common case.
//
// Coordinates: documents store layer transforms in PAGE-PIXEL coords
// (x/y/width/height all in the page's coordinate system, where the
// page itself is page.width × page.height). The renderer wraps the
// page in a positioned container of (page.width, page.height) and
// places each layer absolutely. Caller decides how to fit-to-viewport
// via a CSS scale on the wrapper.

import type { BrandOSDocument, Layer, Page, ResolvedValue } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import { resolveSlotRef } from '@/features/editor/brand/applyBrandToDocument';

interface DocumentRendererProps {
  doc: BrandOSDocument;
  brandKit?: BrandKit | null;
  /** Optional cap on page width in CSS px. The renderer scales the
   *  whole page so it fits within this width without distorting
   *  aspect ratio. Pass undefined to render at native pixel size. */
  fitToWidth?: number;
}

export function DocumentRenderer({ doc, brandKit, fitToWidth }: DocumentRendererProps) {
  return (
    <div data-document-renderer className="flex flex-col items-center gap-6">
      {doc.pages.map((page, idx) => (
        <PageView
          key={page.id}
          page={page}
          pageIndex={idx}
          totalPages={doc.pages.length}
          brandKit={brandKit ?? null}
          fitToWidth={fitToWidth}
        />
      ))}
    </div>
  );
}

interface PageViewProps {
  page: Page;
  pageIndex: number;
  totalPages: number;
  brandKit: BrandKit | null;
  fitToWidth?: number;
}

function PageView({ page, totalPages, pageIndex, brandKit, fitToWidth }: PageViewProps) {
  const scale = fitToWidth && page.width > 0 ? Math.min(1, fitToWidth / page.width) : 1;
  const bg = resolveString(page.background, brandKit) ?? '#ffffff';

  return (
    <figure
      data-page-id={page.id}
      style={{
        width: page.width * scale,
        height: page.height * scale,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        borderRadius: 8,
        background: bg,
      }}
    >
      <div
        style={{
          width: page.width,
          height: page.height,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {page.layers.map((layer) => (
          <LayerView key={layer.id} layer={layer} brandKit={brandKit} />
        ))}
      </div>
      {totalPages > 1 ? (
        <figcaption
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            background: 'rgba(0,0,0,0.35)',
            padding: '2px 6px',
            borderRadius: 999,
          }}
        >
          {pageIndex + 1} / {totalPages}
        </figcaption>
      ) : null}
    </figure>
  );
}

function LayerView({ layer, brandKit }: { layer: Layer; brandKit: BrandKit | null }) {
  if (layer.visible === false) return null;
  const t = layer.transform;
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: t.x,
    top: t.y,
    width: t.width,
    height: t.height,
    opacity: layer.opacity,
    transform: `rotate(${t.rotation}deg) scale(${t.scaleX}, ${t.scaleY})`,
    transformOrigin: 'center center',
  };

  switch (layer.kind) {
    case 'text': {
      const color = resolveString(layer.color, brandKit) ?? '#000000';
      const fontFamily = resolveString(layer.fontFamily, brandKit) ?? 'system-ui';
      return (
        <div
          data-layer-kind="text"
          data-layer-id={layer.id}
          style={{
            ...baseStyle,
            color,
            fontFamily,
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight,
            lineHeight: layer.lineHeight,
            letterSpacing: layer.letterSpacing,
            textAlign: layer.textAlign,
            direction: layer.direction === 'rtl' ? 'rtl' : 'ltr',
            whiteSpace: 'pre-wrap',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {layer.text}
        </div>
      );
    }
    case 'shape': {
      const fill = layer.fill ? resolveString(layer.fill, brandKit) : null;
      const stroke = layer.stroke ? resolveString(layer.stroke, brandKit) : null;
      const isEllipse = layer.shape === 'ellipse';
      return (
        <div
          data-layer-kind="shape"
          data-layer-id={layer.id}
          style={{
            ...baseStyle,
            background: fill ?? 'transparent',
            border: stroke ? `${layer.strokeWidth}px solid ${stroke}` : undefined,
            borderRadius: isEllipse ? '50%' : layer.cornerRadius,
          }}
        />
      );
    }
    case 'image': {
      const src = typeof layer.src === 'string' ? layer.src : null;
      if (!src) return null;
      const objectFit: React.CSSProperties['objectFit'] =
        layer.fit === 'cover' ? 'cover' : layer.fit === 'contain' ? 'contain' : 'fill';
      return (
        <img
          data-layer-kind="image"
          data-layer-id={layer.id}
          src={src}
          alt={layer.name}
          style={{ ...baseStyle, objectFit }}
        />
      );
    }
    case 'svg': {
      const src = typeof layer.src === 'string' ? layer.src : null;
      if (!src) return null;
      return (
        <img
          data-layer-kind="svg"
          data-layer-id={layer.id}
          src={src}
          alt={layer.name}
          style={baseStyle}
        />
      );
    }
    case 'logo': {
      // Resolve to brand kit's primary asset for v1; auto-variant
      // pickLogoOnBackground deferred to a follow-up — needs the
      // page's effective background tone in the renderer's hands.
      const logoAsset =
        brandKit?.logos.primary ??
        brandKit?.logos.wordmark ??
        brandKit?.logos.iconmark ??
        null;
      if (!logoAsset) return null;
      return (
        <img
          data-layer-kind="logo"
          data-layer-id={layer.id}
          src={logoAsset.url}
          alt={layer.name}
          style={{ ...baseStyle, objectFit: 'contain' }}
        />
      );
    }
    case 'group':
      return (
        <div data-layer-kind="group" data-layer-id={layer.id} style={baseStyle}>
          {layer.children.map((child) => (
            <LayerView key={child.id} layer={child} brandKit={brandKit} />
          ))}
        </div>
      );
  }
}

function resolveString(value: ResolvedValue | null | undefined, brandKit: BrandKit | null): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null && 'type' in value && brandKit) {
    const resolved = resolveSlotRef(value, brandKit);
    return resolved == null ? null : String(resolved);
  }
  return null;
}
