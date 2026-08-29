// ReferenceStrip — the images the user attached, what each one is FOR, and the
// order they will be sent in.
//
// Two things this has to communicate, both of which cost real money when they
// are left implicit:
//
//   PURPOSE. A style reference and a subject reference are opposite
//   instructions — "take the light and the mood, ignore the object" versus
//   "this IS the object, reproduce it exactly". They used to be one
//   undifferentiated list, so both received the same sentence and the model was
//   invited to redesign the product and to copy the mood board's subject.
//
//   ORDER. A model with room for two references keeps the first two, so the
//   strip is reorderable and says plainly when the active model will ignore or
//   truncate the list. Silence there costs a paid generation.

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import type { AttachedReference } from '@/features/image-generation';

export type { AttachedReference };

export type ReferenceUse = 'style' | 'subject';

export interface PanelReference extends AttachedReference {
  use: ReferenceUse;
}

const USE_LABEL: Record<ReferenceUse, string> = { subject: 'Subject', style: 'Style' };
const USE_HINT: Record<ReferenceUse, string> = {
  subject: 'Treated as the real subject — reproduced faithfully. Click to make it a style reference.',
  style: 'Used for look and feel only; its subject is never copied. Click to make it a subject reference.',
};

export function ReferenceStrip({
  references, maxReferences, onRemove, onMove, onToggleUse, disabled,
}: {
  references: PanelReference[];
  maxReferences: number;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onToggleUse: (id: string) => void;
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
              data-reference-use={ref.use}
              data-dropped={dropped || undefined}
              title={dropped ? `${ref.fileName} — not used by this model` : ref.fileName}
              className="relative m-0 h-11 w-11 overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--border)', opacity: dropped ? 0.4 : 1 }}
            >
              <img src={ref.previewUrl} alt="" className="h-full w-full object-cover" />
              {/* The badge is the control: purpose is the thing most likely to be
                  wrong, and correcting it should cost a click, not a re-upload. */}
              <button
                type="button"
                data-reference-use-toggle
                disabled={disabled}
                onClick={() => onToggleUse(ref.id)}
                aria-label={`${ref.fileName}: ${USE_LABEL[ref.use]} reference. ${USE_HINT[ref.use]}`}
                title={USE_HINT[ref.use]}
                className="absolute left-0 top-0 px-1 text-[9px] font-medium leading-[13px] transition-opacity hover:opacity-80"
                style={{
                  background: ref.use === 'subject'
                    ? 'color-mix(in oklab, var(--accent) 85%, #000)'
                    : 'color-mix(in oklab, #000 62%, transparent)',
                  color: '#fff',
                }}
              >
                {USE_LABEL[ref.use]}
              </button>
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
