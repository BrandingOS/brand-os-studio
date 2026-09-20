// Uploads and the brand's library.
//
// The Insert panel this replaces offered an "Image" row that inserted a
// hardcoded `placehold.co` URL and an "SVG" row that inserted a
// Wikipedia file — both labelled "Phase 5a stub". There was no file
// picker in the editor at all, and the brand's own library of images was
// visible in the brand panel as inert thumbnails.
//
// Uploads are read as data URLs and land in the DOCUMENT. That is the
// honest v1: the brand Library's own upload path also stores data URLs,
// and wiring a storage upload from here would need an asset-id form of
// `ImageLayer.src` that the renderer does not resolve yet. "Save to
// brand assets" is the seam where that lands.

import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DsButton } from '@/shared/ds';
import type { Brand } from '@/shared/types/brand';
import { InsertTile } from './InsertTile';
import type { InsertRequest } from '../ops/insertRequest';
import { assetUrl } from './BrandPanel';

interface Props {
  brand?: Brand;
  readOnly: boolean;
  insert: (request: InsertRequest) => void;
}

/** Above this, a data URL in the document is a problem, not a convenience. */
const MAX_BYTES = 5 * 1024 * 1024;

export function UploadsPanel({ brand, readOnly, insert }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<{ id: string; url: string; name: string }[]>([]);

  const accept = useCallback((files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} isn’t an image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 5 MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () =>
        setUploads((prev) => [
          { id: `${file.name}-${file.lastModified}`, url: String(reader.result), name: file.name },
          ...prev,
        ]);
      reader.onerror = () => toast.error(`Couldn’t read ${file.name}.`);
      reader.readAsDataURL(file);
    }
  }, []);

  const library = (brand?.brandAssets ?? []).filter(
    (a) => a.kind === 'image' || a.kind === 'icon',
  );

  return (
    <>
      <section className="st-section">
        <DsButton
          tone="primary"
          size="sm"
          style={{ width: '100%' }}
          disabled={readOnly}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} strokeWidth={1.8} aria-hidden /> Upload an image
        </DsButton>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            accept(e.target.files);
            // Reset so re-picking the same file fires change again.
            e.target.value = '';
          }}
        />
        <p className="st-tile-caption" style={{ textAlign: 'left', marginTop: 6 }}>
          Or drop images straight onto the canvas.
        </p>
      </section>

      {uploads.length > 0 ? (
        <section className="st-section">
          <p className="st-section-label">This session</p>
          <div className="st-tile-grid">
            {uploads.map((u) => (
              <InsertTile
                key={u.id}
                label={u.name}
                disabled={readOnly}
                request={{ kind: 'image', src: u.url }}
                onInsert={insert}
              >
                <img src={u.url} alt="" />
              </InsertTile>
            ))}
          </div>
        </section>
      ) : null}

      <section className="st-section">
        <p className="st-section-label">Brand library</p>
        {library.length === 0 ? (
          <p className="st-tile-caption" style={{ textAlign: 'left' }}>
            Nothing in this brand’s library yet.
          </p>
        ) : (
          <div className="st-tile-grid">
            {library.slice(0, 60).map((asset) => {
              const url = assetUrl(asset);
              if (!url) return null;
              return (
                <InsertTile
                  key={asset.id}
                  label={asset.name}
                  disabled={readOnly}
                  request={{ kind: 'image', src: url }}
                  onInsert={insert}
                >
                  <img src={url} alt="" loading="lazy" />
                </InsertTile>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
