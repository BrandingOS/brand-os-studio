/**
 * /claim — the after-signup landing for tool sessions.
 *
 * The signup flow forwards a freshly-authenticated user here with
 * `?slug=<tool>&feature=<what-they-clicked>`. We materialize their
 * most recent anonymous session for that slug into a real brand and
 * route them into it. The ToolGate's CTA carries through end-to-end:
 * the user clicked "Export SVG", saw signup, signed up, and lands in
 * their new brand with the variant ready to re-export.
 *
 * If there is no anonymous session for the slug (e.g. claim was hit
 * directly), we fall back to the dashboard.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { claimSession } from '@/features/tools/core';
// Import to register tool materializers (side effect).
import '@/features/tools/variant-studio/materializer';
import { useSessionStore } from '@/shared/store/sessionStore';
import { toast } from 'sonner';

export default function ClaimPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<'pending' | 'claiming' | 'done' | 'error'>('pending');

  useEffect(() => {
    if (!isAuthenticated) {
      // Bounce to signup, then come back here.
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/?signup=1&next=${next}`);
      return;
    }

    const slug = params.get('slug');
    if (!slug) {
      navigate('/dashboard');
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('claiming');
      try {
        const brand = await claimSession(slug as 'logo-variant-generator');
        if (cancelled) return;
        if (!brand) {
          toast.info('No saved work to claim — starting fresh.');
          navigate('/dashboard');
          return;
        }
        setStatus('done');
        toast.success(`Claimed your work into "${brand.name}"`);
        navigate(`/b/${brand.slug}/identity?tab=logo&claimed=1`);
      } catch (err) {
        console.error('[claim] failed', err);
        if (!cancelled) {
          setStatus('error');
          toast.error('Claim failed. Your work is still saved locally.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          {status === 'error' ? (
            <Sparkles className="h-6 w-6 text-destructive" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
        </div>
        <h1 className="text-xl font-semibold">
          {status === 'error' ? 'Claim failed' : 'Claiming your work…'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'error'
            ? 'Try again from your dashboard.'
            : 'We are saving your variants into a new brand.'}
        </p>
      </div>
    </div>
  );
}
