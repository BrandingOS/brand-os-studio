// ReferenceStrip — the images the user attached, in the order they will be sent.
//
// Order matters: a model with room for two references keeps the first two, so
// the strip is reorderable and says plainly when the active model will ignore
// or truncate the list. Silence there costs a paid generation.

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AttachedReference {
  id: string;
  path: string;
  previewUrl: string;
  fileName: string;
}

export function ReferenceStrip({
  references, maxReferences, onRemove, onMove, disabled,
}: {
  references: AttachedReference[];
  maxReferences: number;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  disabled?: boolean;
}) {
  if (references.length === 0) return null;
  const overflow = maxReferences > 0 && references.length > maxReferences;
  const ignored = maxReferences === 0;

  return (
    <div className="is-refstrip" data-reference-strip>
      <div className="is-refstrip-items">
        {references.map((ref, i) => {
          const dropped = ignored || (overflow && i >= maxReferences);
          return (
            <figure
              key={ref.id}
              className="is-refchip"
              data-reference-chip={ref.id}
              data-dropped={dropped || undefined}
              title={dropped ? `${ref.fileName} — not used by this model` : ref.fileName}
            >
              <img src={ref.previewUrl} alt="" />
              <figcaption>{i + 1}</figcaption>
              <div className="is-refchip-actions">
                <button type="button" disabled={disabled || i === 0} onClick={() => onMove(ref.id, -1)} aria-label={`Move ${ref.fileName} earlier`}>
                  <ChevronLeft size={11} strokeWidth={2} aria-hidden />
                </button>
                <button type="button" disabled={disabled || i === references.length - 1} onClick={() => onMove(ref.id, 1)} aria-label={`Move ${ref.fileName} later`}>
                  <ChevronRight size={11} strokeWidth={2} aria-hidden />
                </button>
                <button type="button" disabled={disabled} onClick={() => onRemove(ref.id)} aria-label={`Remove ${ref.fileName}`}>
                  <X size={11} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </figure>
          );
        })}
      </div>
      {ignored ? (
        <p className="is-refstrip-note" role="status">
          This model is prompt-only — attached images will not be used.
        </p>
      ) : overflow ? (
        <p className="is-refstrip-note" role="status">
          This model takes {maxReferences}. The first {maxReferences} will be sent.
        </p>
      ) : null}
    </div>
  );
}
