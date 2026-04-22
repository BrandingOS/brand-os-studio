/**
 * SwappablePhoto — Photo with a small hover affordance that opens a
 * popover. The popover:
 *   1. Picks from a curated pool of Unsplash URLs ("Quick picks").
 *   2. Live-searches Unsplash by keyword (when
 *      VITE_UNSPLASH_ACCESS_KEY is set — same key as the bento flow).
 *
 * Architectural notes:
 *   - The popover is portaled to document.body so it can escape any
 *     ancestor `overflow: hidden` (the tiles clip their contents).
 *   - Decorative overlays that sit above the photo (gradients,
 *     duotone tints) must be rendered *inside* this component via the
 *     `overlay` prop, so the change-photo button paints on top.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, Check, Search, Loader2 } from 'lucide-react';

import { Photo } from './Photo';
import { unsplashProvider } from '@/features/bento/lib/stockPhotos/unsplash';
import type { StockPhoto } from '@/features/bento/lib/stockPhotos/types';

export interface SwappablePhotoProps {
  defaultSrc: string;
  alternatives: readonly string[];
  alt: string;
  fallback: { from: string; to: string };
  fallbackGlyph?: string;
  style?: React.CSSProperties;
  buttonTone?: 'dark' | 'light';
  /** Decorative overlay rendered between the photo and the button
      (e.g. a brand-color gradient). Pointer events must be none so
      clicks fall through to the photo / button. */
  overlay?: React.ReactNode;
}

const POPOVER_WIDTH = 240;
const POPOVER_GAP = 8;

export function SwappablePhoto({
  defaultSrc,
  alternatives,
  alt,
  fallback,
  fallbackGlyph,
  style,
  buttonTone = 'dark',
  overlay,
}: SwappablePhotoProps) {
  const [src, setSrc] = useState(defaultSrc);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchIdRef = useRef(0);

  const unsplashConfigured = unsplashProvider.isConfigured();
  const options = Array.from(new Set([src, defaultSrc, ...alternatives]));

  const positionPopover = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer below the button; flip up if it overflows viewport.
    let left = rect.right - POPOVER_WIDTH;
    left = Math.max(8, Math.min(left, vw - POPOVER_WIDTH - 8));
    const estimatedHeight = 380;
    let top = rect.bottom + POPOVER_GAP;
    if (top + estimatedHeight > vh - 8) {
      top = Math.max(8, rect.top - estimatedHeight - POPOVER_GAP);
    }
    setPopoverPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) positionPopover();
  }, [open, positionPopover]);

  useEffect(() => {
    if (!open) return;
    const handlers = () => positionPopover();
    window.addEventListener('scroll', handlers, true);
    window.addEventListener('resize', handlers);
    return () => {
      window.removeEventListener('scroll', handlers, true);
      window.removeEventListener('resize', handlers);
    };
  }, [open, positionPopover]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const runSearch = async (q: string) => {
    if (!unsplashConfigured) {
      setSearchError('Unsplash key missing — set VITE_UNSPLASH_ACCESS_KEY in .env.');
      return;
    }
    const id = ++searchIdRef.current;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await unsplashProvider.search(q, { page: 1, perPage: 12 });
      if (id === searchIdRef.current) setResults(res.results);
    } catch (err) {
      if (id === searchIdRef.current) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      }
    } finally {
      if (id === searchIdRef.current) setSearching(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const handle = window.setTimeout(() => runSearch(trimmed), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, unsplashConfigured]);

  const selectUnsplash = (photo: StockPhoto) => {
    setSrc(photo.regularUrl);
    photo.trackDownload?.().catch(() => undefined);
    setOpen(false);
  };

  const popover =
    open && popoverPos
      ? createPortal(
          <div
            ref={popoverRef}
            className="photo-swap-popover photo-swap-popover--portal"
            style={{ top: popoverPos.top, left: popoverPos.left, width: POPOVER_WIDTH }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="photo-swap-search">
              <Search size={12} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={unsplashConfigured ? 'Search Unsplash…' : 'Unsplash key missing'}
                disabled={!unsplashConfigured}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              {searching && <Loader2 size={12} className="photo-swap-spin" />}
            </div>

            {query.trim() ? (
              <>
                {searchError && <p className="photo-swap-empty">{searchError}</p>}
                {!searchError && !searching && results.length === 0 && (
                  <p className="photo-swap-empty">No results.</p>
                )}
                {results.length > 0 && (
                  <div className="photo-swap-grid">
                    {results.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="photo-swap-thumb"
                        onClick={() => selectUnsplash(photo)}
                        title={`${photo.author} · Unsplash`}
                      >
                        <img src={photo.thumbUrl} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="photo-swap-popover-title">Quick picks</div>
                <div className="photo-swap-grid">
                  {options.map((url) => {
                    const isActive = url === src;
                    return (
                      <button
                        key={url}
                        type="button"
                        className={`photo-swap-thumb${isActive ? ' is-active' : ''}`}
                        onClick={() => {
                          setSrc(url);
                          setOpen(false);
                        }}
                      >
                        <img src={url} alt="" loading="lazy" />
                        {isActive && (
                          <span className="photo-swap-thumb-check">
                            <Check size={10} strokeWidth={2.8} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="photo-swap" style={style}>
      <Photo src={src} alt={alt} fallback={fallback} fallbackGlyph={fallbackGlyph} />
      {overlay}
      <button
        ref={btnRef}
        type="button"
        className={`photo-swap-btn photo-swap-btn--${buttonTone}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Change photo"
        aria-expanded={open}
      >
        <ImageIcon size={12} strokeWidth={2.4} />
      </button>
      {popover}
    </div>
  );
}
