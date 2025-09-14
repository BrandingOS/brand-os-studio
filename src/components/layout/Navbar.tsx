import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { AuthModal } from '@/features/auth/components/AuthModal';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useAuth } from '@/features/auth/hooks/useAuth';

const navItems = [
  { label: "Setup", href: "#setup" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    <header className="sticky top-4 z-40">
      <div className="container-tight">
        <div className="mx-auto max-w-4xl">
          <div className="nav-glass flex items-center justify-between rounded-full px-4 py-2">
            <div className="flex items-center gap-3" data-animate>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5" />
              </div>
              <a href="#" className="font-display text-lg font-semibold">Brand OS</a>
            </div>

            <nav className="hidden md:flex items-center gap-6" aria-label="Primary" data-animate>
              {navItems.map((n) => (
                <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="hidden sm:flex items-center gap-3" data-animate>
              {isAuthenticated ? (
                <>
                  <Button 
                    variant="secondary" 
                    shape="pill"
                    onClick={() => window.location.href = '/dashboard'}
                    className="font-medium"
                  >
                    Dashboard
                  </Button>
                  <UserMenu />
                </>
              ) : (
                <Button 
                  variant="hero" 
                  shape="pill" 
                  className="cta-glow"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
