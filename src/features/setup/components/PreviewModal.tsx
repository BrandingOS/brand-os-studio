import { useEffect } from 'react';

export type PreviewData =
  | { kind: 'image'; src: string; label?: string }
  | { kind: 'svg'; svg: string; label?: string };

type Props = {
  data: PreviewData | null;
  onClose: () => void;
};

/**
 * Lightbox-style preview for logo/photo cards. Renders either a raster
 * image or an inline SVG at a large, centered size; dismisses via
 * backdrop click, Escape, or the close button. Body scroll is locked
 * while the preview is mounted so the background doesn't shift.
 */
export function PreviewModal({ data, onClose }: Props) {
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [data, onClose]);

  return (
    <div
      className={`preview-backdrop${data ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!data}
      aria-label={data?.label ?? 'Preview'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="preview-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      {data && (
        <div
          className="preview-stage"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {data.kind === 'image' ? (
            <img
              src={data.src}
              alt={data.label ?? ''}
              className="preview-img"
              draggable={false}
            />
          ) : (
            <div
              className="preview-svg"
              dangerouslySetInnerHTML={{ __html: data.svg }}
            />
          )}
          {data.label && <div className="preview-caption">{data.label}</div>}
        </div>
      )}
    </div>
  );
}
