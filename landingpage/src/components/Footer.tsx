import { Building2 } from 'lucide-react';

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
 * Footer — Relume-style dark editorial outro.
 *
 * Pure dark surface, no decorative noise. Big logo + tagline at the top,
 * link columns in the middle, hairline + copyright at the bottom.
 */
export default function Footer() {
  return (
    <footer className="surface-dark mt-24">
      <div className="container-tight py-20 md:py-24">
        {/* Top: brand block */}
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <a
              href="#"
              className="inline-flex items-center gap-2.5"
              aria-label="Brand OS"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background text-foreground">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-background">
                Brand OS
              </span>
            </a>
            <p className="mt-6 text-base text-background/60 max-w-sm leading-relaxed">
              The brand workspace where founders and designers ship one
              identity, used everywhere.
            </p>
          </div>

          <nav
            className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8"
            aria-label="Footer"
          >
            {linkColumns.map((col) => (
              <div key={col.label}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-background mb-5">
                  {col.label}
                </h4>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item}>
                      <span className="text-sm text-background/55 cursor-default">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom: hairline + copyright */}
        <div className="mt-20 pt-8 border-t border-background/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-background/50">
            © {new Date().getFullYear()} Brand OS. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-background/50">
            <span className="cursor-default">Privacy</span>
            <span className="cursor-default">Terms</span>
            <span className="cursor-default">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
