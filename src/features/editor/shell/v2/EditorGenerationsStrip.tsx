// EditorGenerationsStrip — floating horizontal page-thumbnail strip
// anchored to the bottom of the canvas. Surfaces every page in the
// doc so AI generations (which append new pages) are reachable
// without opening the side page navigator. Each thumb shows the
// first image-layer's src if present, otherwise a gradient stub.

import { useMemo } from 'react';
import type { BrandOSDocument, ImageLayer } from '@/features/editor/schema';

interface Props {
  doc: BrandOSDocument;
  activePageId: string;
  onActivePageChange: (pageId: string) => void;
}

export function EditorGenerationsStrip({ doc, activePageId, onActivePageChange }: Props) {
  // Only worth showing when there's more than one page to flip
  // between. For the typical "single page social post" surface, a
  // fresh doc has 1 page and the strip stays hidden until the first
  // AI generation appends another.
  if (doc.pages.length <= 1) return null;

  return (
    <div
      data-editor-generations-strip
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-32px)]"
      style={{
        background: 'var(--surface-elevated, #fff)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 6,
        boxShadow: '0 10px 24px -16px color-mix(in oklab, var(--text-primary) 40%, transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div
        className="flex items-center gap-1.5 overflow-x-auto px-0.5"
        style={{ scrollbarWidth: 'thin', maxWidth: '70vw' }}
      >
        {doc.pages.map((page, idx) => (
          <PageThumb
            key={page.id}
            page={page}
            index={idx}
            active={page.id === activePageId}
            onClick={() => onActivePageChange(page.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PageThumb({
  page, index, active, onClick,
}: {
  page: BrandOSDocument['pages'][number];
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  // Pick the largest image layer's src as the preview, or fall back
  // to a gradient stub. Image-only generation pages always have one
  // image layer covering the page, so this maps cleanly.
  const previewSrc = useMemo(() => {
    const imageLayer = page.layers.find((l): l is ImageLayer => l.kind === 'image');
    if (!imageLayer) return null;
    return typeof imageLayer.src === 'string' ? imageLayer.src : null;
  }, [page.layers]);

  const aspect = page.width / page.height;
  const isLandscape = aspect > 1.1;
  const isPortrait = aspect < 0.9;
  const thumbW = isLandscape ? 64 : (isPortrait ? 36 : 48);
  const thumbH = isLandscape ? 36 : (isPortrait ? 64 : 48);

  return (
    <button
      type="button"
      onClick={onClick}
      title={page.name || `Page ${index + 1}`}
      className="group relative shrink-0 overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{
        width: thumbW,
        height: thumbH,
        borderRadius: 8,
        border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: active
          ? '0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent), 0 4px 10px -6px color-mix(in oklab, var(--accent) 35%, transparent)'
          : 'none',
        background: 'var(--surface-sunken)',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={page.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="h-full w-full flex items-center justify-center text-[9px] font-medium"
          style={{
            background: 'linear-gradient(135deg, var(--surface), var(--surface-sunken))',
            color: 'var(--text-muted)',
          }}
        >
          {index + 1}
        </div>
      )}
    </button>
  );
}
