import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Menu, X } from 'lucide-react';
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
 * Mobile: hamburger icon opens a slide-down menu panel.
 */
export default function Navbar() {
  const { open } = useEarlyAccess();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

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

            {/* Center nav — desktop */}
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

            <div className="flex items-center gap-2">
              {/* CTA */}
              <button
                type="button"
                onClick={open}
                className="btn-primary h-9 px-5 text-xs"
              >
                Get Early Access
              </button>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="md:hidden mt-2 nav-glass rounded-2xl px-5 py-4 flex flex-col gap-1"
                aria-label="Mobile navigation"
              >
                {navItems.map((n) => (
                  <a
                    key={n.label}
                    href={n.href}
                    onClick={closeMobile}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {n.label}
                  </a>
                ))}
                <hr className="border-border my-1" />
                <button
                  type="button"
                  onClick={() => { closeMobile(); open(); }}
                  className="btn-primary h-10 w-full text-sm mt-1"
                >
                  Get Early Access
                </button>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
