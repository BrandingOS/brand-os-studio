/**
 * SwappablePhoto — Photo with a small hover affordance that opens a
 * grid of alternative Unsplash photos. Selection is local state; the
 * component is self-contained so tiles can use it as a drop-in
 * replacement for <Photo>.
 */
import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Check } from 'lucide-react';

import { Photo } from './Photo';

export interface SwappablePhotoProps {
  /** Initial photo URL. */
  defaultSrc: string;
  /** Pool of alternatives (Unsplash URLs, already cropped). */
  alternatives: readonly string[];
  alt: string;
  fallback: { from: string; to: string };
  fallbackGlyph?: string;
  /** Forwarded to the inner <Photo> so the caller controls sizing. */
  style?: React.CSSProperties;
  /** Controls the contrast of the "Change photo" button icon. */
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
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Include the current src + the default as the first chips so the
  // user can always revert.
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

  return (
    <div
      ref={wrapRef}
      className="photo-swap"
      style={style}
    >
      <Photo
        src={src}
        alt={alt}
        fallback={fallback}
        fallbackGlyph={fallbackGlyph}
      />
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
          <div className="photo-swap-popover-title">Choose photo</div>
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
        </div>
      )}
    </div>
  );
}
