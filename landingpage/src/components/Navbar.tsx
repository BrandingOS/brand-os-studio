import { Sparkles } from 'lucide-react';

const navItems = [
  { label: 'Why', href: '#pain' },
  { label: 'How', href: '#setup' },
  { label: 'Modules', href: '#features' },
];

const scrollToEarlyAccess = () => {
  const el = document.getElementById('early-access');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/**
 * Navbar — v4 dark glassy.
 *
 * Sticky glass bar with violet glow. Logo + center nav + glowing CTA.
 */
export default function Navbar() {
  return (
    <header className="sticky top-4 z-50 w-full pointer-events-none">
      <div className="container-tight pointer-events-auto">
        <div className="surface-glass rounded-full flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5" aria-label="Brand OS">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-pink">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet to-pink blur-md opacity-60 -z-10" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Brand OS
            </span>
          </a>

          {/* Center nav */}
          <nav
            className="hidden md:flex items-center gap-8"
            aria-label="Primary"
          >
            {navItems.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="text-sm font-medium text-fg-muted hover:text-foreground transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <button
            type="button"
            onClick={scrollToEarlyAccess}
            className="btn-glow h-9 px-5 text-xs"
          >
            Get Early Access
          </button>
        </div>
      </div>
    </header>
  );
}
