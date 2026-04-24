import type { ReactNode } from 'react';

/**
 * Section wrapper for the Brand Kit board. Mirrors the Setup board's
 * header rhythm — `.section-header` with `<h2>` + `.section-spec` +
 * `.section-actions` (download + add). Buttons only render when their
 * handler is passed.
 */
export function KitSection({
  dataKey,
  title,
  spec,
  sectionRef,
  onAdd,
  onDownload,
  children,
}: {
  dataKey: string;
  title: string;
  spec?: string;
  sectionRef?: (el: HTMLElement | null) => void;
  onAdd?: () => void;
  onDownload?: () => void;
  children: ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        {spec && <span className="section-spec">{spec}</span>}
        {(onAdd || onDownload) && (
          <div className="section-actions">
            {onDownload && (
              <button
                type="button"
                className="section-add section-download"
                onClick={onDownload}
                aria-label={`Download ${title}`}
                title={`Download ${title}`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
            {onAdd && (
              <button
                type="button"
                className="section-add"
                onClick={onAdd}
                aria-label={`Add to ${title}`}
                title={`Add to ${title}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
