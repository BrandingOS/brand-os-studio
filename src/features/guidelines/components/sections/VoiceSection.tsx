import React from 'react';
import { Check, X } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface VoiceSectionProps {
  brand: Brand;
}

const DEFAULT_DOS = [
  'Be clear and direct',
  'Use active voice',
  'Stay positive and encouraging',
  'Speak to the reader',
];

const DEFAULT_DONTS = [
  'Use jargon or buzzwords',
  'Be overly formal',
  'Make assumptions',
  'Use passive voice',
];

const DEFAULT_PERSONALITY = ['Professional', 'Innovative', 'Trustworthy'];

export const VoiceSection: React.FC<VoiceSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#1a1a2e';

  const personality =
    brand.guidelines?.strategy?.personality ||
    brand.guidelines?.voiceAndTone?.toneAttributes ||
    DEFAULT_PERSONALITY;

  const toneDescription =
    brand.tone ||
    brand.guidelines?.voiceAndTone?.brandVoice ||
    'Our brand voice is a reflection of who we are. It shapes every interaction, ensuring consistency across all touchpoints.';

  const doItems = brand.guidelines?.voiceAndTone?.doAndDonts?.do || DEFAULT_DOS;
  const dontItems = brand.guidelines?.voiceAndTone?.doAndDonts?.dont || DEFAULT_DONTS;

  const communicationStyle =
    brand.guidelines?.voiceAndTone?.communicationStyle ||
    'Maintain a consistent, approachable tone in all communications. Adapt the level of formality to the context while keeping the core brand personality intact.';

  return (
    <section className="relative py-32 px-6 md:px-16 lg:px-24 bg-gray-50 dark:bg-gray-950">
      {/* Section number */}
      <div className="mb-16">
        <span className="text-[8rem] md:text-[10rem] font-bold leading-none text-gray-200/60 dark:text-gray-800/40 select-none">
          05
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white -mt-10 ml-1 tracking-tight">
          Voice & Tone
        </h2>
        <div
          className="w-16 h-1 rounded-full mt-6 ml-1"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Brand personality pills */}
      <div className="mb-16">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
          Brand Personality
        </h3>
        <div className="flex flex-wrap gap-3">
          {personality.map((trait) => (
            <span
              key={trait}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Tone description — quote block */}
      <div className="mb-20">
        <div
          className="relative pl-8 py-6 rounded-r-xl bg-white dark:bg-gray-900 border-l-4"
          style={{ borderLeftColor: primaryColor }}
        >
          <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300 italic">
            "{toneDescription}"
          </p>
        </div>
      </div>

      {/* Do / Don't split panel */}
      <div className="mb-20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
          Writing Guidelines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DO column */}
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
            <div className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/30">
              <h4 className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
                Do
              </h4>
            </div>
            <ul className="p-6 space-y-4">
              {doItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DON'T column */}
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
            <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30">
              <h4 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <X size={18} className="text-red-600 dark:text-red-400" />
                Don't
              </h4>
            </div>
            <ul className="p-6 space-y-4">
              {dontItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <X size={12} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Communication style info block */}
      <div className="rounded-2xl p-8 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Communication Style
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {communicationStyle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VoiceSection;
