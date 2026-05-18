// EditorGenerationsStrip — floating vertical page-thumbnail column
// anchored to the right edge of the canvas. Surfaces every page in
// the doc so AI generations (which append new pages) are reachable
// next to the image they relate to. Each thumb shows the first
// image-layer's src if present, otherwise a numbered gradient stub.

import { useMemo } from 'react';
import type { BrandOSDocument, ImageLayer } from '@/features/editor/schema';

interface Props {
  doc: BrandOSDocument;
  activePageId: string;
  /** Switch the canvas to the picked page. Editor.tsx must route
   *  this through adapter.setActivePage so the adapter mirrors the
   *  intent — calling React state alone gets clobbered by the next
   *  adapter event. */
  onActivePageChange: (pageId: string) => void;
}

export function EditorGenerationsStrip({ doc, activePageId, onActivePageChange }: Props) {
  if (doc.pages.length <= 1) return null;

  return (
    <div
      data-editor-generations-strip
      className="absolute top-1/2 right-3 -translate-y-1/2 z-20"
      style={{
        background: 'var(--surface-elevated, #fff)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 6,
        boxShadow: '0 10px 24px -16px color-mix(in oklab, var(--text-primary) 40%, transparent)',
      }}
    >
      <div
        className="flex flex-col items-center gap-1.5 overflow-y-auto py-0.5"
        style={{ scrollbarWidth: 'thin', maxHeight: 'calc(100vh - 200px)' }}
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

  // Vertical strip: keep width constant so the column reads cleanly,
  // vary height with aspect (clamped so tall stories don't dominate
  // and wide banners don't disappear).
  const aspect = page.width / page.height;
  const thumbW = 56;
  const thumbH = Math.max(32, Math.min(80, Math.round(thumbW / aspect)));

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
