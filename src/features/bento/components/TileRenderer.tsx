import type { CSSProperties } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BentoTile } from '../types';

interface Props {
  tile: BentoTile;
  brand: Brand | null | undefined;
  /** Approx pixel size of this tile — used to pick font sizes. */
  tileWidth: number;
  tileHeight: number;
}

/** Per-kind tile content. Styling is inline so export via html2canvas is reliable. */
export function TileRenderer({ tile, brand, tileWidth, tileHeight }: Props) {
  const { kind, content } = tile;
  const minSide = Math.min(tileWidth, tileHeight);

  switch (kind) {
    case 'color': {
      const hex = content.color ?? '#CCCCCC';
      return (
        <div style={{ ...fill(hex), color: readableOn(hex), ...padBox(minSide) }}>
          <div style={{ fontSize: minSide * 0.09, fontWeight: 600, opacity: 0.88 }}>{hex.toUpperCase()}</div>
        </div>
      );
    }

    case 'gradient': {
      const g = content.gradient ?? { from: '#6366F1', to: '#EC4899', angle: 45 };
      return (
        <div style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(${g.angle ?? 45}deg, ${g.from}, ${g.to})`,
        }} />
      );
    }

    case 'logo': {
      const variant = content.logoVariant ?? 'full';
      const src = pickLogoSrc(brand, variant);
      const bg = content.bg ?? '#FFFFFF';
      return (
        <div style={{ ...fill(bg), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: minSide * 0.12 }}>
          {src ? (
            <img src={src} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{
              fontSize: minSide * 0.16,
              fontWeight: 700,
              color: readableOn(bg),
              fontFamily: brand?.fonts?.primary ?? 'Inter',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}>
              {brand?.name ?? 'Brand'}
            </div>
          )}
        </div>
      );
    }

    case 'typography': {
      const fg = content.fg ?? '#0F172A';
      const font = content.fontFamily ?? brand?.fonts?.primary ?? 'Inter';
      const sample = content.text ?? 'Aa';
      return (
        <div style={{ ...fill('#F8FAFC'), color: fg, padding: minSide * 0.1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: minSide * 0.08, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            Typography
          </div>
          <div style={{ fontFamily: font, fontSize: minSide * 0.38, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {sample}
          </div>
          <div style={{ fontSize: minSide * 0.07, opacity: 0.65, fontFamily: font }}>{font}</div>
        </div>
      );
    }

    case 'voice-quote': {
      const font = content.fontFamily ?? brand?.fonts?.primary ?? 'Inter';
      const bg = brand?.primaryColor ?? '#0F172A';
      const fg = readableOn(bg);
      const txt = content.text ?? 'Your brand voice.';
      return (
        <div style={{ ...fill(bg), color: fg, padding: minSide * 0.1, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{
            fontFamily: font,
            fontSize: minSide * Math.max(0.08, Math.min(0.18, 2.4 / Math.max(14, txt.length))),
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            textAlign: content.align ?? 'left',
          }}>
            "{txt}"
          </div>
        </div>
      );
    }

    case 'asset-image': {
      const asset = brand?.assets?.find((a) => a.id === content.assetId);
      if (!asset?.url) {
        return <div style={{ ...fill('#E2E8F0'), color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: minSide * 0.08 }}>No image</div>;
      }
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }

    case 'user-image': {
      if (!content.dataUrl) {
        return <div style={{ ...fill('#F1F5F9'), color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: minSide * 0.08 }}>Drop image</div>;
      }
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <img src={content.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }

    case 'pattern': {
      return <PatternFill content={content} size={minSide} />;
    }

    case 'stat': {
      const fg = content.fg ?? brand?.primaryColor ?? '#0F172A';
      const font = content.fontFamily ?? brand?.fonts?.primary ?? 'Inter';
      return (
        <div style={{ ...fill('#FFFFFF'), color: fg, padding: minSide * 0.1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: minSide * 0.02 }}>
          <div style={{ fontFamily: font, fontSize: minSide * 0.36, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' }}>
            {content.text ?? '—'}
          </div>
          <div style={{ fontSize: minSide * 0.08, opacity: 0.6, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {content.label ?? ''}
          </div>
        </div>
      );
    }

    case 'text': {
      const fg = content.fg ?? '#0F172A';
      const bg = content.bg ?? '#FFFFFF';
      return (
        <div style={{ ...fill(bg), color: fg, padding: minSide * 0.1, display: 'flex', alignItems: 'center', justifyContent: content.align ?? 'center' }}>
          <div style={{ fontFamily: content.fontFamily ?? 'Inter', fontSize: minSide * 0.12, fontWeight: 600 }}>
            {content.text ?? ''}
          </div>
        </div>
      );
    }

    case 'empty':
    default:
      return <div style={{ ...fill('#F8FAFC') }} />;
  }
}

function fill(bg: string): CSSProperties {
  return { width: '100%', height: '100%', background: bg };
}
function padBox(minSide: number): CSSProperties {
  return { padding: minSide * 0.1, display: 'flex', alignItems: 'flex-end' };
}

function pickLogoSrc(brand: Brand | null | undefined, variant: string): string | undefined {
  if (!brand) return undefined;
  const la = brand.logoAssets ?? {};
  if (variant === 'icon') return la.icon ?? la.full ?? brand.logo;
  if (variant === 'wordmark') return la.wordmark ?? la.full ?? brand.logo;
  if (variant === 'dark') return la.dark ?? la.full ?? brand.logo;
  if (variant === 'light') return la.light ?? la.full ?? brand.logo;
  return la.full ?? brand.logo;
}

function readableOn(hex: string): string {
  // YIQ contrast heuristic.
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0F172A' : '#F8FAFC';
}

function PatternFill({ content, size }: { content: BentoTile['content']; size: number }) {
  const fg = content.fg ?? '#0F172A';
  const bg = content.bg ?? '#F8FAFC';
  const kind = content.patternKind ?? 'dots';
  const cell = size * 0.08;
  let backgroundImage = '';
  if (kind === 'dots') {
    backgroundImage = `radial-gradient(${fg} 18%, transparent 22%)`;
  } else if (kind === 'stripes') {
    backgroundImage = `repeating-linear-gradient(45deg, ${fg} 0, ${fg} ${cell / 4}px, ${bg} ${cell / 4}px, ${bg} ${cell}px)`;
  } else if (kind === 'checker') {
    backgroundImage = `conic-gradient(${fg} 25%, ${bg} 0 50%, ${fg} 0 75%, ${bg} 0)`;
  } else if (kind === 'circles') {
    backgroundImage = `radial-gradient(circle at 30% 30%, ${fg} 18%, transparent 19%), radial-gradient(circle at 70% 70%, ${fg} 14%, transparent 15%)`;
  }
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: bg,
      backgroundImage,
      backgroundSize: kind === 'stripes' ? `${cell * 2}px ${cell * 2}px` : `${cell}px ${cell}px`,
    }} />
  );
}
