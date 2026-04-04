import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import type { LogoConfig } from '../types';

interface LogoCanvasProps {
  config: LogoConfig;
  className?: string;
  /** Scale factor for exports — 1 = default preview size */
  scale?: number;
}

/**
 * Pure CSS/SVG logo renderer. Renders the logo based on the current config.
 * forwardRef so parent can capture the DOM node for export.
 */
export const LogoCanvas = forwardRef<HTMLDivElement, LogoCanvasProps>(
  function LogoCanvas({ config, className, scale = 1 }, ref) {
    const {
      icon,
      brandName,
      tagline,
      layout,
      primaryColor,
      secondaryColor,
      backgroundColor,
      fontFamily,
      fontSize,
      letterSpacing,
      textTransform,
      iconSize,
      showGradient,
      gradientAngle,
      shadow,
      borderRadius,
    } = config;

    const iconColor = showGradient
      ? undefined // gradient handled via CSS
      : primaryColor;

    const gradientId = 'logo-gradient';
    const gradientStyle = showGradient
      ? `linear-gradient(${gradientAngle}deg, ${primaryColor}, ${secondaryColor})`
      : undefined;

    const renderIcon = () => {
      if (!icon) return null;
      const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; size?: number }>>)[icon];
      if (!Icon) return null;

      return (
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: iconSize * scale,
            height: iconSize * scale,
            ...(showGradient
              ? {
                  background: gradientStyle,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }
              : {}),
          }}
        >
          {showGradient ? (
            <svg width={iconSize * scale} height={iconSize * scale} viewBox={`0 0 ${iconSize} ${iconSize}`}>
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%"
                  gradientTransform={`rotate(${gradientAngle - 45})`}
                >
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="100%" stopColor={secondaryColor} />
                </linearGradient>
              </defs>
              <foreignObject width={iconSize} height={iconSize}>
                <div
                  style={{
                    width: iconSize,
                    height: iconSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: `url(#${gradientId})`,
                  }}
                >
                  <Icon size={iconSize * 0.75} style={{ color: primaryColor }} />
                </div>
              </foreignObject>
              {/* Overlay gradient via mask */}
              <rect width={iconSize} height={iconSize} fill={`url(#${gradientId})`} mask="none" opacity={0} />
            </svg>
          ) : (
            <Icon size={iconSize * 0.75 * scale} style={{ color: iconColor }} />
          )}
        </div>
      );
    };

    const textStyle: React.CSSProperties = {
      fontFamily,
      fontSize: fontSize * scale,
      letterSpacing: letterSpacing * scale,
      textTransform: textTransform === 'none' ? undefined : textTransform,
      color: showGradient ? undefined : primaryColor,
      ...(showGradient
        ? {
            background: gradientStyle,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }
        : {}),
    };

    const taglineStyle: React.CSSProperties = {
      fontFamily,
      fontSize: (fontSize * 0.4) * scale,
      letterSpacing: (letterSpacing + 1) * scale,
      textTransform: textTransform === 'none' ? undefined : textTransform,
      color: secondaryColor,
      opacity: 0.7,
    };

    const showIcon = layout !== 'wordmark';
    const showText = layout !== 'symbol';

    const renderText = () => (
      <div className={cn('flex flex-col', layout === 'horizontal' || layout === 'embedded' ? 'items-start' : 'items-center')}>
        <span className="font-semibold leading-tight whitespace-nowrap" style={textStyle}>
          {brandName || 'Brand'}
        </span>
        {tagline && (
          <span className="leading-tight whitespace-nowrap mt-0.5" style={taglineStyle}>
            {tagline}
          </span>
        )}
      </div>
    );

    const renderLogoContent = () => {
      switch (layout) {
        case 'stacked':
          return (
            <div className="flex flex-col items-center gap-2">
              {showIcon && renderIcon()}
              {showText && renderText()}
            </div>
          );

        case 'horizontal':
          return (
            <div className="flex items-center gap-3">
              {showIcon && renderIcon()}
              {showText && renderText()}
            </div>
          );

        case 'wordmark':
          return renderText();

        case 'symbol':
          return renderIcon();

        case 'embedded':
          return (
            <div className="flex items-center gap-0">
              <span className="font-semibold leading-tight whitespace-nowrap" style={textStyle}>
                {(brandName || 'Brand').slice(0, Math.floor((brandName || 'Brand').length / 2))}
              </span>
              <div className="mx-1">{renderIcon()}</div>
              <span className="font-semibold leading-tight whitespace-nowrap" style={textStyle}>
                {(brandName || 'Brand').slice(Math.floor((brandName || 'Brand').length / 2))}
              </span>
            </div>
          );

        case 'badge':
          return (
            <div
              className="flex flex-col items-center justify-center gap-1"
              style={{
                width: (iconSize * 3) * scale,
                height: (iconSize * 3) * scale,
                borderRadius: '50%',
                border: `${2 * scale}px solid ${primaryColor}`,
                padding: 12 * scale,
              }}
            >
              {showIcon && renderIcon()}
              {showText && (
                <span
                  className="font-semibold leading-tight whitespace-nowrap text-center"
                  style={{
                    ...textStyle,
                    fontSize: (fontSize * 0.55) * scale,
                  }}
                >
                  {brandName || 'Brand'}
                </span>
              )}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          className,
        )}
        style={{
          backgroundColor,
          borderRadius,
          padding: 24 * scale,
          ...(shadow
            ? { boxShadow: `0 ${8 * scale}px ${32 * scale}px rgba(0,0,0,0.12)` }
            : {}),
        }}
      >
        {renderLogoContent()}
      </div>
    );
  },
);
