import React, { useState } from 'react';
import { FileText, Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { exportAsPDF, exportAsZIP } from '@/shared/services/exportService';

interface AssetsSectionProps {
  brand: Brand;
}

/**
 * Builds a minimal set of guideline slides from the brand data
 * so the export functions have something to work with.
 */
function buildSlidesFromBrand(brand: Brand) {
  const strategy = brand.guidelines?.strategy;
  const colorPalette = brand.guidelines?.colorPalette;
  const typography = brand.guidelines?.typography;
  const voiceAndTone = brand.guidelines?.voiceAndTone;

  return [
    {
      id: 'cover',
      type: 'cover' as const,
      title: brand.name,
      enabled: true,
      content: {
        subtitle: 'Brand Guidelines',
        description: strategy?.mission || '',
      },
    },
    {
      id: 'strategy',
      type: 'strategy' as const,
      title: 'Brand Strategy',
      enabled: true,
      content: {
        mission: strategy?.mission || '',
        vision: strategy?.vision || '',
        values: strategy?.values || [],
      },
    },
    {
      id: 'colors',
      type: 'colors' as const,
      title: 'Color Palette',
      enabled: true,
      content: {
        primary: colorPalette?.primary?.hex || brand.primaryColor || '#000000',
        secondary: colorPalette?.secondary?.hex || brand.secondaryColor || '#666666',
        accent: colorPalette?.accent?.hex || '#007bff',
      },
    },
    {
      id: 'typography',
      type: 'typography' as const,
      title: 'Typography',
      enabled: true,
      content: {
        primaryFont: typography?.primary?.family || brand.fonts?.primary || 'Inter',
        secondaryFont: typography?.secondary?.family || brand.fonts?.secondary || 'Inter',
      },
    },
    {
      id: 'voice',
      type: 'voice' as const,
      title: 'Voice & Tone',
      enabled: true,
      content: {
        voice: voiceAndTone?.brandVoice || brand.tone || '',
        toneDos: voiceAndTone?.doAndDonts?.do || [],
        toneDonts: voiceAndTone?.doAndDonts?.dont || [],
      },
    },
  ];
}

const defaultSettings = {
  template: 'minimal',
  footer: { showPageNumbers: true },
};

export const AssetsSection: React.FC<AssetsSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#6366f1';
  const fontFamily = brand.fonts?.primary || 'sans-serif';

  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingZIP, setLoadingZIP] = useState(false);

  const handleExportPDF = async () => {
    setLoadingPDF(true);
    try {
      const slides = buildSlidesFromBrand(brand);
      await exportAsPDF(brand, slides, defaultSettings);
      toast.success('Brand Guidelines PDF downloaded successfully.');
    } catch {
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setLoadingPDF(false);
    }
  };

  const handleExportZIP = async () => {
    setLoadingZIP(true);
    try {
      const slides = buildSlidesFromBrand(brand);
      await exportAsZIP(brand, slides, defaultSettings);
      toast.success('Brand Kit (ZIP) downloaded successfully.');
    } catch {
      toast.error('Failed to export Brand Kit. Please try again.');
    } finally {
      setLoadingZIP(false);
    }
  };

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
            07
          </span>
        </div>

        {/* Section title */}
        <div className="mb-16 -mt-12 relative z-10">
          <h2
            className="text-4xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily }}
          >
            Assets & Downloads
          </h2>
          <div
            className="mt-3 w-16 h-1 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Download cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand Guidelines PDF */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <FileText
                  className="w-6 h-6"
                  style={{ color: primaryColor }}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Brand Guidelines PDF
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  A comprehensive PDF document containing all brand guidelines,
                  including strategy, colors, typography, and voice.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={loadingPDF}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {loadingPDF ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </span>
              ) : (
                'Download PDF'
              )}
            </button>
          </div>

          {/* Brand Kit ZIP */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Archive
                  className="w-6 h-6"
                  style={{ color: primaryColor }}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Brand Kit (ZIP)
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  A complete brand kit archive with the guidelines PDF,
                  color palette data, brand metadata, and usage notes.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportZIP}
              disabled={loadingZIP}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 border disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              {loadingZIP ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
                  />
                  Exporting...
                </span>
              ) : (
                'Download ZIP'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AssetsSection;
