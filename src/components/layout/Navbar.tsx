import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useEarlyAccess } from '@/domains/landing/components/EarlyAccessProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Why', href: '#pain' },
  { label: 'How', href: '#setup' },
  { label: 'Modules', href: '#features' },
];

export default function Navbar() {
  const { open } = useEarlyAccess();
  const { isAuthenticated } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  return (
    <header className="sticky top-4 z-40 w-full pointer-events-none">
      <div className="container-tight pointer-events-auto">
        <div className="mx-auto max-w-5xl">
          <div className="nav-glass flex items-center justify-between rounded-full px-4 sm:px-5 py-2">
            <a href="/" className="flex items-center gap-2" aria-label="BrandOS">
              <span className="navbar-logo-icon">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-display text-base sm:text-lg font-bold tracking-tight">
                BrandOS
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {navItems.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="secondary"
                    shape="pill"
                    onClick={() => window.location.href = '/dashboard'}
                    className="font-medium h-9 px-4 sm:px-5 text-xs"
                  >
                    Dashboard
                  </Button>
                  <UserMenu />
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setShowAuth(true); }}
                    className="btn-primary h-9 px-4 sm:px-5 text-xs whitespace-nowrap"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .navbar-logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, hsl(var(--accent-pop)), hsl(var(--accent-pop) / 0.75));
          color: white;
          box-shadow: 0 4px 14px hsl(var(--accent-pop) / 0.35);
          flex-shrink: 0;
        }
      `}</style>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultMode={authMode}
      />
    </header>
  );
}
