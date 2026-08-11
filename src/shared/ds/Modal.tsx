import React, { useEffect } from 'react';
import { CloseIcon } from './icons';
import { DsButton } from './Button';

/**
 * Modal: 35% scrim with 8px backdrop blur; the panel scales in (0.98 → 1)
 * with a fade at 360ms — never slides up. Bold title, eyebrow above, one
 * solid primary bottom-right. Rendered in place (no portal) so tokens
 * resolve in the local theme scope.
 */

export interface DsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
  /** Bottom-right actions — put the one solid primary last. */
  actions?: React.ReactNode;
  /** Bottom-left quiet actions (e.g. Skip · Show me more). */
  secondaryActions?: React.ReactNode;
}

export function DsModal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  actions,
  secondaryActions,
}: DsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ds-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ds-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {eyebrow && <div className="ds-eyebrow" style={{ marginBottom: 4, fontSize: '10.5px' }}>{eyebrow}</div>}
            <h2 className="ds-modal-title">{title}</h2>
          </div>
          <button type="button" className="ds-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>
        {children}
        {(actions || secondaryActions) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>{secondaryActions}</div>
            <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface DsConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive actions always get a confirm step. */
export function DsConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: DsConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="ds-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="ds-confirm" role="alertdialog" aria-modal="true" aria-label={title}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-text)' }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ds-text-secondary)' }}>
          {description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <DsButton tone="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </DsButton>
          <DsButton tone="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </DsButton>
        </div>
      </div>
    </div>
  );
}
