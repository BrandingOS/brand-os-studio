import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';

interface ColorSectionProps {
  brand: Brand;
}

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : '0, 0, 0';
}

function isLightColor(hex: string): boolean {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5;
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center justify-between w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-gray-200/10 transition-all duration-200 text-left"
    >
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">{label}</span>
        <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
      </div>
      {copied ? (
        <Check size={14} className="text-emerald-500 shrink-0" />
      ) : (
        <Copy size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </button>
  );
}

function ColorSwatchCard({
  color,
  name,
  usage,
}: {
  color: string;
  name: string;
  usage?: string;
}) {
  const light = isLightColor(color);
  const hex = color.startsWith('#') ? color : `#${color}`;
  const rgb = hexToRgb(hex);

  return (
    <div className="group rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Large swatch */}
      <div
        className="h-40 w-full relative"
        style={{ backgroundColor: hex }}
      >
        <span
          className="absolute bottom-3 left-4 text-xs font-mono tracking-wider uppercase opacity-60"
          style={{ color: light ? '#000' : '#fff' }}
        >
          {name}
        </span>
      </div>

      {/* Color values */}
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{name}</h4>
        {usage && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{usage}</p>
        )}
        <div className="space-y-2">
          <CopyableValue label="HEX" value={hex.toUpperCase()} />
          <CopyableValue label="RGB" value={`rgb(${rgb})`} />
        </div>
      </div>
    </div>
  );
}

export const ColorSection: React.FC<ColorSectionProps> = ({ brand }) => {
  const primaryColor = brand.primaryColor || '#1a1a2e';
  const secondaryColor = brand.secondaryColor || '#e94560';
  const accentColor =
    brand.guidelines?.colorPalette?.accent?.hex || brand.secondaryColor || '#16213e';

  const primaryName =
    brand.guidelines?.colorPalette?.primary?.name || 'Primary';
  const secondaryName =
    brand.guidelines?.colorPalette?.secondary?.name || 'Secondary';
  const accentName =
    brand.guidelines?.colorPalette?.accent?.name || 'Accent';

  const primaryUsage =
    brand.guidelines?.colorPalette?.primary?.usage || 'Main brand color used across key touchpoints';
  const secondaryUsage =
    brand.guidelines?.colorPalette?.secondary?.usage || 'Supporting color for accents and highlights';
  const accentUsage =
    brand.guidelines?.colorPalette?.accent?.usage || 'Complementary accent for variety';

  const neutrals = [
    { hex: '#FFFFFF', label: 'White' },
    { hex: '#F5F5F5', label: 'Light Gray' },
    { hex: '#9CA3AF', label: 'Mid Gray' },
    { hex: '#374151', label: 'Dark Gray' },
    { hex: '#111111', label: 'Black' },
  ];

  const usageRules = [
    {
      title: 'Primary',
      description: 'Headlines & CTAs',
      color: primaryColor,
    },
    {
      title: 'Secondary',
      description: 'Accents & Highlights',
      color: secondaryColor,
    },
    {
      title: 'Neutral',
      description: 'Body text & backgrounds',
      color: '#374151',
    },
  ];

  return (
    <section className="relative py-32 px-6 md:px-16 lg:px-24 bg-gray-50 dark:bg-gray-950">
      {/* Section number */}
      <div className="mb-16">
        <span className="text-[8rem] md:text-[10rem] font-bold leading-none text-gray-200/60 dark:text-gray-800/40 select-none">
          03
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white -mt-10 ml-1 tracking-tight">
          Color Palette
        </h2>
        <div
          className="w-16 h-1 rounded-full mt-6 ml-1"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Main color swatches — 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        <ColorSwatchCard color={primaryColor} name={primaryName} usage={primaryUsage} />
        <ColorSwatchCard color={secondaryColor} name={secondaryName} usage={secondaryUsage} />
        <ColorSwatchCard color={accentColor} name={accentName} usage={accentUsage} />
      </div>

      {/* Neutral palette strip */}
      <div className="mb-20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
          Neutral Palette
        </h3>
        <div className="flex rounded-2xl overflow-hidden shadow-sm border border-gray-200/60 dark:border-gray-700/40">
          {neutrals.map((n) => (
            <div
              key={n.hex}
              className="flex-1 h-20 relative group cursor-pointer"
              style={{ backgroundColor: n.hex }}
              onClick={async () => {
                await navigator.clipboard.writeText(n.hex);
                toast.success(`${n.label} copied`);
              }}
            >
              <div
                className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: isLightColor(n.hex) ? '#000' : '#fff' }}
              >
                <span className="text-[10px] font-mono font-medium">{n.hex}</span>
                <span className="text-[9px] mt-0.5 opacity-60">{n.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          {neutrals.map((n) => (
            <div key={n.hex} className="flex-1 text-center">
              <span className="text-[10px] font-mono text-gray-400">{n.hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color usage rules */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
          Color Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usageRules.map((rule) => (
            <div
              key={rule.title}
              className="flex items-start gap-4 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/40 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-lg shrink-0 shadow-inner"
                style={{ backgroundColor: rule.color }}
              />
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {rule.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ColorSection;
