// ReferenceStrip — the images the user attached, in the order they will be sent.
//
// Order matters: a model with room for two references keeps the first two, so
// the strip is reorderable and says plainly when the active model will ignore
// or truncate the list. Silence there costs a paid generation.

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import type { AttachedReference } from '@/features/image-generation';

export type { AttachedReference };

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
    <div className="flex flex-col gap-1 px-2 pt-2" data-reference-strip>
      <div className="flex flex-wrap gap-1">
        {references.map((ref, i) => {
          const dropped = ignored || (overflow && i >= maxReferences);
          return (
            <figure
              key={ref.id}
              data-reference-chip={ref.id}
              data-dropped={dropped || undefined}
              title={dropped ? `${ref.fileName} — not used by this model` : ref.fileName}
              className="relative m-0 h-11 w-11 overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--border)', opacity: dropped ? 0.4 : 1 }}
            >
              <img src={ref.previewUrl} alt="" className="h-full w-full object-cover" />
              <figcaption
                className="absolute left-0 top-0 px-1 text-[9px] font-medium leading-[13px]"
                style={{ background: 'color-mix(in oklab, #000 55%, transparent)', color: '#fff' }}
              >
                {i + 1}
              </figcaption>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-px py-px" style={{ background: 'color-mix(in oklab, #000 55%, transparent)' }}>
                <RefAction disabled={disabled || i === 0} onClick={() => onMove(ref.id, -1)} label={`Move ${ref.fileName} earlier`}>
                  <ChevronLeft size={10} strokeWidth={2} aria-hidden />
                </RefAction>
                <RefAction disabled={disabled || i === references.length - 1} onClick={() => onMove(ref.id, 1)} label={`Move ${ref.fileName} later`}>
                  <ChevronRight size={10} strokeWidth={2} aria-hidden />
                </RefAction>
                <RefAction disabled={disabled} onClick={() => onRemove(ref.id)} label={`Remove ${ref.fileName}`}>
                  <X size={10} strokeWidth={2} aria-hidden />
                </RefAction>
              </div>
            </figure>
          );
        })}
      </div>
      {ignored ? (
        <p className="m-0 text-[10px]" role="status" style={{ color: 'var(--text-muted)' }}>
          This model is prompt-only — attached images will not be used.
        </p>
      ) : overflow ? (
        <p className="m-0 text-[10px]" role="status" style={{ color: 'var(--text-muted)' }}>
          This model takes {maxReferences}. The first {maxReferences} will be sent.
        </p>
      ) : null}
    </div>
  );
}

function RefAction({ children, disabled, onClick, label }: {
  children: React.ReactNode; disabled?: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="rounded p-px text-white transition-opacity disabled:opacity-30"
    >
      {children}
    </button>
  );
}
