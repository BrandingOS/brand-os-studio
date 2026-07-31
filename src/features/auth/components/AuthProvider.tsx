import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEV_BYPASS_USER } from '../hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [recoveryRedirecting, setRecoveryRedirecting] = useState(false);

  // Detect recovery token in URL hash BEFORE any route renders.
  // Supabase redirects to site root with #access_token=...&type=recovery.
  // Without this, IndexPage sees isAuthenticated and redirects to /dashboard,
  // racing with the PASSWORD_RECOVERY event handler.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && location.pathname !== '/auth/reset-password') {
      setRecoveryRedirecting(true);
      // Preserve the hash so the reset-password page can pick up the token
      navigate('/auth/reset-password' + hash, { replace: true });
    }
  }, []);

  // Initialize real Supabase auth
  useAuth();

  const isDevBypassSession = useSessionStore((s) => s.user?.id === DEV_BYPASS_USER.id);

  // Block rendering until recovery redirect completes to prevent flash of landing page
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
