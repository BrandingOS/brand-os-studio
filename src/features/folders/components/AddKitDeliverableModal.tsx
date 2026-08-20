/**
 * AddKitDeliverableModal — upload your own finished deliverable into a slot.
 *
 * This is the ONLY way a file enters the Kit, and it is deliberately not a
 * generic uploader: you choose WHICH deliverable the file is (Business Card,
 * Letterhead, Favicon…) and it becomes the version the brand owns for that
 * slot. A file with no slot is a Library asset, and that is where it belongs.
 *
 * Slots already in the kit are still offered — replacing the version you own
 * is the common case once a printer sends back the real artwork.
 */
import * as React from 'react';
import { Check, Upload } from 'lucide-react';
import { DsButton, DsModal } from '@/shared/ds';
import type { DeliverableDef } from '@/features/brand-kit/kit/registry';
import type { DeliverableKey } from '@/features/brand-kit/kit/types';
import { sectionLabel } from '../useKitLibrary';

const ACCEPT = 'image/*,application/pdf,video/mp4';

export interface AddKitDeliverableModalProps {
  open: boolean;
  onClose: () => void;
  slots: DeliverableDef[];
  /** Slots that already hold something, so the list can say so. */
  filledKeys: ReadonlySet<DeliverableKey>;
  onUpload: (key: DeliverableKey, file: File) => Promise<void>;
  busy: boolean;
  /** Pre-selected slot, when opened from a deliverable's own menu. */
  initialKey?: DeliverableKey | null;
}

export function AddKitDeliverableModal({
  open,
  onClose,
  slots,
  filledKeys,
  onUpload,
  busy,
  initialKey,
}: AddKitDeliverableModalProps) {
  const [selected, setSelected] = React.useState<DeliverableKey | null>(initialKey ?? null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setSelected(initialKey ?? null);
  }, [open, initialKey]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, DeliverableDef[]>();
    for (const def of slots) {
      const label = sectionLabel(def);
      const bucket = map.get(label);
      if (bucket) bucket.push(def);
      else map.set(label, [def]);
    }
    return [...map.entries()];
  }, [slots]);

  const send = async (file: File) => {
    if (!selected) return;
    await onUpload(selected, file);
    onClose();
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Brand kit"
      title="Add a deliverable"
      actions={
        <>
          <DsButton tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            size="sm"
            disabled={!selected || busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={13} strokeWidth={1.8} />
            Choose file
          </DsButton>
        </>
      }
    >
      <p className="fl-kit-add-hint">
        Pick what this file is. It becomes the version your brand owns for that deliverable —
        your brand's colours, type and logos are not changed.
      </p>

      <div className="fl-kit-slots" role="radiogroup" aria-label="Deliverable">
        {grouped.map(([section, defs]) => (
          <div key={section} className="fl-kit-slot-group">
            <div className="panel-group-label">{section}</div>
            {defs.map((def) => (
              <button
                key={def.key}
                type="button"
                role="radio"
                aria-checked={selected === def.key}
                className="fl-kit-slot"
                data-selected={selected === def.key || undefined}
                onClick={() => setSelected(def.key)}
              >
                <span className="fl-kit-slot-name">{def.label}</span>
                {filledKeys.has(def.key) && <span className="fl-kit-slot-tag">In kit</span>}
                {selected === def.key && <Check size={14} strokeWidth={2.2} aria-hidden />}
              </button>
            ))}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void send(file);
        }}
      />
    </DsModal>
  );
}
