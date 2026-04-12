import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardMain } from '@/features/dashboard/components/DashboardMain';
import { useSessionStore } from '@/shared/store/sessionStore';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { Loader2 } from 'lucide-react';

export default function DashboardRoute() {
  const { mode, isAuthenticated, isLoading } = useSessionStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // After loading completes, show auth modal if user is not authenticated
    // and auth bypass is not enabled (staging environment)
    const authBypass = import.meta.env.VITE_AUTH_BYPASS === 'true';
    if (!isLoading && !isAuthenticated && !authBypass) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while auth initializes
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