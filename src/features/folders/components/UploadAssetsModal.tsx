/**
 * UploadAssetsModal — uploading, on demand.
 *
 * The dropzone used to sit on the page permanently and eat half the
 * viewport. It lives here now: a DsModal that opens from the toolbar's
 * "Upload assets" button, keeps drag & drop, and closes itself when the
 * batch lands. Files picked while a batch is running are queued by the
 * caller's promise chain, so the modal only needs one busy state.
 */
import * as React from 'react';
import { Upload } from 'lucide-react';
import { DsButton, DsDropZone, DsModal, DsProgress } from '@/shared/ds';
import { dragCarriesFiles } from '../model';

const ACCEPT = 'image/*,application/pdf,.svg,.woff,.woff2,.ttf,.otf';

export interface UploadAssetsModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  uploading: boolean;
  progress: { done: number; total: number } | null;
}

export function UploadAssetsModal({
  open,
  onClose,
  onUpload,
  uploading,
  progress,
}: UploadAssetsModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const send = async (files: File[]) => {
    if (files.length === 0) return;
    await onUpload(files);
    onClose();
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Brand library"
      title="Upload assets"
      actions={
        <DsButton tone="secondary" size="sm" onClick={onClose} disabled={uploading}>
          Close
        </DsButton>
      }
    >
      <DsDropZone
        className="fl-upload-zone"
        data-dragging={dragging || undefined}
        data-busy={uploading || undefined}
        onDragOver={(e) => {
          if (!dragCarriesFiles(e.dataTransfer?.types)) return;
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (uploading) return;
          void send(Array.from(e.dataTransfer.files));
        }}
      >
        <div className="fl-upload-icon" aria-hidden>
          <Upload size={18} strokeWidth={1.6} />
        </div>
        <p className="fl-upload-title">
          {dragging ? 'Drop to upload' : 'Drag files here, or choose from your device'}
        </p>
        <p className="fl-upload-hint">
          PNG · JPG · SVG · PDF · fonts — categories are detected automatically
        </p>
        <DsButton tone="primary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          Choose files
        </DsButton>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            void send(files);
          }}
        />
      </DsDropZone>

      {progress && (
        <div className="fl-upload-progress">
          <DsProgress
            value={progress.done / progress.total}
            label="Uploading"
            meta={`${progress.done} / ${progress.total}`}
          />
        </div>
      )}
    </DsModal>
  );
}
