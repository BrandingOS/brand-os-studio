import { ArrowRight, Hexagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function V2CTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 v2-grid-bg opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,4%)] via-transparent to-[hsl(0,0%,4%)] pointer-events-none" />
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.015] blur-[100px] pointer-events-none" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Icon */}
        <div className="v2-reveal flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center v2-glow-subtle">
            <Hexagon className="w-7 h-7 text-white/30" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="v2-reveal v2-reveal-delay-1 font-display text-4xl sm:text-5xl md:text-6xl font-bold v2-gradient-text leading-tight">
          Your brand deserves
          <br />an operating system.
        </h2>

        <p className="v2-reveal v2-reveal-delay-2 mt-6 text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
          Stop managing brand assets across scattered tools.
          Start with BrandOS — set up once, generate everything, export anywhere.
        </p>

        {/* Buttons */}
        <div className="v2-reveal v2-reveal-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/onboarding')}
            className="v2-btn-primary h-13 px-10 rounded-full text-sm inline-flex items-center gap-2"
          >
            Start Building — Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="v2-btn-secondary h-13 px-8 rounded-full text-sm"
          >
            View Dashboard
          </button>
        </div>

        {/* Trust line */}
        <p className="v2-reveal v2-reveal-delay-4 mt-8 text-xs text-white/20">
          No credit card required · Free tier available · Set up in under 5 minutes
        </p>

        {/* Feature summary */}
        <div className="v2-reveal v2-reveal-delay-5 mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            '19 brand modules',
            'AI-powered',
            'Multi-format export',
            'Live guidelines',
            'Canvas editor',
            'Social media suite',
          ].map((feat, i) => (
            <span key={i} className="text-xs text-white/20 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/15" />
              {feat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
