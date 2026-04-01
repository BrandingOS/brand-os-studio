import React, { useEffect } from 'react';
import type { Brand } from '@/shared/types/brand';

interface TypographySectionProps {
  brand: Brand;
}

function loadGoogleFont(fontName: string) {
  const id = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

const typeScale = [
  { label: 'H1', size: '48px', weight: 700, weightLabel: 'Bold', sample: 'The quick brown fox' },
  { label: 'H2', size: '36px', weight: 600, weightLabel: 'SemiBold', sample: 'The quick brown fox' },
  { label: 'H3', size: '24px', weight: 500, weightLabel: 'Medium', sample: 'The quick brown fox' },
  { label: 'H4', size: '20px', weight: 500, weightLabel: 'Medium', sample: 'The quick brown fox' },
  { label: 'Body', size: '16px', weight: 400, weightLabel: 'Regular', sample: 'The quick brown fox jumps over the lazy dog' },
  { label: 'Small', size: '14px', weight: 400, weightLabel: 'Regular', sample: 'Supporting text and captions' },
];

function FontSpecimenCard({
  fontFamily,
  fontLabel,
  weights,
  brandColor,
}: {
  fontFamily: string;
  fontLabel: string;
  weights?: number[];
  brandColor: string;
}) {
  const displayWeights = weights?.length ? weights : [300, 400, 500, 600, 700];

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
      {/* Large Aa specimen */}
      <div
        className="px-8 pt-10 pb-8 border-b border-gray-100 dark:border-gray-800"
        style={{ fontFamily: `'${fontFamily}', sans-serif` }}
      >
        <span
          className="block leading-none font-bold text-gray-900 dark:text-white"
          style={{ fontSize: '6rem', fontFamily: `'${fontFamily}', sans-serif` }}
        >
          Aa
        </span>
      </div>

      <div className="p-8 space-y-6">
        {/* Font name */}
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">{fontLabel}</h4>
        </div>

        {/* Alphabet */}
        <div
          className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-mono space-y-1"
          style={{ fontFamily: `'${fontFamily}', sans-serif` }}
        >
          <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p>abcdefghijklmnopqrstuvwxyz</p>
          <p>0123456789</p>
        </div>

        {/* Weights showcase */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
            Weights
          </span>
          <div className="flex flex-wrap gap-2">
            {displayWeights.map((w) => (
              <span
                key={w}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                style={{ fontFamily: `'${fontFamily}', sans-serif`, fontWeight: w }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const TypographySection: React.FC<TypographySectionProps> = ({ brand }) => {
  const primaryFont = brand.fonts?.primary || 'Inter';
  const secondaryFont = brand.fonts?.secondary || 'Inter';
  const primaryColor = brand.primaryColor || '#1a1a2e';

  const primaryWeights = brand.guidelines?.typography?.primary?.weights;
  const secondaryWeights = brand.guidelines?.typography?.secondary?.weights;

  useEffect(() => {
    loadGoogleFont(primaryFont);
    if (secondaryFont && secondaryFont !== primaryFont) {
      loadGoogleFont(secondaryFont);
    }
  }, [primaryFont, secondaryFont]);

  return (
    <section className="relative py-32 px-6 md:px-16 lg:px-24 bg-white dark:bg-gray-950">
      {/* Section number */}
      <div className="mb-16">
        <span className="text-[8rem] md:text-[10rem] font-bold leading-none text-gray-200/60 dark:text-gray-800/40 select-none">
          04
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white -mt-10 ml-1 tracking-tight">
          Typography
        </h2>
        <div
          className="w-16 h-1 rounded-full mt-6 ml-1"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Font specimen cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <FontSpecimenCard
          fontFamily={primaryFont}
          fontLabel={primaryFont}
          weights={primaryWeights}
          brandColor={primaryColor}
        />
        <FontSpecimenCard
          fontFamily={secondaryFont}
          fontLabel={secondaryFont}
          weights={secondaryWeights}
          brandColor={primaryColor}
        />
      </div>

      {/* Type scale showcase */}
      <div className="mb-20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-8 tracking-tight">
          Type Scale
        </h3>
        <div className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40">
          {typeScale.map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8 px-8 py-6 ${
                index < typeScale.length - 1
                  ? 'border-b border-gray-200/60 dark:border-gray-700/30'
                  : ''
              }`}
            >
              {/* Label column */}
              <div className="flex items-baseline gap-3 shrink-0 md:w-48">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400 w-12">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {item.size} / {item.weightLabel}
                </span>
              </div>

              {/* Sample text */}
              <p
                className="text-gray-900 dark:text-white truncate"
                style={{
                  fontFamily: `'${primaryFont}', sans-serif`,
                  fontSize: item.size,
                  fontWeight: item.weight,
                  lineHeight: 1.3,
                }}
              >
                {item.sample}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage guidelines */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
          Usage Guidelines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Aa
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Headings</h4>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use <span className="font-semibold text-gray-700 dark:text-gray-300">{primaryFont}</span> for
              all headings and display text. Maintain consistent weight hierarchy across pages.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gray-600">
                Aa
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Body</h4>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use <span className="font-semibold text-gray-700 dark:text-gray-300">{secondaryFont}</span> for
              body copy, paragraphs, and UI elements. Prioritize readability at smaller sizes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TypographySection;
