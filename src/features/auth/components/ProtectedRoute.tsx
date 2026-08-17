import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { isPlatformRoleAtLeast, type PlatformRole } from '@/shared/types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  /** Minimum platform role. Below it → sent to /dashboard. */
  role?: Exclude<PlatformRole, 'user'>;
}

/**
 * The one route guard. Redirects at RENDER time (no effect, no null flash)
 * and remembers where the visitor was headed so the login page can send
 * them back (`location.state.from`).
 */
export function ProtectedRoute({ children, redirectTo = '/login', role }: ProtectedRouteProps) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLoading = useSessionStore((s) => s.isLoading);
  const platformRole = useSessionStore((s) => s.platformRole);
  const roleResolved = useSessionStore((s) => s.roleResolved);
  const location = useLocation();

  // A role gate must wait for the role lookup, or a real admin gets bounced
  // on the first paint after sign-in.
  if (isLoading || (role && isAuthenticated && !roleResolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to={redirectTo} replace state={{ from }} />;
  }

  if (role && !isPlatformRoleAtLeast(platformRole, role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
