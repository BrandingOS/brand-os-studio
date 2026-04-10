import { Sparkles } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

const navItems = [
  { label: 'Why', href: '#pain' },
  { label: 'How', href: '#setup' },
  { label: 'Modules', href: '#features' },
];

/**
 * Navbar — v5 refined.
 *
 * Floating glass pill. Modern AI-tool-style logo (gradient sparkle
 * icon + "BrandOS" wordmark). Desktop: center nav + CTA. Mobile:
 * hide nav links + burger entirely — just logo + CTA. This avoids
 * the broken mobile hamburger and keeps the bar compact.
 */
export default function Navbar() {
  const { open } = useEarlyAccess();

  return (
    <header className="sticky top-4 z-40 w-full pointer-events-none">
      <div className="container-tight pointer-events-auto">
        <div className="mx-auto max-w-5xl">
          <div className="nav-glass flex items-center justify-between rounded-full px-4 sm:px-5 py-2">
            {/* Logo — modern AI-tool style */}
            <a href="#" className="flex items-center gap-2" aria-label="BrandOS">
              <span className="navbar-logo-icon">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-display text-base sm:text-lg font-bold tracking-tight">
                BrandOS
              </span>
            </a>

            {/* Center nav — desktop only */}
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

            {/* CTA — always visible */}
            <button
              type="button"
              onClick={open}
              className="btn-primary h-9 px-4 sm:px-5 text-xs whitespace-nowrap"
            >
              Get Early Access
            </button>
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
    </header>
  );
}
