import { useEffect } from 'react';
import { loadFontFamily } from '@/shared/design-system/fonts';
import type { GeneratedBrand } from '../types';

interface LivePreviewProps {
  brand: GeneratedBrand;
  device: 'desktop' | 'mobile';
}

export function LivePreview({ brand, device }: LivePreviewProps) {
  useEffect(() => {
    loadFontFamily(brand.fonts.heading);
    loadFontFamily(brand.fonts.body);
  }, [brand.fonts.heading, brand.fonts.body]);

  const { colors, fonts, name, tagline } = brand;
  const bg = colors.neutrals[0] ?? '#FFFFFF';
  const fg = colors.neutrals[colors.neutrals.length - 1] ?? '#0A0A0A';
  const muted = colors.neutrals[2] ?? '#6B7280';
  const border = colors.neutrals[1] ?? '#E5E7EB';

  const containerClass =
    device === 'mobile'
      ? 'max-w-sm mx-auto rounded-[2rem] border-[10px] border-neutral-900 shadow-2xl overflow-hidden'
      : 'rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden';

  return (
    <div
      className={containerClass}
      style={{
        background: bg,
        color: fg,
        fontFamily: `'${fonts.body}', sans-serif`,
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: `'${fonts.heading}', sans-serif`, color: colors.primary }}
        >
          {name.toLowerCase()}
        </div>
        {device === 'desktop' && (
          <nav className="flex items-center gap-5 text-sm" style={{ color: muted }}>
            <span>Product</span>
            <span>About</span>
            <span>Pricing</span>
          </nav>
        )}
        <button
          type="button"
          className="text-xs md:text-sm font-medium px-3 md:px-4 py-1.5 md:py-2 rounded-lg"
          style={{ background: colors.primary, color: bg }}
        >
          Get started
        </button>
      </div>

      <div className="px-6 py-10 md:px-10 md:py-14">
        <div
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mb-5"
          style={{
            background: `${colors.accent}22`,
            color: colors.accent,
            fontWeight: 600,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: colors.accent }}
          />
          New
        </div>
        <h1
          className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]"
          style={{ fontFamily: `'${fonts.heading}', sans-serif` }}
        >
          {tagline}
        </h1>
        <p
          className="text-sm md:text-base max-w-md leading-relaxed mb-6"
          style={{ color: muted }}
        >
          {brand.audience.shortDescription}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="text-sm font-semibold px-4 py-2.5 rounded-lg"
            style={{ background: colors.primary, color: bg }}
          >
            Start free
          </button>
          <button
            type="button"
            className="text-sm font-semibold px-4 py-2.5 rounded-lg border"
            style={{ borderColor: border, color: fg, background: 'transparent' }}
          >
            Learn more
          </button>
        </div>
      </div>

      <div
        className="px-6 md:px-10 pb-10 pt-6 grid grid-cols-2 gap-4"
        style={{ borderTop: `1px solid ${border}` }}
      >
        {brand.personality.values.map((value, i) => {
          const dotColor = [colors.primary, colors.secondary, colors.accent][i % 3];
          return (
            <div key={value} className="pt-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-xs font-bold"
                style={{ background: `${dotColor}22`, color: dotColor }}
              >
                {value[0]}
              </div>
              <div
                className="text-base font-semibold mb-1"
                style={{ fontFamily: `'${fonts.heading}', sans-serif` }}
              >
                {value}
              </div>
              <div className="text-xs" style={{ color: muted }}>
                Why it matters to us.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
