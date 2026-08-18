import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useSessionStore();

  // Where the visitor was headed before the auth wall (set by
  // ProtectedRoute) — e.g. /onboard-brand/create?name=<brand> from the
  // landing-page handoff. This effect races AuthModal's own navigate,
  // so both must agree on the target.
  const from = (location.state as { from?: string } | null)?.from;

  // Redirect once authenticated — back to the intended destination.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from ?? '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleClose = () => {
    setShowModal(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--accent-pop))] to-[hsl(var(--accent-pop)/0.75)] text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">BrandOS</span>
        </div>
      </div>

      <AuthModal
        isOpen={showModal}
        onClose={handleClose}
        defaultMode={defaultMode as 'login' | 'register'}
      />
    </div>
  );
}
