import React from 'react';
import type { Brand } from '@/shared/types/brand';

interface ApplicationsSectionProps {
  brand: Brand;
}

export const ApplicationsSection: React.FC<ApplicationsSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#6366f1';
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const brandInitial = brand.name.charAt(0).toUpperCase();

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
            06
          </span>
        </div>

        {/* Section title */}
        <div className="mb-16 -mt-12 relative z-10">
          <h2
            className="text-4xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily }}
          >
            Brand Applications
          </h2>
          <div
            className="mt-3 w-16 h-1 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Mockup grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Business Card Mockup */}
          <div className="group">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-4">
              Business Card
            </h3>
            <div
              className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md"
              style={{ aspectRatio: '3.5 / 2' }}
            >
              {/* Top bar */}
              <div
                className="h-3"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="p-5 flex flex-col justify-between h-[calc(100%-0.75rem)]">
                <div className="flex justify-end">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      className="h-6 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {brandInitial}
                    </div>
                  )}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold text-gray-900 mb-1"
                    style={{ fontFamily }}
                  >
                    {brand.name}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Your Name
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    your@email.com
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    +1 (555) 000-0000
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Letterhead Mockup */}
          <div className="group">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-4">
              Letterhead
            </h3>
            <div
              className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md max-h-80"
              style={{ aspectRatio: '210 / 297' }}
            >
              {/* Header */}
              <div className="px-5 pt-4">
                <div
                  className="w-full h-0.5 rounded-full mb-3"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="flex items-center gap-2 mb-4">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      className="h-5 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {brandInitial}
                    </div>
                  )}
                  <span
                    className="text-xs font-semibold text-gray-800"
                    style={{ fontFamily }}
                  >
                    {brand.name}
                  </span>
                </div>
              </div>

              {/* Body - faded lorem ipsum */}
              <div className="px-5 flex-1">
                <div className="space-y-2 opacity-20">
                  <div className="h-1.5 bg-gray-400 rounded w-full" />
                  <div className="h-1.5 bg-gray-400 rounded w-11/12" />
                  <div className="h-1.5 bg-gray-400 rounded w-full" />
                  <div className="h-1.5 bg-gray-400 rounded w-9/12" />
                  <div className="h-1.5 bg-gray-400 rounded w-full" />
                  <div className="h-1.5 bg-gray-400 rounded w-10/12" />
                  <div className="h-1.5 bg-gray-400 rounded w-full" />
                  <div className="h-1.5 bg-gray-400 rounded w-7/12" />
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[8px] text-gray-400"
                    style={{ fontFamily }}
                  >
                    {brand.name}
                  </span>
                </div>
                <div
                  className="w-full h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          {/* Social Media Profile */}
          <div className="group">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 mb-4">
              Social Media Profile
            </h3>
            <div
              className="relative rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-md flex flex-col items-center justify-center"
              style={{
                aspectRatio: '1 / 1',
                backgroundColor: primaryColor,
              }}
            >
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="h-16 w-auto object-contain mb-4 drop-shadow-lg"
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <span
                    className="text-3xl font-bold text-white"
                    style={{ fontFamily }}
                  >
                    {brandInitial}
                  </span>
                </div>
              )}
              <p
                className="text-sm font-semibold text-white/90 tracking-wide"
                style={{ fontFamily }}
              >
                {brand.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplicationsSection;
