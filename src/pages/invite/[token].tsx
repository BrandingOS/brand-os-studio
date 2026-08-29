// ============================================================================
// /invite/:token — the one public page in the access system.
//
// It is deliberately outside ProtectedRoute: the whole point is that someone who does not
// yet have an account can see who invited them and what they are being invited to, before
// signing up. `invitation_preview` is the only thing anon may call, and it answers
// `{valid:false}` identically for never-existed, revoked, expired and already-accepted, so
// this page cannot be used to probe for real workspaces.
//
// The token lives only in the URL, and the URL is replaced the moment it is spent.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAccessStore } from '@/shared/access';
import { DsButton, DsSkeleton, BrandMark } from '@/shared/ds';
import { BRAND_ROLE_LABEL, WORKSPACE_ROLE_LABEL, type BrandRole, type WorkspaceRole } from '@/shared/access';

type Preview = {
  valid: boolean;
  workspaceName?: string;
  inviterName?: string;
  role?: WorkspaceRole;
  brandAccessMode?: 'all' | 'selected';
  brandCount?: number;
  brandNames?: string[];
  message?: string | null;
  expiresAt?: string;
};

const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as unknown as {
    rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc(name, args);

export default function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const hydrateAccess = useAccessStore((s) => s.hydrate);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [joining, setJoining] = useState(false);
  const [mismatch, setMismatch] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await rpc('invitation_preview', { _token: token });
      if (!cancelled) setPreview((data as Preview) ?? { valid: false });
    })();
    return () => { cancelled = true; };
  }, [token]);

  const accept = useCallback(async () => {
    setJoining(true);
    try {
      const { data, error } = await rpc('accept_invitation', { _token: token });
      const result = data as { ok?: boolean; error?: string; invitedEmail?: string; workspaceId?: string };
      if (error || !result) {
        toast.error('Could not accept that invitation.');
        return;
      }
      if (result.error === 'email_mismatch') {
        setMismatch(result.invitedEmail ?? null);
        return;
      }
      if (result.error === 'already_member') {
        toast.info('You’re already in this workspace.');
        navigate('/dashboard', { replace: true });
        return;
      }
      if (!result.ok) {
        setPreview({ valid: false });
        return;
      }
      await hydrateAccess();
      if (result.workspaceId) await useAccessStore.getState().setCurrentWorkspace(result.workspaceId);
      toast.success(`You’ve joined ${preview?.workspaceName ?? 'the workspace'}.`);
      // The token is spent; do not leave it in history for the back button.
      navigate('/dashboard', { replace: true });
    } finally {
      setJoining(false);
    }
  }, [token, navigate, hydrateAccess, preview?.workspaceName]);

  if (!preview || isLoading) {
    return (
      <Shell>
        <DsSkeleton height={22} />
        <DsSkeleton height={16} />
        <DsSkeleton height={40} />
      </Shell>
    );
  }

  if (!preview.valid) {
    return (
      <Shell>
        <h1 className="inv-title">This invitation isn’t valid any more</h1>
        <p className="inv-body">
          It may have been used, revoked, or simply expired. Ask whoever invited you to send
          a new one.
        </p>
        <DsButton tone="secondary" onClick={() => navigate('/login')}>Go to sign in</DsButton>
      </Shell>
    );
  }

  const what = describe(preview);

  if (mismatch) {
    return (
      <Shell>
        <h1 className="inv-title">This invitation is for a different address</h1>
        <p className="inv-body">
          It was sent to <strong>{mismatch}</strong>. Sign in with that address to accept it.
        </p>
        <DsButton
          tone="primary"
          onClick={async () => { await supabase.auth.signOut(); navigate(`/login?next=/invite/${token}`); }}
        >
          Switch account
        </DsButton>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="inv-title">
        {preview.inviterName} invited you to {preview.workspaceName}
      </h1>
      <p className="inv-body">{what}</p>
      {preview.message && <blockquote className="inv-message">“{preview.message}”</blockquote>}

      {isAuthenticated ? (
        <DsButton tone="primary" onClick={accept} disabled={joining}>
          {joining ? 'Joining…' : 'Join'}
        </DsButton>
      ) : (
        <div className="inv-actions">
          <DsButton tone="primary" onClick={() => navigate(`/signup?next=/invite/${token}`)}>
            Create an account
          </DsButton>
          <DsButton tone="secondary" onClick={() => navigate(`/login?next=/invite/${token}`)}>
            I already have one
          </DsButton>
        </div>
      )}
    </Shell>
  );
}

/**
 * What they are joining, in their terms. A GUEST is told about the brands, not the
 * workspace — the word "workspace" is ours, and a client invited to look at one brand
 * should not have to learn our nouns (10 §2).
 */
function describe(p: Preview): string {
  const role = p.role ? WORKSPACE_ROLE_LABEL[p.role] : 'Member';
  if (p.role === 'guest') {
    const names = p.brandNames ?? [];
    if (names.length === 1) return `You’ll be able to work on ${names[0]}.`;
    if (names.length === 2) return `You’ll be able to work on ${names[0]} and ${names[1]}.`;
    if (names.length > 2) return `You’ll be able to work on ${names.length} brands.`;
    return 'You’ll be able to work on the brands they’ve chosen.';
  }
  if (p.brandAccessMode === 'all') {
    return `You’ll join as ${article(role)} ${role}, with access to every brand.`;
  }
  const n = p.brandCount ?? 0;
  return `You’ll join as ${article(role)} ${role}, with access to ${n} ${n === 1 ? 'brand' : 'brands'}.`;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="inv-shell">
      <div className="inv-card">
        <BrandMark size={36} idle />
        {children}
      </div>
      <style>{`
        .inv-shell { min-height: 100dvh; display: grid; place-items: center; padding: 24px;
          background: var(--ds-bg, #faf9f7); }
        .inv-card { width: 100%; max-width: 420px; display: grid; gap: 16px; justify-items: start;
          background: var(--ds-surface, #fff); padding: 32px;
          border: 1px solid var(--ds-border-subtle, rgba(0,0,0,.07));
          border-radius: var(--ds-radius-lg, 14px); }
        .inv-title { font: var(--ds-font-title, 600 20px/1.3 system-ui); margin: 0; }
        .inv-body { margin: 0; color: var(--ds-text-muted, #6b6b6b); line-height: 1.55; }
        .inv-message { margin: 0; padding-left: 12px; color: var(--ds-text-muted, #6b6b6b);
          border-left: 2px solid var(--ds-border-subtle, rgba(0,0,0,.1)); font-style: italic; }
        .inv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>
    </main>
  );
}
