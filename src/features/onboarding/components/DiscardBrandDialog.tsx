/**
 * Throwing away a brand you never finished.
 *
 * Brand-first means walking away leaves a real, half-built brand behind. That
 * is only reassuring if getting rid of one is easy and honest — so the dialog
 * NAMES what goes rather than asking "are you sure?", which tells the user
 * nothing they can act on.
 */
import { DsConfirmDialog } from '@/shared/ds';

export interface DiscardBrandDialogProps {
  open: boolean;
  brandName: string;
  /** How much material would go with it. Omitted when there is none. */
  materialCount?: number;
  onCancel(): void;
  onConfirm(): void;
  busy?: boolean;
}

export function DiscardBrandDialog({
  open,
  brandName,
  materialCount = 0,
  onCancel,
  onConfirm,
  busy,
}: DiscardBrandDialogProps) {
  // "Delete Meridian and the 4 files you uploaded?" — the consequence stated,
  // so the answer is informed.
  const what =
    materialCount > 0
      ? `Delete ${brandName} and the ${materialCount} ${materialCount === 1 ? 'file' : 'files'} you uploaded?`
      : `Delete ${brandName}?`;

  return (
    <DsConfirmDialog
      open={open}
      title={what}
      description="This can't be undone. Nothing else in your workspace changes."
      confirmLabel={busy ? 'Deleting…' : 'Delete'}
      cancelLabel="Keep it"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
