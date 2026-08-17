import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Sparkles } from 'lucide-react';
import { safeNext } from '@/features/auth/session/safeNext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const defaultMode =
    searchParams.get('mode') === 'register' || location.pathname === '/signup' ? 'register' : 'login';
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLoading = useSessionStore((s) => s.isLoading);

  // Where to go after signing in: the guarded page that sent us here, or
  // an explicit ?next=, else the dashboard.
  const from = safeNext((location.state as { from?: string } | null)?.from ?? searchParams.get('next'));

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleClose = () => {
    setShowModal(false);
    // After a successful sign-in the modal has already navigated to `from`;
    // only an explicit dismissal goes home.
    if (!useSessionStore.getState().isAuthenticated) navigate('/');
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
        defaultMode={defaultMode}
        next={from}
      />
    </div>
  );
}
