import { useCallback, useRef, useState } from 'react';
import { useV4Store } from '../store/onboardingV4Store';
import { FileTile } from './FileTile';
import type { OnboardingAsset } from '../types';
import { enqueueFile, genId, simulateUpload } from '../utils/assetUpload';

const MAX_ASSETS = 20;

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

  const deps = {
    max: MAX_ASSETS,
    getCount: () => useV4Store.getState().assets.length,
    addAsset,
    updateAssetProgress,
    markAssetDone,
  };

  const addFile = useCallback(
    (file: File) => {
      void enqueueFile(file, deps);
      return true;
    },
    [addAsset, updateAssetProgress, markAssetDone]
  );

  const addUrl = useCallback(
    (raw: string) => {
      if (useV4Store.getState().assets.length >= MAX_ASSETS) return false;
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
      addAsset(asset);
      simulateUpload(
        (p) => updateAssetProgress(asset.id, p),
        () => markAssetDone(asset.id)
      );
      return true;
    },
    [addAsset, updateAssetProgress, markAssetDone]
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

  // Hide things that only exist as a result of the review step so the user
  // doesn't see them double-counted when they step back here:
  //   - logos already placed in a slot
  //   - auto-generated B&W variants
  //   - colors (added or extracted inside the review)
  const visibleAssets = assets.filter((a) => {
    if (a.kind === 'image' && (a.logoSlot || a.generated)) return false;
    if (a.kind === 'color') return false;
    return true;
  });
  const atLimit = assets.length >= MAX_ASSETS;
  const itemsLabel = `${visibleAssets.length} ${visibleAssets.length === 1 ? 'item' : 'items'}`;

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

          <div className={`drop-items-wrap${visibleAssets.length ? ' has-items' : ''}`}>
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
              {visibleAssets.map((a) => (
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
        accept="image/*,image/svg+xml,.svg,.pdf,.ai,.sketch,.fig,.psd,.zip,.otf,.ttf,.woff,.woff2"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
