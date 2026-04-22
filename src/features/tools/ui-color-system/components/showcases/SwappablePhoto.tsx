/**
 * SwappablePhoto — Photo with a small hover affordance that opens a
 * popover. The popover can do two things:
 *   1. Pick from a curated pool of Unsplash URLs (always available).
 *   2. Live-search Unsplash by keyword (when VITE_UNSPLASH_ACCESS_KEY
 *      is configured — the same key the bento flow uses).
 */
import { useEffect, useRef, useState } from 'react';
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
}

export function SwappablePhoto({
  defaultSrc,
  alternatives,
  alt,
  fallback,
  fallbackGlyph,
  style,
  buttonTone = 'dark',
}: SwappablePhotoProps) {
  const [src, setSrc] = useState(defaultSrc);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const searchIdRef = useRef(0);

  const unsplashConfigured = unsplashProvider.isConfigured();
  const options = Array.from(new Set([src, defaultSrc, ...alternatives]));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  // Debounced search-on-type.
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

  return (
    <div ref={wrapRef} className="photo-swap" style={style}>
      <Photo src={src} alt={alt} fallback={fallback} fallbackGlyph={fallbackGlyph} />
      <button
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
      {open && (
        <div className="photo-swap-popover" onClick={(e) => e.stopPropagation()}>
          <div className="photo-swap-search">
            <Search size={12} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                unsplashConfigured
                  ? 'Search Unsplash…'
                  : 'Unsplash key missing'
              }
              disabled={!unsplashConfigured}
              spellCheck={false}
              autoComplete="off"
            />
            {searching && <Loader2 size={12} className="photo-swap-spin" />}
          </div>

          {query.trim() ? (
            <>
              {searchError && (
                <p className="photo-swap-empty">{searchError}</p>
              )}
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
        </div>
      )}
    </div>
  );
}
