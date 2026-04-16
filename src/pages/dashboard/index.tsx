import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardMain } from '@/features/dashboard/components/DashboardMain';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Loader2 } from 'lucide-react';

export default function DashboardRoute() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardMain />
    </DashboardLayout>
  );
}
