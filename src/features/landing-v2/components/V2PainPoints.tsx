import { FileStack, Layout, Download, ArrowRight } from 'lucide-react';

const painPoints = [
  {
    icon: FileStack,
    title: 'Assets Everywhere',
    problem: 'Logos in email. Fonts on a drive. Colors in your head. Brand files scattered across tools, folders, and team members.',
    solution: 'BrandOS centralizes everything in one living system.',
  },
  {
    icon: Layout,
    title: 'Inconsistent Look',
    problem: 'Each designer, agency, and team member interprets your brand differently. Every new asset is a gamble.',
    solution: 'Every output is auto-generated from your source of truth.',
  },
  {
    icon: Download,
    title: 'Rework on Repeat',
    problem: 'New color? Update 20 files. New logo? Redo every template. Brand changes ripple slowly and painfully.',
    solution: 'Change once, propagate everywhere — instantly.',
  },
];

export function V2PainPoints() {
  return (
    <section className="relative py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            The Problem
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            Brand management is broken.
          </h2>
          <p className="v2-reveal v2-reveal-delay-2 mt-4 text-base sm:text-lg text-white/45">
            Most teams waste hours on problems that shouldn't exist.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          {painPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <div
                key={i}
                className={`v2-reveal v2-reveal-delay-${i + 1} v2-glass rounded-2xl p-6 sm:p-8 group hover:bg-white/[0.03] transition-all duration-400`}
              >
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-red-500/[0.08] border border-red-500/[0.1] flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-red-400/60" />
                </div>

                {/* Title */}
                <h3 className="text-base font-display font-semibold text-white/85 mb-3">
                  {point.title}
                </h3>

                {/* Problem */}
                <p className="text-sm text-white/40 leading-relaxed mb-4">
                  {point.problem}
                </p>

                {/* Solution */}
                <div className="flex items-start gap-2 pt-3 border-t border-white/[0.05]">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400/50 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-400/50 leading-relaxed font-medium">
                    {point.solution}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
