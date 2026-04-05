import { Hexagon } from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: ['Brand Kit', 'Guidelines', 'Design Studio', 'Social Media', 'AI Assist', 'Export'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Templates', 'Brand Strategy', 'Blog'],
  },
  {
    title: 'Company',
    links: ['About', 'Pricing', 'Contact', 'Changelog'],
  },
];

export function V2Footer() {
  return (
    <footer className="relative border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Hexagon className="w-5 h-5 text-white/30" />
              <span className="font-display font-bold text-sm text-white/70">BrandOS</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed max-w-xs">
              The operating system for brand builders. Set up once, generate everything, export anywhere.
            </p>
            <p className="mt-6 text-xs text-white/15">
              &copy; {new Date().getFullYear()} BrandOS. All rights reserved.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <span className="text-sm text-white/25 hover:text-white/50 cursor-pointer transition-colors">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
