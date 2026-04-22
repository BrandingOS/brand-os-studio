/**
 * Photo — `<img>` wrapper with a graceful fallback.
 *
 * If the Unsplash URL fails (offline, CDN hiccup, corporate proxy) we
 * still render a gradient panel tinted by the palette so the layout
 * doesn't collapse. The fallback uses the brand colors the caller
 * passes, so the card keeps its on-palette look even without photos.
 */
import { useState } from 'react';

export interface PhotoProps {
  src: string;
  alt: string;
  /** Palette colors for the fallback gradient. */
  fallback: { from: string; to: string };
  /** Optional large centered glyph shown on the fallback. */
  fallbackGlyph?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Photo({ src, alt, fallback, fallbackGlyph, className, style }: PhotoProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: `linear-gradient(135deg, ${fallback.from}, ${fallback.to})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Instrument Serif", serif',
          fontSize: 72,
          color: 'rgba(0, 0, 0, 0.12)',
        }}
        aria-label={alt}
      >
        {fallbackGlyph ?? ''}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}
