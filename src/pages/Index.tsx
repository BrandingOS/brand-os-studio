import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * `/` is the marketing landing, and the landing is a DOCUMENT of its own
 * (landingpage/, built into dist/landing/index.html by
 * scripts/build-landing.mjs and served at `/` by functions/_middleware.ts).
 * A visitor typing the address never reaches React Router at all.
 *
 * React Router lands here only on an IN-APP navigation to `/` — a logo
 * click, a logout, NotFound's "home". So this route is a BRIDGE, and it
 * renders nothing.
 *
 * It used to render a SECOND landing page (src/domains/landing, the orange
 * one) as its visible content while it waited for the session to resolve,
 * and bounce only afterwards. That painted the old marketing site over the
 * app for as long as auth took to answer — up to the auth controller's 6s
 * fallback — and then replaced it with the real one. Two landing pages is
 * the bug; the legacy one was deleted on 2026-09-04. Never render markup
 * here: whatever this route paints is a landing page competing with the
 * real one.
 *
 * This holds in dev too: vite.config.ts's landingPageDevPlugin serves the
 * landing at `/` on port 8080, so localhost is the same front door.
 */
const BOUNCE_MARKER = 'brandos:landing-bounced';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // `isAuthenticated` is false while the session is still resolving, so
    // acting now would throw a signed-in visitor out to the landing.
    if (isLoading) return;

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // A guest asked for `/`. Ask the SERVER for it: the middleware answers
    // with the landing document.
    //
    // Once per tab. If the reply is this route again, the deploy has no
    // landing document and a second replace would loop for ever — so the
    // marker is set BEFORE the bounce, and the fallback is the login page.
    // That is also where `?auth=required` belongs now that there is no
    // landing here to open a modal over.
    let bounced = searchParams.get('auth') === 'required';
    try {
      bounced ||= sessionStorage.getItem(BOUNCE_MARKER) === '1';
      sessionStorage.setItem(BOUNCE_MARKER, '1');
    } catch {
      // Private mode with storage disabled: never risk a reload loop.
      bounced = true;
    }

    if (bounced) navigate('/login', { replace: true });
    else window.location.replace('/');
  }, [isLoading, isAuthenticated, searchParams, navigate]);

  return null;
};

export default Index;
