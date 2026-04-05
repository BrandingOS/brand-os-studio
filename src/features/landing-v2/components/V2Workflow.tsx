import { Upload, Cpu, Layers, Download, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Core Assets',
    description: 'Logo, colors, fonts, voice — your brand DNA becomes the single source of truth for everything.',
    detail: 'Supports drag-and-drop, AI extraction from existing documents, and manual configuration.',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Auto-Generate Everything',
    description: 'BrandOS instantly creates guidelines, templates, business cards, social posts, presentations, and more.',
    detail: '19 modules generate brand-consistent assets automatically from your core identity.',
  },
  {
    icon: Layers,
    number: '03',
    title: 'Customize & Refine',
    description: 'Fine-tune any generated output with the built-in design editor. Every change stays on-brand.',
    detail: 'Canvas editor, template gallery, category filters, and real-time brand validation.',
  },
  {
    icon: Download,
    number: '04',
    title: 'Export & Share',
    description: 'Download individual assets or package your entire brand into a single export. PNG, SVG, PDF, PPTX, MP4, GIF.',
    detail: 'One-click ZIP packaging with organized folder structure. Share live guidelines via link.',
  },
];

export function V2Workflow() {
  return (
    <section className="relative py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            Four steps to brand mastery.
          </h2>
          <p className="v2-reveal v2-reveal-delay-2 mt-4 text-base sm:text-lg text-white/45 leading-relaxed">
            From raw assets to a complete brand system — in minutes, not months.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-20 space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`v2-reveal v2-reveal-delay-${Math.min(i + 1, 4)} group`}
              >
                <div className="v2-glass rounded-2xl p-6 sm:p-8 hover:bg-white/[0.03] transition-all duration-400">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                    {/* Number + Icon */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:w-20 flex-shrink-0">
                      <span className="text-3xl sm:text-4xl font-display font-bold text-white/[0.07] group-hover:text-white/[0.12] transition-colors">
                        {step.number}
                      </span>
                      <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                        <Icon className="w-5 h-5 text-white/50 group-hover:text-white/70 transition-colors" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-display font-semibold text-white/90">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/45 leading-relaxed max-w-xl">
                        {step.description}
                      </p>
                      <p className="mt-2 text-xs text-white/25 leading-relaxed max-w-xl">
                        {step.detail}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden sm:flex items-center self-center">
                      <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-white/25 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
