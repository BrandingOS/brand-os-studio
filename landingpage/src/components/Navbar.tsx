import { Building2 } from 'lucide-react';

const navItems = [
  { label: 'Why', href: '#pain' },
  { label: 'Setup', href: '#setup' },
  { label: 'Modules', href: '#features' },
];

const scrollToEarlyAccess = () => {
  const el = document.getElementById('early-access');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/**
 * Navbar — Relume-style.
 *
 * Flat sticky bar with a thin bottom hairline. No glass blur, no pill
 * rounding around the whole nav. Logo left, links center, single black
 * pill CTA right. Same height across all breakpoints.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container-tight">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5" aria-label="Brand OS">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Brand OS</span>
          </a>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-10" aria-label="Primary">
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
            onClick={scrollToEarlyAccess}
            className="btn-primary h-10 px-5 text-sm"
          >
            Get Early Access
          </button>
        </div>
      </div>
    </header>
  );
}
