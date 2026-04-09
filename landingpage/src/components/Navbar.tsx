import { Building2 } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

const navItems = [
  { label: 'Why', href: '#pain' },
  { label: 'How', href: '#setup' },
  { label: 'Modules', href: '#features' },
];

/**
 * Navbar — v5 (v1 glass pill, refined).
 *
 * Floating glass nav at the top with logo + center nav links + a single
 * black "Get Early Access" button that opens the modal.
 */
export default function Navbar() {
  const { open } = useEarlyAccess();

  return (
    <header className="sticky top-4 z-40 w-full pointer-events-none">
      <div className="container-tight pointer-events-auto">
        <div className="mx-auto max-w-5xl">
          <div className="nav-glass flex items-center justify-between rounded-full px-4 sm:px-5 py-2">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2.5" aria-label="Brand OS">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">
                Brand&nbsp;OS
              </span>
            </a>

            {/* Center nav */}
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

            {/* CTA */}
            <button
              type="button"
              onClick={open}
              className="btn-primary h-9 px-5 text-xs"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
