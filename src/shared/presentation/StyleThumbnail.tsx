/**
 * StyleThumbnail — Mini rendered preview of a presentation style.
 * Shows a tiny simulated "cover slide" using the style's actual tokens
 * so users can visually compare styles at a glance.
 */
import type { PresentationStyle } from './styles';

interface StyleThumbnailProps {
  style: PresentationStyle;
  brandName?: string;
  brandColor?: string;
}

export function StyleThumbnail({ style, brandName = 'Brand', brandColor = '#3B82F6' }: StyleThumbnailProps) {
  const accent = style.bgAccent === 'brand' ? brandColor : style.bgAccent;
  const fontClass = style.headingFont === 'serif' ? 'font-serif' : style.headingFont === 'display' ? 'font-display' : 'font-sans';
  const r = Math.min(style.cornerRadius, 8);

  return (
    <div
      className="w-full aspect-[16/10] overflow-hidden relative"
      style={{
        background: style.bgDark,
        borderRadius: `${r}px`,
      }}
    >
      {/* Cover slide simulation */}
      {style.coverAlign === 'split' ? (
        /* Split: left dark with text, right accent block */
        <div className="absolute inset-0 flex">
          <div className="flex-1 flex flex-col justify-between" style={{ padding: '12% 8%' }}>
            {/* Logo dot */}
            <div className="flex items-center gap-[4px]">
              <div className="w-[6px] h-[6px] rounded-full" style={{ background: accent }} />
              <div className="h-[3px] w-[20px] rounded-full" style={{ background: style.textMuted, opacity: 0.3 }} />
            </div>
            {/* Title */}
            <div>
              <div
                className={`${fontClass} leading-none`}
                style={{
                  color: style.textOnDark,
                  fontWeight: style.headingWeight,
                  fontSize: '11px',
                  letterSpacing: style.headingFont === 'serif' ? '-0.02em' : '-0.01em',
                }}
              >
                {brandName}
              </div>
              <div className="mt-[3px] h-[2px] w-[28px] rounded-full" style={{ background: style.textMuted, opacity: 0.2 }} />
            </div>
            {/* Footer line */}
            <div className="h-[2px] w-[16px] rounded-full" style={{ background: style.textMuted, opacity: 0.15 }} />
          </div>
          <div className="w-[38%]" style={{ background: accent, borderRadius: r > 0 ? `0 ${r}px ${r}px 0` : 0 }} />
        </div>
      ) : style.coverAlign === 'left' ? (
        /* Left-aligned */
        <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '12% 10%' }}>
          <div className="flex items-center gap-[4px]">
            <div className="w-[6px] h-[6px] rounded-full" style={{ background: accent }} />
            <div className="h-[3px] w-[20px] rounded-full" style={{ background: style.textMuted, opacity: 0.3 }} />
          </div>
          <div>
            <div
              className={`${fontClass} leading-none`}
              style={{
                color: style.textOnDark,
                fontWeight: style.headingWeight,
                fontSize: '13px',
                letterSpacing: style.headingFont === 'serif' ? '-0.02em' : '-0.01em',
              }}
            >
              {brandName}
            </div>
            <div className="mt-[4px] h-[2px] w-[35px] rounded-full" style={{ background: style.textMuted, opacity: 0.2 }} />
            <div className="mt-[2px] h-[2px] w-[22px] rounded-full" style={{ background: style.textMuted, opacity: 0.12 }} />
          </div>
          <div className="flex items-center gap-[6px]">
            <div className="h-[2px] w-[16px] rounded-full" style={{ background: style.textMuted, opacity: 0.15 }} />
            <div className="h-[2px] w-[10px] rounded-full" style={{ background: style.textMuted, opacity: 0.1 }} />
          </div>
          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accent, opacity: 0.6 }} />
        </div>
      ) : (
        /* Center (default) */
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: '10%' }}>
          {/* Logo dot */}
          <div className="w-[8px] h-[8px] rounded-full mb-[6px]" style={{ background: accent, opacity: 0.8 }} />
          {/* Title */}
          <div
            className={`${fontClass} leading-none`}
            style={{
              color: style.textOnDark,
              fontWeight: style.headingWeight,
              fontSize: '12px',
              letterSpacing: style.headingFont === 'serif' ? '-0.02em' : '-0.01em',
            }}
          >
            {brandName}
          </div>
          {/* Subtitle lines */}
          <div className="mt-[4px] h-[2px] w-[30px] rounded-full mx-auto" style={{ background: style.textMuted, opacity: 0.2 }} />
          <div className="mt-[2px] h-[2px] w-[20px] rounded-full mx-auto" style={{ background: style.textMuted, opacity: 0.12 }} />
          {/* Bottom accent */}
          <div className="absolute bottom-[10%] h-[2px] w-[18px] rounded-full" style={{ background: accent, opacity: 0.3 }} />
        </div>
      )}

      {/* Header rule */}
      {style.showHeaderRule && (
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: style.borderColor, opacity: 0.3 }} />
      )}

      {/* Corner radius indicator for rounded styles */}
      {style.cornerRadius >= 16 && (
        <div className="absolute inset-[6%] rounded-lg border border-dashed pointer-events-none" style={{ borderColor: style.textMuted, opacity: 0.06, borderRadius: `${Math.min(style.cardRadius, 6)}px` }} />
      )}
    </div>
  );
}
