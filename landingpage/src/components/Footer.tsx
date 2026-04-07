import { Sparkles } from 'lucide-react';

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
 * Footer — dark with subtle violet aurora wash at the top.
 */
export default function Footer() {
  return (
    <footer className="relative border-t border-border mt-24 overflow-hidden">
      {/* Top edge violet wash */}
      <div
        aria-hidden
        className="aurora-blob aurora-blob-violet"
        style={{
          width: 800,
          height: 400,
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.18,
        }}
      />

      <div className="container-tight py-20 md:py-24 relative z-10">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <a href="#" className="inline-flex items-center gap-2.5">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-pink">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet to-pink blur-md opacity-60 -z-10" />
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Brand OS
              </span>
            </a>
            <p className="mt-6 text-base text-fg-muted max-w-sm leading-relaxed">
              The brand workspace where founders and designers ship one
              identity, used everywhere.
            </p>
          </div>

          {/* Link columns */}
          <nav
            className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8"
            aria-label="Footer"
          >
            {linkColumns.map((col) => (
              <div key={col.label}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground mb-5">
                  {col.label}
                </h4>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item}>
                      <span className="text-sm text-fg-dim cursor-default">
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
        <div className="mt-20 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-fg-dim">
            © {new Date().getFullYear()} Brand OS. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-fg-dim">
            <span className="cursor-default">Privacy</span>
            <span className="cursor-default">Terms</span>
            <span className="cursor-default">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
