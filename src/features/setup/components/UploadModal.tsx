import { useCallback, useEffect, useRef, useState } from 'react';

export type UploadKind = 'logo' | 'icons' | 'photos';

export type CommittedAsset = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  svg: string | null;
};

type Props = {
  open: boolean;
  kind: UploadKind | null;
  onClose: () => void;
  onCommit?: (asset: CommittedAsset, kind: UploadKind) => void;
  onUrl?: (url: string, kind: UploadKind) => void;
};

type SessionEntry = {
  id: string;
  name: string;
  sub: string;
  preview: string | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function acceptForKind(kind: UploadKind): string {
  if (kind === 'photos') return 'image/*';
  if (kind === 'icons') return '.svg,image/svg+xml';
  return 'image/*,.svg,.pdf';
}

export function UploadModal({ open, kind, onClose, onCommit, onUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [isDrag, setIsDrag] = useState(false);

  const resetSession = useCallback(() => setSession([]), []);

  useEffect(() => {
    if (!open) {
      resetSession();
      setIsDrag(false);
    }
  }, [open, resetSession]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (!kind) return;
      const arr = Array.from(files);
      if (arr.length === 0) return;

      arr.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = (e.target?.result as string) || '';
          const isSvg = !!file.type && file.type.includes('svg');
          let svgText: string | null = null;
          if (isSvg) {
            try {
              svgText = decodeURIComponent(escape(atob(dataUrl.split(',')[1] ?? '')));
            } catch {
              svgText = null;
            }
          }
          const isBitmap = !!file.type && file.type.startsWith('image/') && !isSvg;
          const ext = (file.type && file.type.split('/').pop()) || 'FILE';
          const entry: SessionEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name || 'File',
            sub: `${ext.toUpperCase()} · ${formatSize(file.size)}`,
            preview: isBitmap ? dataUrl : null,
          };
          setSession((prev) => [...prev, entry]);
          onCommit?.(
            {
              name: file.name || 'File',
              size: file.size,
              type: file.type || '',
              dataUrl,
              svg: svgText,
            },
            kind,
          );
        };
        reader.readAsDataURL(file);
      });
    },
    [kind, onCommit],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDrag(false);
      if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleUrlKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !kind) return;
    const val = (e.currentTarget.value || '').trim();
    if (!val) return;
    onUrl?.(val, kind);
    const entry: SessionEntry = {
      id: `${Date.now()}`,
      name: val.replace(/^https?:\/\//, '').slice(0, 48),
      sub: 'URL',
      preview: null,
    };
    setSession((prev) => [...prev, entry]);
    e.currentTarget.value = '';
  };

  const removeOne = (id: string) =>
    setSession((prev) => prev.filter((e) => e.id !== id));

  const clearAll = () => setSession([]);

  const itemsLabel = session.length === 1 ? '1 item' : `${session.length} items`;

  return (
    <div
      className={`upload-modal-backdrop${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="upload-modal-shell">
        <div
          ref={dropZoneRef}
          className={`drop-zone${isDrag ? ' is-drag' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload — drag and drop, click to upload, or paste a URL"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.drop-pill, .drop-close, .items-clear, .upload-tile-remove'))
              return;
            fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDrag(true);
          }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={handleDrop}
        >
          <button type="button" className="drop-close" aria-label="Close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="drop-inset">
            <svg className="drop-border" aria-hidden>
              <rect />
            </svg>

            <div className="drop-content">
              <div className="previews" aria-hidden>
                <div className="preview-card preview-png">
                  <img src="/setup/preview-cards/png.png" alt="" />
                </div>
                <div className="preview-card preview-jpg">
                  <img src="/setup/preview-cards/jpg.png" alt="" />
                </div>
                <div className="preview-card preview-pdf">
                  <img src="/setup/preview-cards/pdf.png" alt="" />
                </div>
              </div>

              <p className="drop-text">
                Drag &amp; drop image here,{' '}
                <button
                  type="button"
                  className="drop-inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  upload file
                </button>{' '}
                or paste the URL
              </p>

              <label className="drop-pill" onClick={(e) => e.stopPropagation()}>
                <svg
                  className="drop-pill-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                  <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
                </svg>
                <input
                  ref={urlInputRef}
                  type="url"
                  placeholder="Paste a URL"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={handleUrlKey}
                />
              </label>

              {session.length > 0 && (
                <div className="drop-items-wrap has-items" onClick={(e) => e.stopPropagation()}>
                  <div className="drop-items-bar">
                    <span className="drop-items-count">{itemsLabel}</span>
                    <button type="button" className="items-clear" onClick={clearAll}>
                      Clear all
                    </button>
                  </div>
                  <div className="drop-items">
                    {session.map((entry) => (
                      <div
                        key={entry.id}
                        className={`upload-tile${entry.preview ? ' is-image' : ''}`}
                      >
                        {entry.preview && (
                          <div
                            className="upload-tile-preview"
                            style={{ backgroundImage: `url(${entry.preview})` }}
                          />
                        )}
                        <div className="upload-tile-meta">
                          <div className="upload-tile-name">{entry.name}</div>
                          <div className="upload-tile-sub">{entry.sub}</div>
                        </div>
                        <button
                          type="button"
                          className="upload-tile-remove"
                          aria-label={`Remove ${entry.name}`}
                          onClick={() => removeOne(entry.id)}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={kind ? acceptForKind(kind) : undefined}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}

