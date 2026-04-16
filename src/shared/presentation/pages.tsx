/**
 * Reusable Page Layout Components for Presentations
 *
 * 10 content-agnostic slide layouts that adapt to ANY canvas size and any
 * PresentationStyle. All sizing uses container query units (cqi/cqmin) so
 * fonts and spacing scale with the slide itself, not the viewport.
 *
 * Layouts auto-detect orientation: in portrait, two-column layouts stack
 * vertically. The slide always fills its container — no aspect-video lock.
 */

import React from 'react';
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import type { PresentationStyle } from './styles';
import type { PresentationSettings } from './types';

// ── Page Props ─────────────────────────────────────────

export interface PageProps {
  style: PresentationStyle;
  brand: Brand;
  title?: string;
  subtitle?: string;
  body?: string;
  items?: Array<{ title: string; description: string; icon?: string }>;
  /** Alias for items — used by some content builders */
  columns?: Array<{ title: string; body: string; imageUrl?: string }>;
  stats?: Array<{ value: string; label: string }>;
  quote?: string;
  quoteAuthor?: string;
  imageUrl?: string;
  logoUrl?: string;
  sectionNumber?: string;
  sectionLabel?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  contactInfo?: { email?: string; website?: string; phone?: string };
  pageNumber?: number;
  totalPages?: number;
  /** Slide orientation — passed by EditorWorkspace, used to adapt layouts */
  orientation?: 'portrait' | 'landscape' | 'square';
  /** Aspect ratio (width / height) for fine-grained adaptation */
  aspectRatioValue?: number;
  /** User presentation settings — overrides style defaults for spacing/radius */
  settings?: PresentationSettings;
}

// ── Helpers ────────────────────────────────────────────

const fc = (font: 'display' | 'sans' | 'serif' | 'mono'): string => {
  switch (font) {
    case 'display': return 'font-display';
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    default: return 'font-sans';
  }
};

const accent = (s: PresentationStyle, b: Brand): string =>
  s.bgAccent === 'brand' ? b.primaryColor : s.bgAccent;

/**
 * Resolve a clamp() expression into a container-query-relative value.
 * Original used vw (viewport) — we replace with cqi (container inline size)
 * so font sizes scale with the slide, not the viewport.
 */
const cqiSize = (clampExpr: string): string => {
  // Replace 'vw' with 'cqi' inside the clamp expression
  return clampExpr.replace(/vw/g, 'cqi');
};

/** Convert percentage padding string to cqi-based for proportional scaling */
const cqiPadding = (pad: string): string => {
  const match = pad.match(/(\d+(?:\.\d+)?)%?/);
  if (!match) return pad;
  const value = parseFloat(match[1]);
  return `${value}cqi`;
};

/**
 * Compute effective spacing values from user settings.
 * Settings are synced to style defaults when style changes (in EditorWorkspace),
 * then user adjustments override. Either way, settings is the source of truth.
 *
 * - settings.spacing.padding (number from slider 20-120) → cqi value (slider/10)
 * - settings.spacing.margins (number 10-80) → cqi gap (slider/10)
 * - settings.spacing.cornerRadius (number 0-24) → inner card radius in px
 *
 * Falls back to style values when settings unavailable (legacy slide builders).
 */
const useSpacing = (s: PresentationStyle, settings?: PresentationSettings) => {
  if (settings) {
    return {
      padding: `${(settings.spacing.padding / 10).toFixed(1)}cqi`,
      gap: `${(settings.spacing.margins / 10).toFixed(1)}cqi`,
      radius: settings.spacing.cornerRadius,
    };
  }
  // Legacy fallback
  return {
    padding: cqiPadding(s.pagePadding),
    gap: '2cqi',
    radius: s.cardRadius,
  };
};

const Logo: React.FC<{ url?: string; brand: Brand; sizeCqi?: number; className?: string; invert?: boolean }> = ({ url, brand, sizeCqi = 4, className = '', invert }) => {
  const src = url || logoUrl(brand) || logoUrl(brand, 'iconmark');
  if (!src) return null;
  return (
    <img
      src={src}
      alt={brand.name}
      className={`object-contain ${className}`}
      style={{
        height: `${sizeCqi}cqi`,
        maxHeight: `${sizeCqi}cqb`,
        width: 'auto',
        filter: invert ? 'brightness(0) invert(1)' : undefined,
      }}
    />
  );
};

// Base wrapper that fills the slide container completely
const slideClass = 'absolute inset-0 w-full h-full overflow-hidden';

// ── 1. Cover Page ──────────────────────────────────────

export const CoverPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, logoUrl, settings }) => {
  const a = accent(s, brand);
  const { padding: pad } = useSpacing(s, settings);
  const headSize = cqiSize(s.headingSize);
  const bodySize = cqiSize(s.bodySize);
  const labelSize = cqiSize(s.labelSize);

  if (s.coverAlign === 'split') {
    return (
      <div className={`${slideClass} flex`} style={{ backgroundColor: s.bgDark }}>
        <div className="w-1/2 flex flex-col justify-between relative" style={{ padding: pad }}>
          <Logo url={logoUrl} brand={brand} sizeCqi={3.2} invert />
          <div>
            <h1 className={`${fc(s.headingFont)} leading-[0.95]`} style={{ color: s.textOnDark, fontSize: headSize, fontWeight: s.headingWeight }}>{title}</h1>
            {subtitle && <p className={`${fc(s.bodyFont)} mt-[1.5em]`} style={{ color: s.textMuted, fontSize: bodySize }}>{subtitle}</p>}
          </div>
          <div className="flex items-center gap-[0.6em]" style={{ fontSize: labelSize, color: s.textMuted, letterSpacing: s.labelTracking }}>
            <span>{brand.name}</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="w-1/2 relative flex items-center justify-center" style={{ backgroundColor: a }}>
          <div className="absolute inset-0 bg-black/10" />
          {(logoUrl || brand.logo) && <Logo url={logoUrl} brand={brand} sizeCqi={8} invert className="opacity-25" />}
        </div>
      </div>
    );
  }

  if (s.coverAlign === 'left' || s.coverAlign === 'right') {
    return (
      <div className={`${slideClass} flex flex-col justify-between relative`} style={{ backgroundColor: s.bgDark, padding: pad }}>
        <Logo url={logoUrl} brand={brand} sizeCqi={3.2} invert />
        <div style={{ maxWidth: '75%' }}>
          <h1 className={`${fc(s.headingFont)} leading-[0.95]`} style={{ color: s.textOnDark, fontSize: headSize, fontWeight: s.headingWeight }}>{title}</h1>
          {subtitle && <p className={`${fc(s.bodyFont)} mt-[1.5em]`} style={{ color: s.textMuted, fontSize: bodySize }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-[0.6em]" style={{ fontSize: labelSize, color: s.textMuted, letterSpacing: s.labelTracking }}>
          <span>{brand.name}</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{new Date().getFullYear()}</span>
        </div>
        {s.showHeaderRule && <div className="absolute top-0 left-0 right-0" style={{ height: '0.2cqi', background: a }} />}
        <div className="absolute -bottom-[15cqi] -right-[15cqi] rounded-full" style={{ width: '30cqi', height: '30cqi', background: a, opacity: 0.06 }} />
      </div>
    );
  }

  // center (default)
  return (
    <div className={`${slideClass} flex flex-col items-center justify-center text-center relative`} style={{ backgroundColor: s.bgDark, padding: pad }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(ellipse at 50% 60%, ${a} 0%, transparent 70%)` }} />
      <div className="relative z-10 flex flex-col items-center gap-[1em]" style={{ maxWidth: '80%' }}>
        <Logo url={logoUrl} brand={brand} sizeCqi={4} invert className="mb-[1em]" />
        <h1 className={`${fc(s.headingFont)} leading-[1.05]`} style={{ color: s.textOnDark, fontSize: headSize, fontWeight: s.headingWeight }}>{title}</h1>
        {subtitle && <p className={`${fc(s.bodyFont)}`} style={{ color: s.textMuted, fontSize: bodySize, marginTop: '0.5em' }}>{subtitle}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ paddingBottom: pad }}>
        <span style={{ fontSize: labelSize, color: s.textMuted, letterSpacing: s.labelTracking, opacity: 0.5 }}>{brand.name} · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

// ── 2. Section Divider Page ────────────────────────────

export const SectionDividerPage: React.FC<PageProps> = ({ style: s, brand, sectionNumber, sectionLabel, settings }) => {
  const a = accent(s, brand);
  const { padding: pad } = useSpacing(s, settings);
  return (
    <div className={`${slideClass} flex items-center justify-center relative`} style={{ backgroundColor: a, padding: pad }}>
      {sectionNumber && (
        <span className={`absolute select-none ${fc(s.headingFont)} leading-none`} style={{ fontSize: '32cqi', fontWeight: 900, color: '#ffffff', opacity: 0.08 }}>{sectionNumber}</span>
      )}
      <div className="relative z-10 flex flex-col items-center text-center gap-[0.8em]">
        {sectionNumber && <span className={`${fc(s.headingFont)} leading-none`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: '#ffffff' }}>{sectionNumber}</span>}
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: '#ffffff', opacity: 0.85 }}>{sectionLabel}</span>}
      </div>
    </div>
  );
};

// ── 3. Two Column Page ─────────────────────────────────

export const TwoColumnPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, body, imageUrl, sectionLabel, orientation = 'landscape', settings }) => {
  const a = accent(s, brand);
  const { padding: pad, gap, radius } = useSpacing(s, settings);
  const isPortrait = orientation === 'portrait';
  return (
    <div className={`${slideClass} flex`} style={{ backgroundColor: s.bgLight, padding: pad, gap, flexDirection: isPortrait ? 'column' : 'row' }}>
      <div className="flex flex-col justify-center" style={{ flex: isPortrait ? '1 1 auto' : '0 0 55%' }}>
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: a, marginBottom: '1em' }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.bodySize), color: s.textOnLight, opacity: 0.8, marginTop: '0.8em' }}>{subtitle}</p>}
        {body && <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.bodySize), color: s.textMuted, marginTop: '0.8em' }}>{body}</p>}
        {s.showHeaderRule && <div style={{ height: '0.15cqi', background: s.borderColor, opacity: 0.4, marginTop: '1.5em' }} />}
      </div>
      <div className="relative overflow-hidden flex-1" style={{ borderRadius: `${radius}px`, minHeight: 0 }}>
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${a}10` }}>
            <img src={imageUrl} alt="" className="max-w-[70%] max-h-[70%] object-contain" style={{ filter: s.imageFilter }} />
          </div>
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${a}20, ${a}08)` }} />
        )}
      </div>
    </div>
  );
};

// ── 4. Two Column Reverse Page ─────────────────────────

export const TwoColumnReversePage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, body, imageUrl, sectionLabel, orientation = 'landscape', settings }) => {
  const a = accent(s, brand);
  const { padding: pad, gap, radius } = useSpacing(s, settings);
  const isPortrait = orientation === 'portrait';
  return (
    <div className={`${slideClass} flex`} style={{ backgroundColor: s.bgLight, padding: pad, gap, flexDirection: isPortrait ? 'column' : 'row' }}>
      <div className="relative overflow-hidden" style={{ flex: isPortrait ? '1 1 auto' : '0 0 45%', borderRadius: `${radius}px`, minHeight: 0, order: isPortrait ? 2 : 1 }}>
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${a}10` }}>
            <img src={imageUrl} alt="" className="max-w-[70%] max-h-[70%] object-contain" style={{ filter: s.imageFilter }} />
          </div>
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${a}20, ${a}08)` }} />
        )}
      </div>
      <div className="flex flex-col justify-center flex-1" style={{ order: isPortrait ? 1 : 2 }}>
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: a, marginBottom: '1em' }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.bodySize), color: s.textOnLight, opacity: 0.8, marginTop: '0.8em' }}>{subtitle}</p>}
        {body && <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.bodySize), color: s.textMuted, marginTop: '0.8em' }}>{body}</p>}
      </div>
    </div>
  );
};

// ── 5. Full Bleed Image Page ───────────────────────────

export const FullBleedImagePage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, imageUrl, settings }) => {
  const a = accent(s, brand);
  const { padding: pad } = useSpacing(s, settings);
  return (
    <div className={`${slideClass}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: s.imageFilter }} />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${s.bgDark}, ${a})` }} />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${s.overlayOpacity}) 0%, rgba(0,0,0,${s.overlayOpacity * 0.3}) 40%, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 z-10 flex flex-col" style={{ padding: pad, maxWidth: '75%' }}>
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.headingSize), fontWeight: s.headingWeight, color: '#fff' }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)}`} style={{ fontSize: cqiSize(s.bodySize), color: 'rgba(255,255,255,0.8)', marginTop: '0.5em' }}>{subtitle}</p>}
      </div>
    </div>
  );
};

// ── 6. Three Column Page ───────────────────────────────

export const ThreeColumnPage: React.FC<PageProps> = ({ style: s, brand, sectionLabel, title, items, columns, orientation = 'landscape', settings }) => {
  const a = accent(s, brand);
  const { padding: pad, gap, radius } = useSpacing(s, settings);
  const cardData = items?.map(i => ({ title: i.title, desc: i.description }))
    || columns?.map(c => ({ title: c.title, desc: c.body }))
    || [];
  // Adapt columns based on orientation: fewer columns in portrait
  const isPortrait = orientation === 'portrait';
  const cols = isPortrait ? Math.min(2, s.gridColumns) : s.gridColumns;
  const isDarkBg = s.bgLight.startsWith('#1') || s.bgLight.startsWith('#0') || s.bgLight === s.bgDark;
  const cardBg = isDarkBg ? `${s.borderColor}20` : 'transparent';

  return (
    <div className={`${slideClass} flex flex-col`} style={{ backgroundColor: s.bgLight, padding: pad }}>
      <div className="shrink-0">
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: a, marginBottom: '0.5em' }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {s.showHeaderRule && <div style={{ height: '0.15cqi', background: s.borderColor, opacity: 0.4, marginTop: '1em' }} />}
      </div>

      <div
        className="grid flex-1 items-start min-h-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap,
          marginTop: gap,
        }}
      >
        {cardData.slice(0, cols).map((card, i) => (
          <div
            key={i}
            className="flex flex-col h-full overflow-hidden"
            style={{
              backgroundColor: cardBg,
              borderRadius: `${radius}px`,
              boxShadow: s.cardShadow,
              border: s.cardBorder,
              padding: '2cqi',
            }}
          >
            <span className={`${fc(s.headingFont)} mb-[0.5em]`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: 800, color: a, opacity: 0.25, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
            <h3 className={`${fc(s.headingFont)} leading-snug`} style={{ fontSize: cqiSize(s.bodySize), fontWeight: s.headingWeight, color: s.textOnLight }}>{card.title}</h3>
            <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.labelSize), color: s.textMuted, marginTop: '0.5em' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 7. Quote Page ──────────────────────────────────────

export const QuotePage: React.FC<PageProps> = ({ style: s, brand, quote, quoteAuthor, settings }) => {
  const a = accent(s, brand);
  const { padding: pad } = useSpacing(s, settings);
  return (
    <div className={`${slideClass} flex items-center justify-center relative`} style={{ backgroundColor: s.bgDark, padding: pad }}>
      <div className="absolute top-0 left-0 h-full" style={{ width: '0.5cqi', background: a, opacity: 0.4 }} />
      <div className="relative" style={{ maxWidth: '78%' }}>
        <span className={`${fc(s.headingFont)} absolute select-none leading-none`} style={{ fontSize: '18cqi', color: a, opacity: 0.18, top: '-3cqi', left: '-2cqi' }} aria-hidden="true">&ldquo;</span>
        {quote && <blockquote className={`${fc(s.headingFont)} relative z-10 leading-relaxed`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnDark, fontStyle: s.headingFont === 'serif' ? 'italic' : 'normal' }}>{quote}</blockquote>}
        {quoteAuthor && <p className={`${fc(s.bodyFont)}`} style={{ fontSize: cqiSize(s.bodySize), color: s.textMuted, marginTop: '1.5em' }}>&mdash; {quoteAuthor}</p>}
      </div>
    </div>
  );
};

// ── 8. Stats Page ──────────────────────────────────────

export const StatsPage: React.FC<PageProps> = ({ style: s, brand, title, sectionLabel, stats = [], settings }) => {
  const a = accent(s, brand);
  const { padding: pad, gap, radius } = useSpacing(s, settings);
  const displayStats = stats.slice(0, 4);
  const cols = displayStats.length <= 2 ? 2 : displayStats.length;
  const isDarkBg = s.bgLight.startsWith('#1') || s.bgLight.startsWith('#0') || s.bgLight === s.bgDark;
  const cardBg = isDarkBg ? `${s.borderColor}20` : 'transparent';

  return (
    <div className={`${slideClass} flex flex-col`} style={{ backgroundColor: s.bgLight, padding: pad }}>
      <div className="shrink-0">
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: a, marginBottom: '0.5em' }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
      </div>
      <div
        className="grid items-center flex-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap,
          marginTop: gap,
        }}
      >
        {displayStats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center text-center"
            style={{
              borderRadius: `${radius}px`,
              boxShadow: s.cardShadow,
              border: s.cardBorder,
              padding: '3cqi',
              backgroundColor: cardBg,
            }}
          >
            <span className={`${fc(s.headingFont)} leading-none`} style={{ fontSize: cqiSize(s.headingSize), fontWeight: 800, color: a }}>{stat.value}</span>
            <span className={`${fc(s.bodyFont)} uppercase`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: s.textMuted, marginTop: '1em' }}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 9. List Page ───────────────────────────────────────

export const ListPage: React.FC<PageProps> = ({ style: s, brand, title, sectionLabel, items = [], orientation = 'landscape', settings }) => {
  const a = accent(s, brand);
  const { padding: pad, gap } = useSpacing(s, settings);
  const isPortrait = orientation === 'portrait';
  return (
    <div className={`${slideClass} flex`} style={{ backgroundColor: s.bgLight, padding: pad, gap, flexDirection: isPortrait ? 'column' : 'row' }}>
      <div className="flex flex-col justify-center" style={{ flex: isPortrait ? '0 0 auto' : '0 0 35%' }}>
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block`} style={{ fontSize: cqiSize(s.labelSize), letterSpacing: s.labelTracking, color: a, marginBottom: '0.8em' }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {s.showHeaderRule && <div style={{ width: '40%', height: '0.3cqi', background: a, opacity: 0.3, marginTop: '1em' }} />}
      </div>
      <div className="flex flex-col justify-center flex-1 overflow-hidden" style={{ gap: '1.5cqi' }}>
        {items.map((item, i) => (
          <div key={i} className="flex items-start" style={{ gap: '1.5cqi' }}>
            <span className={`${fc(s.headingFont)} shrink-0 leading-none`} style={{ fontSize: cqiSize(s.subheadingSize), fontWeight: 700, color: a, opacity: 0.25, minWidth: '2.5ch', textAlign: 'right' }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ borderLeft: `0.15cqi solid ${a}30`, paddingLeft: '1cqi' }}>
              <h4 className={`${fc(s.headingFont)} leading-snug`} style={{ fontSize: cqiSize(s.bodySize), fontWeight: s.headingWeight, color: s.textOnLight }}>{item.title}</h4>
              <p className={`${fc(s.bodyFont)} leading-relaxed`} style={{ fontSize: cqiSize(s.bodySize), color: s.textMuted, marginTop: '0.3em' }}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 10. Closing Page ───────────────────────────────────

export const ClosingPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, logoUrl, contactInfo, settings }) => {
  const a = accent(s, brand);
  const { padding: pad } = useSpacing(s, settings);
  return (
    <div className={`${slideClass} flex flex-col items-center justify-center relative`} style={{ backgroundColor: s.bgDark, padding: pad }}>
      <div className="absolute inset-0 opacity-[0.05]" style={{ background: `radial-gradient(ellipse at 50% 60%, ${a} 0%, transparent 60%)` }} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Logo url={logoUrl} brand={brand} sizeCqi={5} invert className="mb-[1em]" />
        <h2 className={`${fc(s.headingFont)}`} style={{ fontSize: cqiSize(s.headingSize), fontWeight: s.headingWeight, color: s.textOnDark }}>{title || 'Thank You'}</h2>
        {subtitle && <p className={`${fc(s.bodyFont)}`} style={{ fontSize: cqiSize(s.bodySize), color: s.textMuted, marginTop: '0.6em' }}>{subtitle}</p>}
        <div style={{ width: '4cqi', height: '0.3cqi', background: a, opacity: 0.5, marginTop: '1em' }} />
        <p className={`${fc(s.headingFont)}`} style={{ fontSize: cqiSize(s.bodySize), color: a, fontWeight: 600, opacity: 0.7, marginTop: '1em' }}>{brand.name}</p>
        {contactInfo && (
          <div className={`${fc(s.bodyFont)} flex items-center`} style={{ fontSize: cqiSize(s.labelSize), color: s.textMuted, gap: '2cqi', marginTop: '1.5em' }}>
            {contactInfo.email && <span>{contactInfo.email}</span>}
            {contactInfo.website && <span>{contactInfo.website}</span>}
            {contactInfo.phone && <span>{contactInfo.phone}</span>}
          </div>
        )}
      </div>
      {s.showFooterRule && <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '6cqi', width: '25%', height: '0.15cqi', background: s.borderColor, opacity: 0.2 }} />}
    </div>
  );
};
