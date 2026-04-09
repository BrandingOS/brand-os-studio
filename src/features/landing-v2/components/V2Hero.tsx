import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Layers, Palette, Type, Image, CreditCard, Presentation,
  QrCode, Smartphone, Play, PenTool, Globe, Wand2
} from 'lucide-react';

const orbitNodes = [
  { icon: Palette, label: 'Colors', angle: 0 },
  { icon: Type, label: 'Typography', angle: 45 },
  { icon: Image, label: 'Logo', angle: 90 },
  { icon: CreditCard, label: 'Cards', angle: 135 },
  { icon: Presentation, label: 'Decks', angle: 180 },
  { icon: Smartphone, label: 'Social', angle: 225 },
  { icon: QrCode, label: 'QR', angle: 270 },
  { icon: Play, label: 'Motion', angle: 315 },
];

const outerNodes = [
  { icon: PenTool, label: 'Design', angle: 30 },
  { icon: Globe, label: 'Web', angle: 120 },
  { icon: Wand2, label: 'AI', angle: 210 },
  { icon: Layers, label: 'Export', angle: 300 },
];

export function V2Hero() {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/onboarding');
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute inset-0 v2-hero-gradient pointer-events-none" />

      {/* Grid background */}
      <div className="absolute inset-0 v2-grid-bg opacity-40" />

      {/* Orbital System — desktop only */}
      <div className="absolute inset-0 hidden lg:flex items-center justify-center pointer-events-none">
        {/* Inner orbit ring */}
        <div className="absolute w-[520px] h-[520px] rounded-full border border-dashed border-white/[0.06] v2-orbit">
          {orbitNodes.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * 260;
            const y = Math.sin(rad) * 260;
            const Icon = node.icon;
            return (
              <div
                key={i}
                className="absolute flex flex-col items-center gap-1"
                style={{
                  left: `calc(50% + ${x}px - 16px)`,
                  top: `calc(50% + ${y}px - 16px)`,
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center v2-orbit-reverse">
                  <Icon className="w-3.5 h-3.5 text-white/40" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Outer orbit ring */}
        <div className="absolute w-[780px] h-[780px] rounded-full border border-white/[0.03] v2-orbit-reverse">
          {outerNodes.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * 390;
            const y = Math.sin(rad) * 390;
            const Icon = node.icon;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `calc(50% + ${x}px - 14px)`,
                  top: `calc(50% + ${y}px - 14px)`,
                }}
              >
                <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.05] flex items-center justify-center v2-orbit">
                  <Icon className="w-3 h-3 text-white/25" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Center glow */}
        <div className="absolute w-40 h-40 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute w-3 h-3 rounded-full bg-white/20 v2-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="v2-title-animate">
          <span className="v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Brand Operating System
          </span>
        </div>

        {/* Main headline */}
        <h1 className="mt-8 font-display font-extrabold tracking-tight">
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl v2-gradient-text v2-title-animate-delay-1">
            Brand Once.
          </span>
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl v2-gradient-text v2-title-animate-delay-2 mt-1">
            Use Forever.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed v2-title-animate-delay-3">
          Set up your brand identity once — logo, colors, fonts, voice.
          BrandOS auto-generates every asset, guideline, and template you'll ever need.
        </p>

        {/* CTA */}
        <div className="mt-10 v2-title-animate-delay-4">
          <form onSubmit={handleStart} className="flex flex-col sm:flex-row items-center gap-3 justify-center max-w-md mx-auto">
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your brand name"
              className="w-full sm:w-64 h-12 px-5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/25 focus:bg-white/[0.08] transition-all text-center"
            />
            <button
              type="submit"
              className="v2-btn-primary h-12 px-8 rounded-full text-sm whitespace-nowrap"
            >
              Start Building
            </button>
          </form>
          <p className="mt-4 text-xs text-white/25">
            Free to start · No credit card required
          </p>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(0,0%,4%)] to-transparent pointer-events-none" />

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 v2-title-animate-delay-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Explore</span>
        <div className="w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5">
          <div className="w-1 h-1.5 rounded-full bg-white/30 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
