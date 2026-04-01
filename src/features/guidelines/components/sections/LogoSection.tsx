import React from 'react';
import { Check, X } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface LogoSectionProps {
  brand: Brand;
}

const DOS = [
  'Use on clean backgrounds',
  'Maintain clear space',
  'Use approved colors',
];

const DONTS = [
  'Stretch or distort',
  'Change logo colors',
  'Place on busy backgrounds',
];

/**
 * Inline SVG checkerboard background for showing logo transparency.
 */
const checkerboardBg =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27%3E%3Crect width=%2710%27 height=%2710%27 fill=%27%23f0f0f0%27/%3E%3Crect x=%2710%27 width=%2710%27 height=%2710%27 fill=%27%23e0e0e0%27/%3E%3Crect y=%2710%27 width=%2710%27 height=%2710%27 fill=%27%23e0e0e0%27/%3E%3Crect x=%2710%27 y=%2710%27 width=%2710%27 height=%2710%27 fill=%27%23f0f0f0%27/%3E%3C/svg%3E")';

export const LogoSection: React.FC<LogoSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#6366f1';
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const hasLogo = !!brand.logo;

  return (
    <section className="relative py-24 px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Section number */}
        <div className="relative mb-2">
          <span
            className="block font-bold leading-none select-none pointer-events-none"
            style={{
              fontFamily,
              fontSize: '8rem',
              color: primaryColor,
              opacity: 0.05,
            }}
          >
            02
          </span>
        </div>

        {/* Section title */}
        <div className="mb-16 -mt-12 relative z-10">
          <h2
            className="text-4xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily }}
          >
            Logo System
          </h2>
          <div
            className="mt-3 w-16 h-1 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {hasLogo ? (
          <>
            {/* Primary logo display */}
            <div className="mb-16">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6">
                Primary Logo
              </h3>
              <div
                className="rounded-2xl border border-gray-200 p-16 flex items-center justify-center"
                style={{ background: checkerboardBg }}
              >
                <img
                  src={brand.logo}
                  alt={`${brand.name} primary logo`}
                  className="max-h-32 w-auto object-contain"
                />
              </div>
            </div>

            {/* Logo variations grid */}
            <div className="mb-16">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6">
                Logo Variations
              </h3>
              <div className="grid grid-cols-2 gap-6">
                {/* On white */}
                <div className="rounded-xl border border-gray-200 bg-white p-10 flex flex-col items-center gap-4">
                  <img
                    src={brand.logo}
                    alt="Logo on white"
                    className="max-h-16 w-auto object-contain"
                  />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    On White
                  </span>
                </div>

                {/* On dark */}
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-10 flex flex-col items-center gap-4">
                  <img
                    src={brand.logo}
                    alt="Logo on dark"
                    className="max-h-16 w-auto object-contain brightness-0 invert"
                  />
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                    On Dark
                  </span>
                </div>

                {/* On brand color */}
                <div
                  className="rounded-xl p-10 flex flex-col items-center gap-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  <img
                    src={brand.logo}
                    alt="Logo on brand color"
                    className="max-h-16 w-auto object-contain brightness-0 invert"
                  />
                  <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    On Brand Color
                  </span>
                </div>

                {/* Monochrome */}
                <div className="rounded-xl border border-gray-200 bg-gray-100 p-10 flex flex-col items-center gap-4">
                  <img
                    src={brand.logo}
                    alt="Logo monochrome"
                    className="max-h-16 w-auto object-contain grayscale"
                  />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Monochrome
                  </span>
                </div>
              </div>
            </div>

            {/* Clear space diagram */}
            <div className="mb-16">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6">
                Clear Space
              </h3>
              <div className="rounded-2xl border border-gray-200 bg-white p-10 flex items-center justify-center">
                <div className="relative p-12 border-2 border-dashed border-gray-300 rounded-lg">
                  {/* Spacing indicators */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 text-[10px] font-mono text-gray-400">
                    x
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 text-[10px] font-mono text-gray-400">
                    x
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 text-[10px] font-mono text-gray-400">
                    x
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 text-[10px] font-mono text-gray-400">
                    x
                  </div>
                  <img
                    src={brand.logo}
                    alt="Logo clear space"
                    className="max-h-20 w-auto object-contain"
                  />
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500 text-center font-mono">
                Maintain a minimum clear space of &ldquo;x&rdquo; around the logo at all times, where &ldquo;x&rdquo; equals the height of the logomark.
              </p>
            </div>

            {/* Minimum size */}
            <div className="mb-16">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6">
                Minimum Size
              </h3>
              <div className="rounded-xl border border-gray-200 bg-white p-8 inline-flex items-center gap-6">
                <img
                  src={brand.logo}
                  alt="Logo minimum size"
                  className="object-contain"
                  style={{ height: '32px', width: 'auto' }}
                />
                <div className="h-8 w-px bg-gray-200" />
                <span className="text-sm text-gray-500 font-mono">
                  Minimum size: 32px height
                </span>
              </div>
            </div>
          </>
        ) : (
          /* No logo placeholder */
          <div className="mb-16 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
              <span className="text-3xl text-gray-300">⬡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-500 mb-2" style={{ fontFamily }}>
              No Logo Uploaded
            </h3>
            <p className="text-sm text-gray-400 max-w-sm">
              Upload your brand logo to generate a complete logo system with variations, clear space guidelines, and usage rules.
            </p>
          </div>
        )}

        {/* Do / Don't grid */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6">
            Logo Usage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* DO column */}
            <div>
              <span className="inline-block text-xs font-mono font-semibold uppercase tracking-[0.15em] text-emerald-600 mb-4">
                Do
              </span>
              <div className="space-y-3">
                {DOS.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 border-l-4"
                    style={{ borderLeftColor: '#10b981' }}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Check size={14} className="text-emerald-500" />
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DON'T column */}
            <div>
              <span className="inline-block text-xs font-mono font-semibold uppercase tracking-[0.15em] text-red-500 mb-4">
                Don&apos;t
              </span>
              <div className="space-y-3">
                {DONTS.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 border-l-4"
                    style={{ borderLeftColor: '#ef4444' }}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                      <X size={14} className="text-red-500" />
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoSection;
