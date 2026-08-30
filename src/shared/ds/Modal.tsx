import React, { useEffect } from 'react';
import { CloseIcon } from './icons';
import { DsButton } from './Button';

/**
 * Modal: 35% scrim with 8px backdrop blur; the panel scales in (0.98 → 1)
 * with a fade at 360ms — never slides up. Bold title, eyebrow above, one
 * solid primary bottom-right. Rendered in place (no portal) so tokens
 * resolve in the local theme scope.
 *
 * The panel is THREE bands and only the middle one scrolls: `.ds-modal-head`
 * (title + close), `.ds-modal-body` (the caller's children), and
 * `.ds-modal-foot` (the actions). Before this the whole panel was one
 * scroller, so a long modal laid its own primary button out BELOW the box —
 * the Brand Kit's "Export everything" measured at y≈1024 in a 900px viewport
 * with nothing on screen to say more content existed (QA Q4). An action the
 * user cannot see is an action that does not exist, so the action row is now
 * always inside the box, at the bottom, with a hairline that says the body
 * continues past it.
 *
 * Body scroll is locked while any modal is open — the same wheel that
 * scrolled the dialog also scrolled the page behind it by 3300px. The lock is
 * ref-counted so a confirm dialog opened ON TOP of a modal does not release
 * it when it closes.
 */

let scrollLocks = 0;
let restoreBodyOverflow = '';
let restoreBodyPaddingRight = '';

function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  scrollLocks += 1;
  if (scrollLocks === 1) {
    const body = document.body;
    restoreBodyOverflow = body.style.overflow;
    restoreBodyPaddingRight = body.style.paddingRight;
    // Removing the scrollbar reflows the page under the scrim; pad by its
    // width so nothing behind the modal jumps sideways as it opens.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    body.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) {
      document.body.style.overflow = restoreBodyOverflow;
      document.body.style.paddingRight = restoreBodyPaddingRight;
    }
  };
}

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

  useEffect(() => {
    if (!open) return undefined;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ds-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ds-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ds-modal-head">
          <div>
            {eyebrow && <div className="ds-eyebrow" style={{ marginBottom: 4, fontSize: '10.5px' }}>{eyebrow}</div>}
            <h2 className="ds-modal-title">{title}</h2>
          </div>
          <button type="button" className="ds-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
        {(actions || secondaryActions) && (
          <div className="ds-modal-foot">
            <div className="ds-modal-foot-quiet">{secondaryActions}</div>
            <div className="ds-modal-foot-main">{actions}</div>
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
  useEffect(() => {
    if (!open) return undefined;
    return lockBodyScroll();
  }, [open]);

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
