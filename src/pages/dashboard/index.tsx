import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardMain } from '@/features/dashboard/components/DashboardMain';
import { useSessionStore } from '@/shared/store/sessionStore';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { Loader2 } from 'lucide-react';

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

export default function DashboardRoute() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!AUTH_BYPASS && !isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isLoading]);

  // Bypass mode OR authenticated: render dashboard immediately
  if (AUTH_BYPASS || isAuthenticated) {
    return (
      <DashboardLayout>
        <DashboardMain />
      </DashboardLayout>
    );
  }

  // Still loading real auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-muted-foreground">Initializing...</span>
        </div>
      </div>
    );
  }

  // Not authenticated — show dashboard behind auth modal
  return (
    <>
      <DashboardLayout>
        <DashboardMain />
      </DashboardLayout>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
    </>
  );
}
