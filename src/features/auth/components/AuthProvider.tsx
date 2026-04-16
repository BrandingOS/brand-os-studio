import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

  // Block rendering until recovery redirect completes to prevent flash of landing page
  if (recoveryRedirecting && location.pathname !== '/auth/reset-password') {
    return null;
  }

  return <>{children}</>;
}
