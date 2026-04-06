/**
 * Reusable Page Layout Components for Presentations
 *
 * 10 content-agnostic slide layouts that work with ANY PresentationStyle.
 * Layouts arrange content areas; all visual styling (colors, radii, typography,
 * spacing) is driven by the `style` prop so the same layouts can power
 * different visual themes.
 */

import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { PresentationStyle } from './styles';

// ── Page Props ─────────────────────────────────────────

export interface PageProps {
  style: PresentationStyle;
  brand: Brand;
  title?: string;
  subtitle?: string;
  body?: string;
  items?: Array<{ title: string; description: string; icon?: string }>;
  stats?: Array<{ value: string; label: string }>;
  quote?: string;
  quoteAuthor?: string;
  imageUrl?: string;
  logoUrl?: string;
  sectionNumber?: string;
  sectionLabel?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  columns?: Array<{ title: string; body: string; imageUrl?: string }>;
  contactInfo?: { email?: string; website?: string; phone?: string };
  pageNumber?: number;
  totalPages?: number;
}

// ── Helpers ────────────────────────────────────────────

const fontClass = (font: 'display' | 'sans' | 'serif' | 'mono'): string => {
  switch (font) {
    case 'display': return 'font-display';
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    default: return 'font-sans';
  }
};

/** Resolve the accent color — 'brand' maps to the brand's primary color */
const resolveAccent = (bgAccent: string, brand: Brand): string =>
  bgAccent === 'brand' ? brand.primaryColor : bgAccent;

const Logo: React.FC<{
  logoUrl?: string;
  brand: Brand;
  size?: number;
  className?: string;
}> = ({ logoUrl, brand, size = 36, className = '' }) => {
  const src = logoUrl || brand.logo || brand.logoAssets?.full || brand.logoAssets?.icon;
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`${brand.name} logo`}
      className={`object-contain ${className}`}
      style={{ height: size, width: 'auto' }}
    />
  );
};

// ── 1. Cover Page ──────────────────────────────────────

export const CoverPage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  subtitle,
  logoUrl,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  const renderCenter = () => (
    <div
      className="w-full aspect-video relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: style.bgDark,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${accent} 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-[75%]">
        <Logo logoUrl={logoUrl} brand={brand} size={48} className="mb-4" />
        <h1
          className={`${fontClass(style.headingFont)} leading-tight`}
          style={{
            color: style.textOnDark,
            fontSize: style.headingSize,
            fontWeight: style.headingWeight,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`${fontClass(style.bodyFont)} mt-2`}
            style={{ color: style.textMuted, fontSize: style.bodySize }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  const renderLeft = () => (
    <div
      className="w-full aspect-video relative flex overflow-hidden"
      style={{
        backgroundColor: style.bgDark,
        borderRadius: style.cornerRadius,
      }}
    >
      {/* Text side */}
      <div
        className="relative z-10 flex flex-col justify-end w-[60%]"
        style={{ padding: style.pagePadding }}
      >
        <Logo logoUrl={logoUrl} brand={brand} size={40} className="mb-auto" />
        <h1
          className={`${fontClass(style.headingFont)} leading-[1.1]`}
          style={{
            color: style.textOnDark,
            fontSize: style.headingSize,
            fontWeight: style.headingWeight,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`${fontClass(style.bodyFont)} mt-4`}
            style={{ color: style.textMuted, fontSize: style.bodySize }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {/* Accent block */}
      <div
        className="absolute right-0 top-0 h-full w-[35%]"
        style={{
          backgroundColor: accent,
          borderTopLeftRadius: style.cornerRadius * 2,
          borderBottomLeftRadius: style.cornerRadius * 2,
          opacity: 0.15,
        }}
      />
    </div>
  );

  const renderSplit = () => (
    <div
      className="w-full aspect-video relative flex overflow-hidden"
      style={{ borderRadius: style.cornerRadius }}
    >
      {/* Left: dark with title */}
      <div
        className="w-1/2 flex flex-col justify-end relative"
        style={{ backgroundColor: style.bgDark, padding: style.pagePadding }}
      >
        <Logo logoUrl={logoUrl} brand={brand} size={40} className="mb-auto" />
        <h1
          className={`${fontClass(style.headingFont)} leading-[1.1]`}
          style={{
            color: style.textOnDark,
            fontSize: style.headingSize,
            fontWeight: style.headingWeight,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`${fontClass(style.bodyFont)} mt-4`}
            style={{ color: style.textMuted, fontSize: style.bodySize }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {/* Right: accent / image */}
      <div className="w-1/2 relative" style={{ backgroundColor: accent }}>
        {/* decorative accent fill */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundColor: style.bgDark }} />
      </div>
    </div>
  );

  switch (style.coverAlign) {
    case 'left': return renderLeft();
    case 'split': return renderSplit();
    case 'right': return renderLeft(); // mirrored intent, same layout
    default: return renderCenter();
  }
};

// ── 2. Section Divider Page ────────────────────────────

export const SectionDividerPage: React.FC<PageProps> = ({
  style,
  brand,
  sectionNumber,
  sectionLabel,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: accent,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      {/* Big number background */}
      {sectionNumber && (
        <span
          className={`absolute select-none ${fontClass(style.headingFont)} leading-none`}
          style={{
            fontSize: '200px',
            fontWeight: 900,
            color: style.textOnDark,
            opacity: 0.08,
          }}
        >
          {sectionNumber}
        </span>
      )}

      {/* Label */}
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        {sectionNumber && (
          <span
            className={`${fontClass(style.headingFont)} leading-none`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnDark,
            }}
          >
            {sectionNumber}
          </span>
        )}
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: style.textOnDark,
              opacity: 0.85,
            }}
          >
            {sectionLabel}
          </span>
        )}
      </div>
    </div>
  );
};

// ── 3. Two Column Page ─────────────────────────────────

export const TwoColumnPage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  body,
  imageUrl,
  sectionLabel,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex overflow-hidden"
      style={{
        backgroundColor: style.bgLight,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
        gap: style.contentGap,
      }}
    >
      {/* Text side — 55% */}
      <div className="flex flex-col justify-center" style={{ flex: '0 0 55%' }}>
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase mb-4 block`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: accent,
            }}
          >
            {sectionLabel}
          </span>
        )}
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnLight,
            }}
          >
            {title}
          </h2>
        )}
        {body && (
          <p
            className={`${fontClass(style.bodyFont)} mt-4 leading-relaxed`}
            style={{ fontSize: style.bodySize, color: style.textMuted }}
          >
            {body}
          </p>
        )}
      </div>

      {/* Image / accent side — 45% */}
      <div
        className="relative overflow-hidden flex-1"
        style={{ borderRadius: style.cardRadius }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: style.imageFilter }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: accent, opacity: 0.12 }}
          />
        )}
      </div>
    </div>
  );
};

// ── 4. Two Column Reverse Page ─────────────────────────

export const TwoColumnReversePage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  body,
  imageUrl,
  sectionLabel,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex overflow-hidden"
      style={{
        backgroundColor: style.bgLight,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
        gap: style.contentGap,
      }}
    >
      {/* Image / accent side — 45% */}
      <div
        className="relative overflow-hidden"
        style={{ flex: '0 0 45%', borderRadius: style.cardRadius }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: style.imageFilter }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: accent, opacity: 0.12 }}
          />
        )}
      </div>

      {/* Text side — 55% */}
      <div className="flex flex-col justify-center flex-1">
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase mb-4 block`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: accent,
            }}
          >
            {sectionLabel}
          </span>
        )}
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnLight,
            }}
          >
            {title}
          </h2>
        )}
        {body && (
          <p
            className={`${fontClass(style.bodyFont)} mt-4 leading-relaxed`}
            style={{ fontSize: style.bodySize, color: style.textMuted }}
          >
            {body}
          </p>
        )}
      </div>
    </div>
  );
};

// ── 5. Full Bleed Image Page ───────────────────────────

export const FullBleedImagePage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  subtitle,
  imageUrl,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative overflow-hidden"
      style={{ borderRadius: style.cornerRadius }}
    >
      {/* Background image or accent fill */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: style.imageFilter }}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: accent }} />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${style.overlayOpacity}) 0%, rgba(0,0,0,${style.overlayOpacity * 0.4}) 40%, transparent 70%)`,
        }}
      />

      {/* Title overlay bottom-left */}
      <div
        className="absolute bottom-0 left-0 z-10 flex flex-col"
        style={{ padding: style.pagePadding, maxWidth: '70%' }}
      >
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.headingSize,
              fontWeight: style.headingWeight,
              color: '#ffffff',
            }}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            className={`${fontClass(style.bodyFont)} mt-2`}
            style={{ fontSize: style.bodySize, color: 'rgba(255,255,255,0.8)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// ── 6. Three Column Page ───────────────────────────────

export const ThreeColumnPage: React.FC<PageProps> = ({
  style,
  brand,
  sectionLabel,
  title,
  items = [],
}) => {
  const accent = resolveAccent(style.bgAccent, brand);
  const cols = style.gridColumns;

  return (
    <div
      className="w-full aspect-video relative flex flex-col overflow-hidden"
      style={{
        backgroundColor: style.bgLight,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      {/* Header */}
      <div className="mb-auto">
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase block mb-2`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: accent,
            }}
          >
            {sectionLabel}
          </span>
        )}
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnLight,
            }}
          >
            {title}
          </h2>
        )}
        {style.showHeaderRule && (
          <div className="mt-4" style={{ height: 1, backgroundColor: style.borderColor }} />
        )}
      </div>

      {/* Cards grid */}
      <div
        className="grid flex-1 items-start"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: style.contentGap,
          marginTop: style.contentGap,
        }}
      >
        {items.slice(0, cols).map((item, i) => (
          <div
            key={i}
            className="flex flex-col h-full"
            style={{
              backgroundColor: style.bgLight,
              borderRadius: style.cardRadius,
              boxShadow: style.cardShadow,
              border: style.cardBorder,
              padding: style.pagePadding,
            }}
          >
            {item.icon && (
              <span className="text-2xl mb-3">{item.icon}</span>
            )}
            <h3
              className={`${fontClass(style.headingFont)} leading-snug`}
              style={{
                fontSize: style.bodySize,
                fontWeight: style.headingWeight,
                color: style.textOnLight,
              }}
            >
              {item.title}
            </h3>
            <p
              className={`${fontClass(style.bodyFont)} mt-2 leading-relaxed`}
              style={{ fontSize: style.labelSize, color: style.textMuted }}
            >
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 7. Quote Page ──────────────────────────────────────

export const QuotePage: React.FC<PageProps> = ({
  style,
  brand,
  quote,
  quoteAuthor,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: style.bgDark,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      <div className="relative max-w-[75%] text-center">
        {/* Quotation mark */}
        <span
          className={`${fontClass(style.headingFont)} absolute -top-10 -left-6 select-none leading-none`}
          style={{ fontSize: '120px', color: accent, opacity: 0.35 }}
          aria-hidden="true"
        >
          &ldquo;
        </span>

        {quote && (
          <blockquote
            className={`${fontClass(style.headingFont)} relative z-10 leading-relaxed italic`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnDark,
            }}
          >
            {quote}
          </blockquote>
        )}

        {quoteAuthor && (
          <p
            className={`${fontClass(style.bodyFont)} mt-6`}
            style={{ fontSize: style.bodySize, color: style.textMuted }}
          >
            &mdash; {quoteAuthor}
          </p>
        )}
      </div>
    </div>
  );
};

// ── 8. Stats Page ──────────────────────────────────────

export const StatsPage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  sectionLabel,
  stats = [],
}) => {
  const accent = resolveAccent(style.bgAccent, brand);
  const displayStats = stats.slice(0, 4);
  const cols = displayStats.length <= 2 ? 2 : displayStats.length;

  return (
    <div
      className="w-full aspect-video relative flex flex-col overflow-hidden"
      style={{
        backgroundColor: style.bgLight,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      {/* Header */}
      <div className="mb-auto">
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase block mb-2`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: accent,
            }}
          >
            {sectionLabel}
          </span>
        )}
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnLight,
            }}
          >
            {title}
          </h2>
        )}
      </div>

      {/* Stats grid */}
      <div
        className="grid items-center flex-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: style.contentGap,
          marginTop: style.contentGap,
        }}
      >
        {displayStats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center text-center"
            style={{
              borderRadius: style.cardRadius,
              boxShadow: style.cardShadow,
              border: style.cardBorder,
              padding: style.pagePadding,
              backgroundColor: style.bgLight,
            }}
          >
            <span
              className={`${fontClass(style.headingFont)} leading-none`}
              style={{
                fontSize: style.headingSize,
                fontWeight: 800,
                color: accent,
              }}
            >
              {stat.value}
            </span>
            <span
              className={`${fontClass(style.bodyFont)} mt-3 uppercase`}
              style={{
                fontSize: style.labelSize,
                letterSpacing: style.labelTracking,
                color: style.textMuted,
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 9. List Page ───────────────────────────────────────

export const ListPage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  sectionLabel,
  items = [],
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex overflow-hidden"
      style={{
        backgroundColor: style.bgLight,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
        gap: style.contentGap,
      }}
    >
      {/* Left: title */}
      <div className="flex flex-col justify-center" style={{ flex: '0 0 35%' }}>
        {sectionLabel && (
          <span
            className={`${fontClass(style.bodyFont)} uppercase block mb-3`}
            style={{
              fontSize: style.labelSize,
              letterSpacing: style.labelTracking,
              color: accent,
            }}
          >
            {sectionLabel}
          </span>
        )}
        {title && (
          <h2
            className={`${fontClass(style.headingFont)} leading-tight`}
            style={{
              fontSize: style.subheadingSize,
              fontWeight: style.headingWeight,
              color: style.textOnLight,
            }}
          >
            {title}
          </h2>
        )}
      </div>

      {/* Right: numbered list */}
      <div className="flex flex-col justify-center flex-1 gap-5 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            {/* Number */}
            <span
              className={`${fontClass(style.headingFont)} shrink-0 leading-none`}
              style={{
                fontSize: style.subheadingSize,
                fontWeight: 700,
                color: accent,
                opacity: 0.3,
                minWidth: '2ch',
                textAlign: 'right',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <div>
              <h4
                className={`${fontClass(style.headingFont)} leading-snug`}
                style={{
                  fontSize: style.bodySize,
                  fontWeight: style.headingWeight,
                  color: style.textOnLight,
                }}
              >
                {item.title}
              </h4>
              <p
                className={`${fontClass(style.bodyFont)} mt-1 leading-relaxed`}
                style={{ fontSize: style.bodySize, color: style.textMuted }}
              >
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 10. Closing Page ───────────────────────────────────

export const ClosingPage: React.FC<PageProps> = ({
  style,
  brand,
  title,
  subtitle,
  logoUrl,
  contactInfo,
}) => {
  const accent = resolveAccent(style.bgAccent, brand);

  return (
    <div
      className="w-full aspect-video relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: style.bgDark,
        borderRadius: style.cornerRadius,
        padding: style.pagePadding,
      }}
    >
      <Logo logoUrl={logoUrl} brand={brand} size={56} className="mb-6" />

      <h2
        className={`${fontClass(style.headingFont)} text-center`}
        style={{
          fontSize: style.headingSize,
          fontWeight: 700,
          color: style.textOnDark,
        }}
      >
        {title || 'Thank You'}
      </h2>

      {subtitle && (
        <p
          className={`${fontClass(style.bodyFont)} mt-3 text-center`}
          style={{ fontSize: style.bodySize, color: style.textMuted }}
        >
          {subtitle}
        </p>
      )}

      <p
        className={`${fontClass(style.headingFont)} mt-4`}
        style={{ fontSize: style.bodySize, color: accent, fontWeight: 600 }}
      >
        {brand.name}
      </p>

      {/* Contact info */}
      {contactInfo && (
        <div
          className={`${fontClass(style.bodyFont)} mt-6 flex items-center gap-6`}
          style={{ fontSize: style.labelSize, color: style.textMuted }}
        >
          {contactInfo.email && <span>{contactInfo.email}</span>}
          {contactInfo.website && <span>{contactInfo.website}</span>}
          {contactInfo.phone && <span>{contactInfo.phone}</span>}
        </div>
      )}

      {/* Subtle footer rule */}
      {style.showFooterRule && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ width: '30%', height: 1, backgroundColor: style.borderColor, opacity: 0.3 }}
        />
      )}
    </div>
  );
};
