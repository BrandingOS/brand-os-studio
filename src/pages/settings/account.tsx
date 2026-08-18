import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DsBanner, DsButton, DsInput } from '@/shared/ds';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection';
import { SettingsSections } from '@/features/settings/components/SettingsSections';
import {
  changeEmail,
  changePassword,
  isDevBypassSession,
  updateProfile,
} from '@/features/auth/account/accountActions';
import { DeleteAccountDialog } from '@/features/auth/deletion/DeleteAccountDialog';
import { useAccountDeletionStore } from '@/features/auth/deletion/accountDeletionStore';
import { daysUntil, formatPurgeDate } from '@/features/auth/deletion/accountDeletion';

/**
 * Account — who you are.
 *
 * Everything on this page writes something. The previous version was a
 * read-only display of the session object with a permanently disabled Delete
 * Account button, while /account-deletion publicly told users that button
 * worked.
 */
export default function AccountSettingsPage() {
  const user = useSessionStore((s) => s.user);
  const { logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [email, setEmail] = useState(user?.email ?? '');
  const [savingEmail, setSavingEmail] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const deletionAvailable = useAccountDeletionStore((s) => s.available);
  const pending = useAccountDeletionStore((s) => s.pending);

  // The store is the source of truth; re-seed the fields when it changes
  // (USER_UPDATED after a successful write, or a different user signing in).
  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  useEffect(() => setEmail(user?.email ?? ''), [user?.email]);

  const bypass = isDevBypassSession();

  const onSaveName = useCallback(async () => {
    setSavingName(true);
    const result = await updateProfile({ name: name.trim() });
    setSavingName(false);
    if (!result.error) toast.success('Name updated.');
    else toast.error('Could not update your name', { description: result.error });
  }, [name]);

  const onSaveEmail = useCallback(async () => {
    setSavingEmail(true);
    const result = await changeEmail(email);
    setSavingEmail(false);
    if (!result.error) {
      toast.success('Check your email', {
        description: `We sent a confirmation link to ${email}. The change takes effect once you follow it.`,
      });
    } else {
      toast.error('Could not change your email', { description: result.error });
    }
  }, [email]);

  const onSavePassword = useCallback(async () => {
    setSavingPassword(true);
    const result = await changePassword(current, next);
    setSavingPassword(false);
    if (!result.error) {
      setCurrent('');
      setNext('');
      toast.success('Password updated.');
    } else {
      toast.error('Could not update your password', { description: result.error });
    }
  }, [current, next]);

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const nameDirty = name.trim().length > 0 && name.trim() !== (user?.name ?? '');
  const emailDirty = email.trim().length > 0 && email.trim() !== (user?.email ?? '');

  return (
    <SettingsSections>
      {bypass && (
        <DsBanner tone="warning">
          You are in the dev bypass session, which has no Supabase session
          behind it — nothing on this page can be saved.
        </DsBanner>
      )}

      <SettingsSection
        title="Profile"
        description="How you appear across BrandOS."
      >
        <div className="settings-identity">
          <span className="settings-avatar" aria-hidden="true">
            {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
          </span>
          <div>
            <div className="settings-identity-name">{user?.name ?? 'Guest'}</div>
            <div className="settings-identity-email">{user?.email ?? 'Not signed in'}</div>
          </div>
        </div>

        <SettingsRow label="Display name" stacked>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <DsInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={bypass}
              style={{ flex: 1 }}
            />
            <DsButton
              onClick={onSaveName}
              disabled={!nameDirty || savingName || bypass}
            >
              {savingName ? 'Saving…' : 'Save'}
            </DsButton>
          </div>
        </SettingsRow>

        <SettingsRow
          label="Email"
          hint="Changing this sends a confirmation link to the new address. The change takes effect once you follow it."
          stacked
        >
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <DsInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={bypass}
              style={{ flex: 1 }}
            />
            <DsButton
              tone="secondary"
              onClick={onSaveEmail}
              disabled={!emailDirty || savingEmail || bypass}
            >
              {savingEmail ? 'Sending…' : 'Change'}
            </DsButton>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Security"
        description="Changing your password asks for the current one first, so an unattended signed-in browser cannot be used to take the account over."
      >
        <SettingsRow label="Current password" stacked>
          <DsInput
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            disabled={bypass}
          />
        </SettingsRow>
        <SettingsRow label="New password" stacked>
          <DsInput
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            disabled={bypass}
          />
        </SettingsRow>
        <SettingsRow>
          <DsButton
            onClick={onSavePassword}
            disabled={!current || next.length < 6 || savingPassword || bypass}
          >
            {savingPassword ? 'Updating…' : 'Update password'}
          </DsButton>
        </SettingsRow>
        <SettingsRow
          label="Sign out"
          hint="Ends this session on this device."
        >
          <DsButton tone="tertiary" onClick={() => void logout()}>
            Sign out
          </DsButton>
        </SettingsRow>
      </SettingsSection>

      {deletionAvailable && (
        <SettingsSection
          title="Danger zone"
          description="Deleting your account removes it and every brand you own. Billing records are kept for up to 7 years as required by tax law."
          danger
        >
          {pending ? (
            <SettingsRow
              label={`Scheduled for deletion on ${formatPurgeDate(pending.purgeAfter)}`}
              hint={`${daysUntil(pending.purgeAfter)} days left. Use the banner at the bottom of the screen to cancel.`}
            />
          ) : (
            <SettingsRow
              label="Delete this account"
              hint="You get 7 days to change your mind. Nothing is destroyed before then."
            >
              <DsButton tone="danger" onClick={() => setDeleteOpen(true)} disabled={bypass}>
                Delete account
              </DsButton>
            </SettingsRow>
          )}
        </SettingsSection>
      )}

      <DeleteAccountDialog
        open={deleteOpen}
        email={user?.email ?? ''}
        onClose={() => setDeleteOpen(false)}
      />
    </SettingsSections>
  );
}
