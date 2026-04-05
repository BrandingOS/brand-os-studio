import { Building2, Brush, Users, Briefcase, Rocket, Globe } from 'lucide-react';

const audiences = [
  {
    icon: Brush,
    title: 'Designers & Creatives',
    description: 'Stop recreating brand assets from scratch. Set up once, auto-generate everything.',
  },
  {
    icon: Building2,
    title: 'Agencies',
    description: 'Manage multiple client brands with consistency. Deliver polished brand kits in hours.',
  },
  {
    icon: Briefcase,
    title: 'Brand Managers',
    description: 'Enforce brand guidelines across teams. One source of truth, always up to date.',
  },
  {
    icon: Rocket,
    title: 'Startups',
    description: 'Launch with a professional brand system from day one — no designer required.',
  },
  {
    icon: Users,
    title: 'Marketing Teams',
    description: 'Generate on-brand social posts, presentations, and collateral without design bottlenecks.',
  },
  {
    icon: Globe,
    title: 'Enterprises',
    description: 'Centralize brand governance across departments, offices, and markets.',
  },
];

export function V2Audience() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.008] to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            Built For
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            For everyone who builds brands.
          </h2>
          <p className="v2-reveal v2-reveal-delay-2 mt-4 text-base sm:text-lg text-white/45">
            Whether you're a solo creator or a global enterprise — BrandOS scales with you.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((aud, i) => {
            const Icon = aud.icon;
            return (
              <div
                key={i}
                className={`v2-reveal v2-reveal-delay-${Math.min(i + 1, 6)} v2-glass rounded-xl p-5 flex items-start gap-4 group hover:bg-white/[0.03] transition-all duration-300`}
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.06] transition-colors">
                  <Icon className="w-4.5 h-4.5 text-white/40" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">{aud.title}</h3>
                  <p className="mt-1 text-xs text-white/35 leading-relaxed">{aud.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
