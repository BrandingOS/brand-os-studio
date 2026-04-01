import React from 'react';
import type { Brand } from '@/shared/types/brand';

interface StrategySectionProps {
  brand: Brand;
}

export const StrategySection: React.FC<StrategySectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#6366f1';
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const strategy = brand.guidelines?.strategy;

  const mission = strategy?.mission || 'Define your brand mission — the purpose that drives everything you do.';
  const vision = strategy?.vision || 'Define your brand vision — the future you are working to create.';
  const values = strategy?.values?.length ? strategy.values : ['Integrity', 'Innovation', 'Excellence'];
  const positioning = strategy?.positioning || brand.strategy || 'Define your brand positioning — how you differentiate in the market.';
  const targetAudience = strategy?.targetAudience || brand.audience || 'Define your target audience.';

  return (
    <section className="relative py-24 px-8 bg-white">
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
            01
          </span>
        </div>

        {/* Section title */}
        <div className="mb-16 -mt-12 relative z-10">
          <h2
            className="text-4xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily }}
          >
            Brand Strategy
          </h2>
          <div
            className="mt-3 w-16 h-1 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Mission & Vision cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Mission card */}
          <div className="group rounded-2xl border border-gray-100 bg-white p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400"
              >
                Mission
              </span>
            </div>
            <p
              className="text-xl leading-relaxed text-gray-700 font-light"
              style={{ fontFamily }}
            >
              {mission}
            </p>
          </div>

          {/* Vision card */}
          <div className="group rounded-2xl border border-gray-100 bg-white p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400"
              >
                Vision
              </span>
            </div>
            <p
              className="text-xl leading-relaxed text-gray-700 font-light"
              style={{ fontFamily }}
            >
              {vision}
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h3
            className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6"
          >
            Core Values
          </h3>
          <div className="flex flex-wrap gap-3">
            {values.map((value, index) => (
              <span
                key={index}
                className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-200"
                style={{
                  backgroundColor: `${primaryColor}10`,
                  color: primaryColor,
                  border: `1px solid ${primaryColor}25`,
                }}
              >
                {value}
              </span>
            ))}
          </div>
        </div>

        {/* Positioning */}
        <div className="mb-16">
          <h3
            className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-6"
          >
            Positioning
          </h3>
          <blockquote
            className="pl-8 py-4 text-xl leading-relaxed text-gray-600 font-light italic border-l-4"
            style={{
              borderColor: primaryColor,
              fontFamily,
            }}
          >
            {positioning}
          </blockquote>
        </div>

        {/* Target Audience */}
        <div>
          <h3
            className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-4"
          >
            Target Audience
          </h3>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-8">
            <p className="text-base leading-relaxed text-gray-600" style={{ fontFamily }}>
              {targetAudience}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StrategySection;
