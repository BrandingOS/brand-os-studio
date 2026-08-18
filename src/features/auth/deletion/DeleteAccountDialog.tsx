import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DsButton, DsInput, DsModal, DsSkeleton } from '@/shared/ds';
import {
  fetchDeletionPreview,
  formatPurgeDate,
  requestAccountDeletion,
  type DeletionPreview,
} from './accountDeletion';
import { useAccountDeletionStore } from './accountDeletionStore';

/**
 * The confirmation. It has to say what will actually be destroyed, in this
 * user's own terms, before they can agree to it.
 *
 * The counts come from `account_deletion_preview()` rather than being stitched
 * together client-side from RLS-filtered reads — the server is the only place
 * that can see the whole blast radius, including a shared workspace that will
 * be handed to someone else rather than deleted.
 */
export function DeleteAccountDialog({
  open,
  email,
  onClose,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const setState = useAccountDeletionStore((s) => s.setState);

  useEffect(() => {
    if (!open) {
      setTyped('');
      setPreview(null);
      return;
    }
    let alive = true;
    setLoading(true);
    void fetchDeletionPreview()
      .then((p) => {
        if (alive) setPreview(p);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const confirmed = typed.trim().toLowerCase() === email.trim().toLowerCase();

  const onConfirm = useCallback(async () => {
    setBusy(true);
    try {
      const pending = await requestAccountDeletion();
      setState(true, pending);
      onClose();
      toast.success('Your account is scheduled for deletion.', {
        description: `You can cancel any time before ${formatPurgeDate(pending.purgeAfter)}.`,
      });
    } catch (err) {
      toast.error('Could not schedule the deletion', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }, [onClose, setState]);

  if (!open) return null;

  const grace = preview?.graceDays ?? 7;

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Danger zone"
      title="Delete your account"
      actions={
        <>
          <DsButton tone="tertiary" onClick={onClose} disabled={busy}>
            Keep my account
          </DsButton>
          <DsButton tone="danger" onClick={onConfirm} disabled={!confirmed || busy}>
            {busy ? 'Scheduling…' : `Delete in ${grace} days`}
          </DsButton>
        </>
      }
    >
      <p>
        Your account and <strong>the brands you own</strong> will be permanently
        deleted after {grace} days. Nothing happens immediately — you can sign in
        and cancel at any point in that window.
      </p>

      {loading && (
        <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
          <DsSkeleton height={12} />
          <DsSkeleton height={12} width="70%" />
        </div>
      )}

      {preview && (
        <>
          <p style={{ marginTop: 14 }}>This will delete:</p>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>
              <strong>{preview.brandsDeleted}</strong>{' '}
              {preview.brandsDeleted === 1 ? 'brand' : 'brands'}
              {preview.brandNames.length > 0 && (
                <> — {preview.brandNames.slice(0, 5).join(', ')}
                  {preview.brandNames.length > 5 && ` and ${preview.brandNames.length - 5} more`}
                </>
              )}
            </li>
            <li>
              <strong>{preview.designsDeleted}</strong>{' '}
              {preview.designsDeleted === 1 ? 'design' : 'designs'} and{' '}
              <strong>{preview.assetsDeleted}</strong> uploaded{' '}
              {preview.assetsDeleted === 1 ? 'file' : 'files'}
            </li>
            <li>Your profile, sign-in methods and session history</li>
            {preview.creditsForfeited > 0 && (
              <li>
                <strong>{preview.creditsForfeited}</strong> unused generation credits
              </li>
            )}
          </ul>

          {preview.workspacesTransferred > 0 && (
            <p style={{ marginTop: 14 }}>
              {preview.workspacesTransferred === 1 ? 'One workspace' : `${preview.workspacesTransferred} workspaces`}{' '}
              you own {preview.workspacesTransferred === 1 ? 'has' : 'have'} other
              members, so {preview.workspacesTransferred === 1 ? 'it' : 'they'} will be
              handed over rather than deleted
              {preview.transferTargets[0]?.newOwnerEmail
                ? ` — to ${preview.transferTargets[0].newOwnerEmail}`
                : ''}
              . Their brands are not affected.
            </p>
          )}

          <p style={{ marginTop: 14 }}>
            Billing records are kept for up to 7 years as required by tax law.
          </p>
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <DsInput
          label={`Type ${email} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={email}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </DsModal>
  );
}
