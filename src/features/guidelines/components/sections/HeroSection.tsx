import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface HeroSectionProps {
  brand: Brand;
}

/**
 * Returns true if a hex color is considered "light" based on relative luminance.
 */
function isLightColor(hex: string): boolean {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#1a1a2e';
  const light = isLightColor(primaryColor);
  const textColor = light ? '#111111' : '#ffffff';
  const mutedTextColor = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const subtitle =
    brand.guidelines?.strategy?.mission || brand.strategy || 'Brand Guidelines';
  const currentYear = new Date().getFullYear();

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: primaryColor }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            160deg,
            rgba(0,0,0,0.15) 0%,
            transparent 40%,
            transparent 60%,
            rgba(0,0,0,0.25) 100%
          )`,
        }}
      />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse at 50% 40%,
            rgba(255,255,255,0.08) 0%,
            transparent 70%
          )`,
        }}
      />

      {/* Year badge */}
      <div className="relative z-10 mb-12">
        <span
          className="inline-block px-5 py-1.5 rounded-full text-xs font-mono tracking-[0.3em] uppercase border"
          style={{
            color: mutedTextColor,
            borderColor: light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
          }}
        >
          {currentYear}
        </span>
      </div>

      {/* Logo */}
      {brand.logo && (
        <div className="relative z-10 mb-10">
          <img
            src={brand.logo}
            alt={`${brand.name} logo`}
            className="max-h-24 w-auto object-contain"
            style={{
              filter: light ? 'none' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
            }}
          />
        </div>
      )}

      {/* Brand name */}
      <h1
        className="relative z-10 text-center font-bold tracking-tight leading-none"
        style={{
          fontFamily,
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          color: textColor,
          letterSpacing: '-0.02em',
        }}
      >
        {brand.name}
      </h1>

      {/* Subtitle / Mission */}
      <p
        className="relative z-10 mt-6 max-w-xl text-center text-lg font-light tracking-wide leading-relaxed"
        style={{
          color: mutedTextColor,
          fontFamily,
        }}
      >
        {subtitle}
      </p>

      {/* Decorative line */}
      <div
        className="relative z-10 mt-10 w-12 h-px"
        style={{
          backgroundColor: light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)',
        }}
      />

      {/* Scroll-down indicator */}
      <div className="absolute bottom-10 z-10 flex flex-col items-center gap-2">
        <span
          className="text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: mutedTextColor }}
        >
          Scroll
        </span>
        <ChevronDown
          className="animate-bounce"
          size={20}
          style={{ color: mutedTextColor }}
        />
      </div>
    </section>
  );
};

export default HeroSection;
