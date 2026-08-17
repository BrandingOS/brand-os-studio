import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSessionStore } from '@/shared/store/sessionStore';
import { safeNext } from '@/features/auth/session/safeNext';

/** How long we give the PKCE code exchange before calling the link dead. */
const EXCHANGE_TIMEOUT_MS = 8000;

/**
 * Where OAuth (Google) and email links (confirm sign-up) land. supabase-js
 * exchanges the `?code=` itself on load; the auth controller flips the store
 * to authenticated; we forward to `next`. Provider errors arrive as
 * `?error=…&error_description=…` (or in the hash) and are shown, not swallowed.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLoading = useSessionStore((s) => s.isLoading);
  const [timedOut, setTimedOut] = useState(false);

  const next = safeNext(params.get('next'));
  const error = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('error') ?? hash.get('error');
    const description = params.get('error_description') ?? hash.get('error_description');
    return code ? (description ?? code).replace(/\+/g, ' ') : null;
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), EXCHANGE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (isAuthenticated && !error) {
    return <Navigate to={next} replace />;
  }

  const hasCode = params.has('code') || window.location.hash.includes('access_token');
  const stillWaiting = !error && hasCode && !timedOut;

  if ((isLoading || stillWaiting) && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Signing you in…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-display">
            {error ? 'Sign-in was not completed' : 'This link is no longer valid'}
          </CardTitle>
          <CardDescription>
            {error ?? 'It may have expired or already been used. Please sign in again.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
