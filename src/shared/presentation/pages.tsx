/**
 * Reusable Page Layout Components for Presentations
 *
 * 10 content-agnostic slide layouts that work with ANY PresentationStyle.
 * All visual styling (colors, radii, typography, spacing) is driven by the
 * `style` prop so the same layouts produce different visual results per style.
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

const Logo: React.FC<{ url?: string; brand: Brand; size?: number; className?: string; invert?: boolean }> = ({ url, brand, size = 36, className = '', invert }) => {
  const src = url || brand.logo || brand.logoAssets?.full || brand.logoAssets?.icon;
  if (!src) return null;
  return <img src={src} alt={brand.name} className={`object-contain ${className}`} style={{ height: size, width: 'auto', filter: invert ? 'brightness(0) invert(1)' : undefined }} />;
};

// ── 1. Cover Page ──────────────────────────────────────

export const CoverPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, logoUrl }) => {
  const a = accent(s, brand);

  if (s.coverAlign === 'split') {
    return (
      <div className="w-full aspect-video flex overflow-hidden" style={{ borderRadius: s.cornerRadius }}>
        <div className="w-1/2 flex flex-col justify-between relative" style={{ backgroundColor: s.bgDark, padding: s.pagePadding }}>
          <Logo url={logoUrl} brand={brand} size={32} invert />
          <div>
            <h1 className={`${fc(s.headingFont)} leading-[0.95]`} style={{ color: s.textOnDark, fontSize: s.headingSize, fontWeight: s.headingWeight }}>{title}</h1>
            {subtitle && <p className={`${fc(s.bodyFont)} mt-4`} style={{ color: s.textMuted, fontSize: s.bodySize }}>{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3" style={{ fontSize: s.labelSize, color: s.textMuted, letterSpacing: s.labelTracking }}>
            <span>{brand.name}</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="w-1/2 relative" style={{ backgroundColor: a }}>
          <div className="absolute inset-0 bg-black/10" />
          {logoUrl && <div className="absolute inset-0 flex items-center justify-center"><Logo url={logoUrl} brand={brand} size={80} invert className="opacity-20" /></div>}
        </div>
      </div>
    );
  }

  if (s.coverAlign === 'left' || s.coverAlign === 'right') {
    return (
      <div className="w-full aspect-video flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: s.bgDark, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
        <Logo url={logoUrl} brand={brand} size={32} invert />
        <div style={{ maxWidth: '70%' }}>
          <h1 className={`${fc(s.headingFont)} leading-[0.95]`} style={{ color: s.textOnDark, fontSize: s.headingSize, fontWeight: s.headingWeight }}>{title}</h1>
          {subtitle && <p className={`${fc(s.bodyFont)} mt-4`} style={{ color: s.textMuted, fontSize: s.bodySize }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: s.labelSize, color: s.textMuted, letterSpacing: s.labelTracking }}>
          <span>{brand.name}</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{new Date().getFullYear()}</span>
        </div>
        {s.showHeaderRule && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: a }} />}
        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full" style={{ background: a, opacity: 0.06 }} />
      </div>
    );
  }

  // center (default)
  return (
    <div className="w-full aspect-video flex flex-col items-center justify-center text-center relative overflow-hidden" style={{ backgroundColor: s.bgDark, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(ellipse at 50% 60%, ${a} 0%, transparent 70%)` }} />
      <div className="relative z-10 flex flex-col items-center gap-4" style={{ maxWidth: '75%' }}>
        <Logo url={logoUrl} brand={brand} size={44} invert className="mb-4" />
        <h1 className={`${fc(s.headingFont)} leading-[1.05]`} style={{ color: s.textOnDark, fontSize: s.headingSize, fontWeight: s.headingWeight }}>{title}</h1>
        {subtitle && <p className={`${fc(s.bodyFont)} mt-2`} style={{ color: s.textMuted, fontSize: s.bodySize }}>{subtitle}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-[5%]">
        <span style={{ fontSize: s.labelSize, color: s.textMuted, letterSpacing: s.labelTracking, opacity: 0.5 }}>{brand.name} · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

// ── 2. Section Divider Page ────────────────────────────

export const SectionDividerPage: React.FC<PageProps> = ({ style: s, brand, sectionNumber, sectionLabel }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: a, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      {sectionNumber && (
        <span className={`absolute select-none ${fc(s.headingFont)} leading-none`} style={{ fontSize: 'min(180px, 18vw)', fontWeight: 900, color: '#ffffff', opacity: 0.08 }}>{sectionNumber}</span>
      )}
      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        {sectionNumber && <span className={`${fc(s.headingFont)} leading-none`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: '#ffffff' }}>{sectionNumber}</span>}
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: '#ffffff', opacity: 0.8 }}>{sectionLabel}</span>}
      </div>
    </div>
  );
};

// ── 3. Two Column Page ─────────────────────────────────

export const TwoColumnPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, body, imageUrl, sectionLabel }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex overflow-hidden" style={{ backgroundColor: s.bgLight, borderRadius: s.cornerRadius, padding: s.pagePadding, gap: s.contentGap }}>
      <div className="flex flex-col justify-center" style={{ flex: '0 0 55%' }}>
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase mb-3 block`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: a }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)} mt-3 leading-relaxed`} style={{ fontSize: s.bodySize, color: s.textOnLight, opacity: 0.8 }}>{subtitle}</p>}
        {body && <p className={`${fc(s.bodyFont)} mt-3 leading-relaxed`} style={{ fontSize: s.bodySize, color: s.textMuted }}>{body}</p>}
        {s.showHeaderRule && <div className="mt-6" style={{ height: 1, background: s.borderColor, opacity: 0.4 }} />}
      </div>
      <div className="relative overflow-hidden flex-1" style={{ borderRadius: s.cardRadius }}>
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${a}08` }}>
            <img src={imageUrl} alt="" className="max-w-[70%] max-h-[70%] object-contain" style={{ filter: s.imageFilter }} />
          </div>
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${a}15, ${a}08)` }} />
        )}
      </div>
    </div>
  );
};

// ── 4. Two Column Reverse Page ─────────────────────────

export const TwoColumnReversePage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, body, imageUrl, sectionLabel }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex overflow-hidden" style={{ backgroundColor: s.bgLight, borderRadius: s.cornerRadius, padding: s.pagePadding, gap: s.contentGap }}>
      <div className="relative overflow-hidden" style={{ flex: '0 0 45%', borderRadius: s.cardRadius }}>
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${a}08` }}>
            <img src={imageUrl} alt="" className="max-w-[70%] max-h-[70%] object-contain" style={{ filter: s.imageFilter }} />
          </div>
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${a}15, ${a}08)` }} />
        )}
      </div>
      <div className="flex flex-col justify-center flex-1">
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase mb-3 block`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: a }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)} mt-3 leading-relaxed`} style={{ fontSize: s.bodySize, color: s.textOnLight, opacity: 0.8 }}>{subtitle}</p>}
        {body && <p className={`${fc(s.bodyFont)} mt-3 leading-relaxed`} style={{ fontSize: s.bodySize, color: s.textMuted }}>{body}</p>}
      </div>
    </div>
  );
};

// ── 5. Full Bleed Image Page ───────────────────────────

export const FullBleedImagePage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, imageUrl }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video relative overflow-hidden" style={{ borderRadius: s.cornerRadius }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: s.imageFilter }} />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${s.bgDark}, ${a})` }} />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${s.overlayOpacity}) 0%, rgba(0,0,0,${s.overlayOpacity * 0.3}) 40%, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 z-10 flex flex-col" style={{ padding: s.pagePadding, maxWidth: '70%' }}>
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.headingSize, fontWeight: s.headingWeight, color: '#fff' }}>{title}</h2>}
        {subtitle && <p className={`${fc(s.bodyFont)} mt-2`} style={{ fontSize: s.bodySize, color: 'rgba(255,255,255,0.75)' }}>{subtitle}</p>}
      </div>
    </div>
  );
};

// ── 6. Three Column Page ───────────────────────────────

export const ThreeColumnPage: React.FC<PageProps> = ({ style: s, brand, sectionLabel, title, items, columns }) => {
  const a = accent(s, brand);
  // Accept either `items` or `columns` (columns has body instead of description)
  const cardData = items?.map(i => ({ title: i.title, desc: i.description }))
    || columns?.map(c => ({ title: c.title, desc: c.body }))
    || [];
  const cols = s.gridColumns;

  return (
    <div className="w-full aspect-video flex flex-col overflow-hidden" style={{ backgroundColor: s.bgLight, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      <div className="shrink-0">
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block mb-2`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: a }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {s.showHeaderRule && <div className="mt-4" style={{ height: 1, background: s.borderColor, opacity: 0.4 }} />}
      </div>

      <div className="grid flex-1 items-start" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: s.contentGap, marginTop: s.contentGap }}>
        {cardData.slice(0, cols).map((card, i) => (
          <div key={i} className="flex flex-col" style={{ backgroundColor: s.bgLight === s.bgDark ? `${s.borderColor}15` : undefined, borderRadius: s.cardRadius, boxShadow: s.cardShadow, border: s.cardBorder, padding: `clamp(12px, 2vw, 24px)` }}>
            {/* Number indicator */}
            <span className={`${fc(s.headingFont)} mb-3`} style={{ fontSize: s.subheadingSize, fontWeight: 800, color: a, opacity: 0.2 }}>{String(i + 1).padStart(2, '0')}</span>
            <h3 className={`${fc(s.headingFont)} leading-snug`} style={{ fontSize: s.bodySize, fontWeight: s.headingWeight, color: s.textOnLight }}>{card.title}</h3>
            <p className={`${fc(s.bodyFont)} mt-2 leading-relaxed`} style={{ fontSize: s.labelSize, color: s.textMuted }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 7. Quote Page ──────────────────────────────────────

export const QuotePage: React.FC<PageProps> = ({ style: s, brand, quote, quoteAuthor }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: s.bgDark, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      {/* Decorative accent line */}
      <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: a, opacity: 0.4 }} />
      <div className="relative max-w-[75%]">
        <span className={`${fc(s.headingFont)} absolute -top-8 -left-4 select-none leading-none`} style={{ fontSize: '100px', color: a, opacity: 0.2 }} aria-hidden="true">&ldquo;</span>
        {quote && <blockquote className={`${fc(s.headingFont)} relative z-10 leading-relaxed`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnDark, fontStyle: s.headingFont === 'serif' ? 'italic' : 'normal' }}>{quote}</blockquote>}
        {quoteAuthor && <p className={`${fc(s.bodyFont)} mt-6`} style={{ fontSize: s.bodySize, color: s.textMuted }}>&mdash; {quoteAuthor}</p>}
      </div>
    </div>
  );
};

// ── 8. Stats Page ──────────────────────────────────────

export const StatsPage: React.FC<PageProps> = ({ style: s, brand, title, sectionLabel, stats = [] }) => {
  const a = accent(s, brand);
  const displayStats = stats.slice(0, 4);
  const cols = displayStats.length <= 2 ? 2 : displayStats.length;
  // For dark themes, use a slightly lighter card bg
  const isDarkBg = s.bgLight === s.bgDark || s.bgLight.startsWith('#1') || s.bgLight.startsWith('#0');
  const cardBg = isDarkBg ? `${s.borderColor}20` : undefined;

  return (
    <div className="w-full aspect-video flex flex-col overflow-hidden" style={{ backgroundColor: s.bgLight, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      <div className="shrink-0">
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block mb-2`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: a }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
      </div>
      <div className="grid items-center flex-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: s.contentGap, marginTop: s.contentGap }}>
        {displayStats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center text-center" style={{ borderRadius: s.cardRadius, boxShadow: s.cardShadow, border: s.cardBorder, padding: `clamp(16px, 3vw, 32px)`, backgroundColor: cardBg }}>
            <span className={`${fc(s.headingFont)} leading-none`} style={{ fontSize: s.headingSize, fontWeight: 800, color: a }}>{stat.value}</span>
            <span className={`${fc(s.bodyFont)} mt-3 uppercase`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: s.textMuted }}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 9. List Page ───────────────────────────────────────

export const ListPage: React.FC<PageProps> = ({ style: s, brand, title, sectionLabel, items = [] }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex overflow-hidden" style={{ backgroundColor: s.bgLight, borderRadius: s.cornerRadius, padding: s.pagePadding, gap: s.contentGap }}>
      <div className="flex flex-col justify-center" style={{ flex: '0 0 35%' }}>
        {sectionLabel && <span className={`${fc(s.bodyFont)} uppercase block mb-3`} style={{ fontSize: s.labelSize, letterSpacing: s.labelTracking, color: a }}>{sectionLabel}</span>}
        {title && <h2 className={`${fc(s.headingFont)} leading-tight`} style={{ fontSize: s.subheadingSize, fontWeight: s.headingWeight, color: s.textOnLight }}>{title}</h2>}
        {s.showHeaderRule && <div className="mt-4" style={{ width: '40%', height: 2, background: a, opacity: 0.3 }} />}
      </div>
      <div className="flex flex-col justify-center flex-1 gap-5 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            <span className={`${fc(s.headingFont)} shrink-0 leading-none`} style={{ fontSize: s.subheadingSize, fontWeight: 700, color: a, opacity: 0.25, minWidth: '2.5ch', textAlign: 'right' }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ borderLeft: `2px solid ${a}20`, paddingLeft: '12px' }}>
              <h4 className={`${fc(s.headingFont)} leading-snug`} style={{ fontSize: s.bodySize, fontWeight: s.headingWeight, color: s.textOnLight }}>{item.title}</h4>
              <p className={`${fc(s.bodyFont)} mt-1 leading-relaxed`} style={{ fontSize: s.bodySize, color: s.textMuted }}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 10. Closing Page ───────────────────────────────────

export const ClosingPage: React.FC<PageProps> = ({ style: s, brand, title, subtitle, logoUrl, contactInfo }) => {
  const a = accent(s, brand);
  return (
    <div className="w-full aspect-video flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: s.bgDark, borderRadius: s.cornerRadius, padding: s.pagePadding }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-[0.05]" style={{ background: `radial-gradient(ellipse at 50% 60%, ${a} 0%, transparent 60%)` }} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Logo url={logoUrl} brand={brand} size={48} invert className="mb-6" />
        <h2 className={`${fc(s.headingFont)}`} style={{ fontSize: s.headingSize, fontWeight: s.headingWeight, color: s.textOnDark }}>{title || 'Thank You'}</h2>
        {subtitle && <p className={`${fc(s.bodyFont)} mt-3`} style={{ fontSize: s.bodySize, color: s.textMuted }}>{subtitle}</p>}
        <div className="mt-4 w-8" style={{ height: 2, background: a, opacity: 0.5 }} />
        <p className={`${fc(s.headingFont)} mt-4`} style={{ fontSize: s.bodySize, color: a, fontWeight: 600, opacity: 0.7 }}>{brand.name}</p>
        {contactInfo && (
          <div className={`${fc(s.bodyFont)} mt-6 flex items-center gap-6`} style={{ fontSize: s.labelSize, color: s.textMuted }}>
            {contactInfo.email && <span>{contactInfo.email}</span>}
            {contactInfo.website && <span>{contactInfo.website}</span>}
            {contactInfo.phone && <span>{contactInfo.phone}</span>}
          </div>
        )}
      </div>
      {s.showFooterRule && <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2" style={{ width: '25%', height: 1, background: s.borderColor, opacity: 0.2 }} />}
    </div>
  );
};
