/**
 * AssetPreview — the thumbnail well of a library card or row.
 *
 * Three states, and the middle one is the whole point: an <img> that has not
 * loaded yet shows a skeleton rather than a blank box, and an <img> that
 * FAILS shows the file's own glyph rather than the browser's broken-image
 * icon. A DAM whose thumbnails break looks broken; a DAM that draws a PDF
 * glyph for a PDF looks deliberate.
 *
 * Assets with no browser-renderable thumbnail (PDF, font, video, unknown)
 * never mount an <img> at all — pointing one at a PDF is how the broken icon
 * got there in the first place.
 */
import * as React from 'react';
import { FileText, FileType2, Film, File as FileIcon } from 'lucide-react';
import type { Asset } from '@/shared/types/brand';
import { previewKindFor, previewNeedsGround, assetExtension, type PreviewKind } from '../model';
import { measureArtworkTone, type ArtworkTone } from '../artworkTone';

const GLYPH: Record<Exclude<PreviewKind, 'raster' | 'vector'>, typeof FileText> = {
  pdf: FileText,
  font: FileType2,
  video: Film,
  file: FileIcon,
};

export interface AssetPreviewProps {
  asset: Pick<Asset, 'type' | 'url' | 'name' | 'metadata'>;
  /** `tile` fills its container (grid card); `inline` is the 44px row thumb. */
  variant?: 'tile' | 'inline';
}

export function AssetPreview({ asset, variant = 'tile' }: AssetPreviewProps) {
  const kind = previewKindFor(asset);
  const drawsImage = kind === 'raster' || kind === 'vector';
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'failed'>(
    drawsImage ? 'loading' : 'ready',
  );
  const [tone, setTone] = React.useState<ArtworkTone | null>(null);

  const measure = React.useCallback(() => {
    const img = imgRef.current;
    setTone(img ? measureArtworkTone(img) : null);
  }, []);

  // A new asset in the same slot (rename, category move, re-sort) has to
  // restart the load or it inherits the previous one's verdict.
  //
  // The `complete` check is not belt-and-braces: a CACHED image finishes
  // loading before React attaches onLoad, so the event never arrives and the
  // thumbnail stays at opacity 0 forever. Every asset already in the browser
  // cache — i.e. every asset on a second visit — hit this.
  React.useEffect(() => {
    if (!drawsImage) {
      setState('ready');
      return;
    }
    const img = imgRef.current;
    setTone(null);
    if (img?.complete) {
      setState(img.naturalWidth > 0 ? 'ready' : 'failed');
      if (img.naturalWidth > 0) measure();
    } else {
      setState('loading');
    }
  }, [asset.url, drawsImage, measure]);

  const showGlyph = !drawsImage || state === 'failed';

  if (showGlyph) {
    const glyphKind = kind === 'raster' || kind === 'vector' ? 'file' : kind;
    const Glyph = GLYPH[glyphKind];
    // Fall back to what we DO know about the file when it carries no
    // extension — a bare glyph tells the user nothing.
    const ext = assetExtension(asset) || (glyphKind === 'file' ? '' : glyphKind.toUpperCase());
    return (
      <div className={`fl-preview fl-preview--glyph fl-preview--${variant}`} aria-hidden>
        <Glyph strokeWidth={1.5} />
        {variant === 'tile' && ext && <span className="fl-preview-ext">{ext}</span>}
      </div>
    );
  }

  return (
    <div
      className={`fl-preview fl-preview--${variant}`}
      data-ground={previewNeedsGround(asset) && tone !== 'opaque' ? '' : undefined}
      data-tone={tone && tone !== 'opaque' ? tone : undefined}
    >
      {state === 'loading' && <div className="fl-preview-skeleton" aria-hidden />}
      <img
        ref={imgRef}
        src={asset.url}
        alt={asset.name}
        loading="lazy"
        decoding="async"
        draggable={false}
        data-state={state}
        onLoad={() => {
          setState('ready');
          measure();
        }}
        onError={() => setState('failed')}
      />
    </div>
  );
}
