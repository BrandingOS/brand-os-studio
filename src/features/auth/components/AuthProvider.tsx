import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/shared/store/sessionStore';
import { startAuthController, DEV_BYPASS_USER } from '../session/authController';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [recoveryRedirecting, setRecoveryRedirecting] = useState(false);

  // A recovery link may land on the site root with `#access_token=…&type=recovery`
  // (implicit-style links) — send it to the reset page BEFORE any route
  // renders, hash intact, so IndexPage never bounces an authed user to
  // /dashboard mid-recovery.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && location.pathname !== '/auth/reset-password') {
      setRecoveryRedirecting(true);
      navigate('/auth/reset-password' + hash, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The one place the auth lifecycle is started.
  useEffect(() => startAuthController(), []);

  const isDevBypassSession = useSessionStore((s) => s.user?.id === DEV_BYPASS_USER.id);

  if (recoveryRedirecting && location.pathname !== '/auth/reset-password') {
    return null;
  }

  return (
    <>
      {children}
      {isDevBypassSession && (
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            zIndex: 9999,
            background: '#f59e0b',
            color: '#111',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          DEV AUTH BYPASS — Supabase skipped
        </div>
      )}
    </>
  );
}
