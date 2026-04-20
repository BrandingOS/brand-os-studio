import { useCallback, useEffect, useRef, useState } from 'react';
import { useV4Store } from '../store/onboardingV4Store';
import { FileTile } from './FileTile';
import { formatSize, iconForMime } from '../utils/assetIcons';
import type { OnboardingAsset } from '../types';

const MAX_ASSETS = 10;

function genId(): string {
  return typeof crypto?.randomUUID === 'function' ? `a-${crypto.randomUUID()}` : `a-${Math.random().toString(36).slice(2, 11)}`;
}

/** Simulated upload — mirrors the HTML script. Real uploader goes behind this seam. */
function simulateUpload(onProgress: (pct: number) => void, onDone: () => void) {
  const start = performance.now();
  const duration = 900 + Math.random() * 700;
  function step(now: number) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 2.2);
    onProgress(eased);
    if (p < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

export function BrandDropzone() {
  const assets = useV4Store((s) => s.assets);
  const addAsset = useV4Store((s) => s.addAsset);
  const updateAssetProgress = useV4Store((s) => s.updateAssetProgress);
  const markAssetDone = useV4Store((s) => s.markAssetDone);
  const removeAsset = useV4Store((s) => s.removeAsset);
  const clearAssets = useV4Store((s) => s.clearAssets);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const blobs = useRef<Map<string, string>>(new Map());

  useEffect(
    () => () => {
      blobs.current.forEach(URL.revokeObjectURL);
      blobs.current.clear();
    },
    []
  );

  const queueAsset = useCallback(
    (asset: OnboardingAsset, file?: File) => {
      addAsset(asset);
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        blobs.current.set(asset.id, url);
        // Update preview once created (fires via markAssetDone later)
        simulateUpload(
          (p) => updateAssetProgress(asset.id, p),
          () => markAssetDone(asset.id, url)
        );
      } else {
        simulateUpload(
          (p) => updateAssetProgress(asset.id, p),
          () => markAssetDone(asset.id)
        );
      }
    },
    [addAsset, updateAssetProgress, markAssetDone]
  );

  const addFile = useCallback(
    (file: File) => {
      if (assets.length >= MAX_ASSETS) return false;
      const asset: OnboardingAsset = {
        id: genId(),
        name: file.name,
        sub: `${(file.type ? file.type.split('/').pop() || 'FILE' : 'FILE').toUpperCase()} · ${formatSize(file.size)}`,
        kind: iconForMime(file.type),
        previewUrl: null,
        uploadStatus: 'uploading',
        uploadProgress: 0,
        _file: file,
      };
      queueAsset(asset, file);
      return true;
    },
    [assets.length, queueAsset]
  );

  const addUrl = useCallback(
    (raw: string) => {
      if (assets.length >= MAX_ASSETS) return false;
      let url = String(raw || '').trim();
      if (!url) return false;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      let host = url;
      try {
        host = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        /* ignore */
      }
      const asset: OnboardingAsset = {
        id: genId(),
        name: host,
        sub: 'Link',
        kind: 'link',
        previewUrl: null,
        sourceUrl: url,
        uploadStatus: 'uploading',
        uploadProgress: 0,
      };
      queueAsset(asset);
      return true;
    },
    [assets.length, queueAsset]
  );

  const handleFiles = useCallback(
    (list: FileList) => {
      for (let i = 0; i < list.length; i++) {
        if (!addFile(list[i])) break;
      }
    },
    [addFile]
  );

  const onZoneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.drop-pill') || target.closest('.tile')) return;
    fileInputRef.current?.click();
  };

  const onZoneKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (document.activeElement === urlInputRef.current) return;
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrag(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrag(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrag(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrag(false);
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length) {
      handleFiles(dt.files);
      return;
    }
    const url = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (url) addUrl(url);
  };

  const onUrlKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (urlValue.trim()) {
        addUrl(urlValue);
        setUrlValue('');
      }
    }
  };

  const onUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData('text');
    if (txt && /^https?:\/\//i.test(txt.trim())) {
      e.preventDefault();
      addUrl(txt);
      setUrlValue('');
    }
  };

  const atLimit = assets.length >= MAX_ASSETS;
  const itemsLabel = `${assets.length} ${assets.length === 1 ? 'item' : 'items'}`;

  return (
    <div
      className={`drop-zone${isDrag ? ' is-drag' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Upload brand assets — drag and drop, click to upload, or paste a URL"
      onClick={onZoneClick}
      onKeyDown={onZoneKey}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="drop-inset">
        <svg className="drop-border" aria-hidden="true">
          <rect />
        </svg>

        <div className="drop-content">
          <div className="previews" aria-hidden="true">
            <div className="preview-card preview-png">
              <img src="/onboarding-v4/assets/file-png.png" alt="" />
            </div>
            <div className="preview-card preview-jpg">
              <img src="/onboarding-v4/assets/file-jpg.png" alt="" />
            </div>
            <div className="preview-card preview-pdf">
              <img src="/onboarding-v4/assets/file-pdf.png" alt="" />
            </div>
          </div>

          <p className="drop-text">
            Drag &amp; drop image here,
            <button
              type="button"
              className="drop-inline"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              upload file
            </button>
            or paste the URL
          </p>

          <label
            className="drop-pill"
            onClick={(e) => {
              e.stopPropagation();
              urlInputRef.current?.focus();
            }}
          >
            <svg
              className="drop-pill-icon"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
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
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={onUrlKey}
              onPaste={onUrlPaste}
              disabled={atLimit}
            />
          </label>

          <div className={`drop-items-wrap${assets.length ? ' has-items' : ''}`}>
            <div className="drop-items-bar">
              <span className="drop-items-count">{itemsLabel}</span>
              <button
                type="button"
                className="items-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAssets();
                }}
              >
                Clear all
              </button>
            </div>
            <div className="drop-items" aria-live="polite">
              {assets.map((a) => (
                <FileTile key={a.id} asset={a} onRemove={removeAsset} />
              ))}
            </div>
          </div>

          <p className={`limit-msg${atLimit ? ' is-visible' : ''}`} role="status" aria-live="polite">
            You've reached the limit of {MAX_ASSETS} uploads.{' '}
            <button
              type="button"
              className="limit-link"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: wire to plan upgrade flow when auth/billing is ready
              }}
            >
              Upgrade your plan
            </button>{' '}
            to add more assets.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept="image/*,.pdf,.ai,.sketch,.fig,.psd,.zip,.otf,.ttf,.woff,.woff2"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
