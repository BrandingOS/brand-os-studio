import {
  Layers, Palette, Type, Image, MessageCircle, Target,
  FolderOpen, CreditCard, Presentation, Smartphone, Monitor,
  Play, QrCode, FileText, PenTool
} from 'lucide-react';

const coreModules = [
  { icon: Image, label: 'Logo', color: 'from-blue-500/20 to-blue-600/20' },
  { icon: Palette, label: 'Colors', color: 'from-rose-500/20 to-pink-600/20' },
  { icon: Type, label: 'Fonts', color: 'from-gray-500/20 to-gray-700/20' },
  { icon: MessageCircle, label: 'Voice', color: 'from-amber-500/20 to-orange-500/20' },
];

const outputModules = [
  { icon: Layers, label: 'Guidelines', desc: 'Live brand books' },
  { icon: CreditCard, label: 'Business Cards', desc: '8 styles auto-generated' },
  { icon: Presentation, label: 'Presentations', desc: '7 deck templates' },
  { icon: Smartphone, label: 'Social Media', desc: 'Multi-platform ready' },
  { icon: Monitor, label: 'Mockups', desc: 'Device & print previews' },
  { icon: Play, label: 'Animations', desc: 'Logo motion exports' },
  { icon: QrCode, label: 'QR Codes', desc: 'Branded with logo' },
  { icon: FileText, label: 'Invoices', desc: '6 professional styles' },
  { icon: PenTool, label: 'Design Tool', desc: 'Custom canvas editor' },
  { icon: FolderOpen, label: 'Brand Assets', desc: 'Central file hub' },
  { icon: Target, label: 'Strategy', desc: 'Mission & values' },
];

export function V2SystemMap() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            System Architecture
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            One Core. Infinite Outputs.
          </h2>
          <p className="v2-reveal v2-reveal-delay-2 mt-4 text-base sm:text-lg text-white/45 leading-relaxed">
            Define your brand DNA once — BrandOS propagates it across every module,
            template, and export. Change a color, and it updates everywhere instantly.
          </p>
        </div>

        {/* Visual Architecture */}
        <div className="mt-20 relative">
          {/* Center Core */}
          <div className="v2-reveal-scale flex flex-col items-center">
            <div className="relative">
              {/* Core glow */}
              <div className="absolute inset-0 rounded-2xl bg-white/[0.03] blur-xl scale-150" />

              {/* Core panel */}
              <div className="relative v2-glass-strong rounded-2xl p-6 sm:p-8">
                <div className="text-center mb-6">
                  <span className="text-xs uppercase tracking-[0.15em] text-white/30 font-medium">Brand Core</span>
                  <h3 className="mt-1 text-lg font-display font-semibold text-white/90">Source of Truth</h3>
                </div>

                {/* Core 4 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {coreModules.map((mod, i) => {
                    const Icon = mod.icon;
                    return (
                      <div
                        key={i}
                        className={`v2-reveal v2-reveal-delay-${i + 2} flex flex-col items-center gap-2 rounded-xl bg-gradient-to-b ${mod.color} p-4 border border-white/[0.06]`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white/60" />
                        </div>
                        <span className="text-xs font-medium text-white/70">{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Connection lines */}
          <div className="flex justify-center my-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-8 bg-gradient-to-b from-white/15 to-white/5" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 v2-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-medium">auto-generates</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 v2-pulse" style={{ animationDelay: '1s' }} />
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-white/5 to-white/15" />
            </div>
          </div>

          {/* Output Modules Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {outputModules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div
                  key={i}
                  className={`v2-reveal v2-reveal-delay-${Math.min(i % 4 + 1, 8)} v2-cap-card v2-glass rounded-xl p-4 group cursor-default`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.08] transition-colors">
                      <Icon className="w-4 h-4 text-white/50 group-hover:text-white/70 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white/80">{mod.label}</h4>
                      <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{mod.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
