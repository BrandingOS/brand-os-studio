import { Wand2, MessageCircle, Palette, FileText, Sparkles, Brain } from 'lucide-react';

const aiFeatures = [
  {
    icon: MessageCircle,
    title: 'Slogan Generation',
    description: 'AI crafts 5 unique slogans tailored to your brand personality, audience, and market positioning.',
  },
  {
    icon: FileText,
    title: 'Mission & Vision',
    description: 'Generate 3 mission and vision statements grounded in your brand strategy and values.',
  },
  {
    icon: Wand2,
    title: 'Brand Voice Writing',
    description: 'Define your brand tone with 3 AI-generated voice descriptions — formal, casual, or anywhere in between.',
  },
  {
    icon: Palette,
    title: 'Color Psychology',
    description: 'Get 3 insights into what your color palette communicates to your audience — and how to refine it.',
  },
];

export function V2Intelligence() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div>
            <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
              <Brain className="w-3 h-3" />
              AI Intelligence
            </span>

            <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl font-bold v2-gradient-text">
              Your brand strategist,
              <br />powered by Claude.
            </h2>

            <p className="v2-reveal v2-reveal-delay-2 mt-4 text-base text-white/45 leading-relaxed max-w-lg">
              BrandOS integrates Claude AI to assist with the creative and strategic
              decisions that define your brand. Upload documents, get structured data
              extraction, and receive intelligent suggestions — all within the platform.
            </p>

            <div className="v2-reveal v2-reveal-delay-3 mt-8 space-y-4">
              {aiFeatures.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div key={i} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white/75">{feat.title}</h4>
                      <p className="text-xs text-white/30 leading-relaxed mt-0.5">{feat.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Visual */}
          <div className="v2-reveal-scale">
            <div className="relative">
              {/* Background glow */}
              <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-violet-500/[0.04] via-transparent to-cyan-500/[0.04] blur-2xl" />

              {/* AI Panel mock */}
              <div className="relative v2-glass-strong rounded-2xl p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/80">AI Assistant</h4>
                    <p className="text-[10px] text-white/30">Powered by Claude</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                    <span className="text-[10px] text-white/25">Active</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="v2-separator" />

                {/* Prompt */}
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
                  <p className="text-xs text-white/25 mb-2">Prompt</p>
                  <p className="text-sm text-white/60">Generate 5 slogans for a premium tech brand targeting creative professionals...</p>
                </div>

                {/* Response */}
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
                  <p className="text-xs text-white/25 mb-3">Response</p>
                  <div className="space-y-2">
                    {[
                      '"Create without limits."',
                      '"Where vision meets precision."',
                      '"Design intelligence, amplified."',
                    ].map((slogan, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-white/[0.04] flex items-center justify-center text-[9px] text-white/25 font-medium">
                          {i + 1}
                        </div>
                        <span className="text-sm text-white/55 italic">{slogan}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-white/15">Generating more</span>
                      <span className="v2-cursor text-white/30">|</span>
                    </div>
                  </div>
                </div>

                {/* Confidence indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/50" />
                    </div>
                    <span className="text-[10px] text-white/25">85% confidence</span>
                  </div>
                  <span className="text-[10px] text-white/15">Claude Sonnet 4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
