import { Building2 } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

const linkColumns = [
  {
    label: 'Product',
    items: ['Overview', 'Guidelines', 'Design Studio', 'Templates'],
  },
  {
    label: 'Resources',
    items: ['Blog', 'Help Center', 'API', 'Changelog'],
  },
  {
    label: 'Company',
    items: ['About', 'Careers', 'Contact', 'Press'],
  },
];

/**
 * Footer — v5 (v1 floating dark widget, refined).
 *
 * A standalone dark "card" floating in the page's white background.
 * Big logo + tagline at the top, link columns, hairline + privacy/
 * terms/cookies at the bottom.
 */
export default function Footer() {
  const { open } = useEarlyAccess();

  return (
    <footer className="mt-12 mb-12">
      <div className="container-tight">
        <div className="strong-block px-6 sm:px-12 md:px-16 py-16 md:py-20">
          <div aria-hidden className="absolute inset-0 panel-grid opacity-40 pointer-events-none" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(80% 60% at 0% 0%, hsl(0 0% 100% / 0.05) 0%, transparent 60%)',
            }}
          />

          <div className="relative grid gap-12 md:grid-cols-12">
            {/* Brand block */}
            <div className="md:col-span-5">
              <a href="#" className="inline-flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="font-display text-xl font-bold tracking-tight text-[hsl(var(--panel-foreground))]">
                  Brand&nbsp;OS
                </span>
              </a>
              <p className="mt-6 text-base text-white/55 max-w-sm leading-relaxed">
                The brand workspace where founders and designers ship one
                identity, used everywhere.
              </p>
              <button
                type="button"
                onClick={open}
                className="btn-on-dark mt-8 h-12 px-6 text-sm"
              >
                Get Early Access
              </button>
            </div>

            {/* Link columns */}
            <nav
              className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8"
              aria-label="Footer"
            >
              {linkColumns.map((col) => (
                <div key={col.label}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white mb-5">
                    {col.label}
                  </h4>
                  <ul className="space-y-3">
                    {col.items.map((item) => (
                      <li key={item}>
                        <span className="text-sm text-white/45 cursor-default">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom row */}
          <div className="relative mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-white/45">
              © {new Date().getFullYear()} Brand OS. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-white/45">
              <span className="cursor-default">Privacy</span>
              <span className="cursor-default">Terms</span>
              <span className="cursor-default">Cookies</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
