import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { DsBanner } from '@/shared/ds';
import { useAccountDeletionStore } from './accountDeletionStore';
import { cancelAccountDeletion, daysUntil, formatPurgeDate } from './accountDeletion';
import '@/features/settings/settings.css';

/**
 * A pending deletion follows the user everywhere until they act on it.
 *
 * The grace period only means something if the user can find their way back
 * out of it, so this is mounted app-wide (in AuthProvider, beside the
 * dev-bypass badge) rather than only on the settings page they may never
 * return to.
 */
export function AccountDeletionBanner() {
  const pending = useAccountDeletionStore((s) => s.pending);
  const clear = useAccountDeletionStore((s) => s.clear);
  const [busy, setBusy] = useState(false);

  const onCancel = useCallback(async () => {
    setBusy(true);
    try {
      await cancelAccountDeletion();
      clear();
      toast.success('Your account is no longer scheduled for deletion.');
    } catch (err) {
      toast.error('Could not cancel the deletion', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }, [clear]);

  if (!pending) return null;

  const days = daysUntil(pending.purgeAfter);
  const when =
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

  return (
    // DsBanner already carries role="status", so this wrapper must not repeat it.
    <div className="account-deletion-banner" data-workspace>
      <DsBanner
        tone="danger"
        actionLabel={busy ? 'Cancelling…' : 'Keep my account'}
        onAction={busy ? undefined : onCancel}
      >
        Your account and the brands you own are scheduled for deletion{' '}
        {when} — on {formatPurgeDate(pending.purgeAfter)}.
      </DsBanner>
    </div>
  );
}
