import {
  Layout, Palette, Printer, Download, Globe, Wand2,
  ArrowRight, Sparkles, Shield, Zap
} from 'lucide-react';

const capabilities = [
  {
    icon: Layout,
    title: 'Live Brand Guidelines',
    description: 'Instantly updated, shareable, always on-brand. Choose from multiple templates — Minimal, Corporate, Creative, Modern, Professional. Export as PDF or PPTX.',
    features: ['Multiple templates', 'Custom sizes', 'Real-time preview', 'PDF & PPTX export'],
    gradient: 'from-violet-500/10 via-transparent to-transparent',
  },
  {
    icon: Palette,
    title: 'Design Studio',
    description: 'Create on-brand designs without leaving the OS. Canvas editor powered by Fabric.js with full creative control. Templates for every format.',
    features: ['Canvas editor', 'Template gallery', 'Brand-aware layouts', 'Multi-format export'],
    gradient: 'from-blue-500/10 via-transparent to-transparent',
  },
  {
    icon: Printer,
    title: 'Print & Collateral',
    description: 'Auto-generate business cards, invoices, letterheads, and presentations. 8 card styles, 7 deck templates, 6 invoice formats — all brand-consistent.',
    features: ['Business cards', 'Presentations', 'Invoices', 'Mockup previews'],
    gradient: 'from-emerald-500/10 via-transparent to-transparent',
  },
  {
    icon: Download,
    title: 'Brand Export',
    description: 'One-click full brand folder, perfectly organized. Export as PNG, SVG, PDF, PPTX, MP4, or GIF. Package everything into a single ZIP.',
    features: ['Multi-format', 'Batch export', 'Organized folders', 'ZIP packaging'],
    gradient: 'from-amber-500/10 via-transparent to-transparent',
  },
  {
    icon: Globe,
    title: 'Social Media Suite',
    description: 'Design for Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube, and Pinterest. Platform-specific sizes, brand-aware templates, instant publishing.',
    features: ['7 platforms', 'Auto-sized', 'Template library', 'Stories & Posts'],
    gradient: 'from-pink-500/10 via-transparent to-transparent',
  },
  {
    icon: Wand2,
    title: 'Smart AI Assist',
    description: 'Claude-powered intelligence for slogans, mission statements, brand voice, and color psychology. Upload documents and let AI extract structured brand data.',
    features: ['Slogan generation', 'Voice writing', 'Color analysis', 'Document extraction'],
    gradient: 'from-cyan-500/10 via-transparent to-transparent',
  },
];

const differentiators = [
  {
    icon: Sparkles,
    title: 'Not a template tool',
    description: 'A living brand system that auto-applies your identity to every output.',
  },
  {
    icon: Shield,
    title: 'Consistency enforced',
    description: 'WCAG contrast checking, brand validation scoring, logo safety zones.',
  },
  {
    icon: Zap,
    title: 'One change, everywhere',
    description: 'Update a color or font once — it propagates to every asset instantly.',
  },
];

export function V2Capabilities() {
  return (
    <section className="relative py-32">
      {/* Ambient dot grid */}
      <div className="absolute inset-0 v2-dot-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            Capabilities
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            Everything your brand needs.
            <br />
            <span className="text-white/40">Nothing it doesn't.</span>
          </h2>
        </div>

        {/* Capability Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={i}
                className={`v2-reveal v2-reveal-delay-${Math.min(i + 1, 6)} v2-cap-card v2-glass rounded-2xl p-6 group`}
              >
                {/* Gradient accent */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${cap.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <div className="relative">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                    <Icon className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-display font-semibold text-white/90 mb-2">
                    {cap.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/40 leading-relaxed mb-4">
                    {cap.description}
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {cap.features.map((feat, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.04] text-white/35 border border-white/[0.04]"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Differentiators */}
        <div className="mt-20">
          <div className="v2-separator" />
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {differentiators.map((diff, i) => {
              const Icon = diff.icon;
              return (
                <div key={i} className={`v2-reveal v2-reveal-delay-${i + 1} flex gap-4`}>
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-white/40" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/80">{diff.title}</h4>
                    <p className="mt-1 text-sm text-white/35 leading-relaxed">{diff.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="v2-reveal mt-16 text-center">
          <a
            href="/onboarding"
            className="v2-btn-secondary inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm"
          >
            Explore all 19 modules
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
