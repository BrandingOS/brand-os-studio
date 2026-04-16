import type { BrandContext } from './types';

// Embed a user-supplied SVG string centered in a given box.
// Fallback: colored rectangle with the brand's initials.
export function LogoSlot({
  ctx,
  x,
  y,
  width,
  height,
  fill,
}: {
  ctx: BrandContext;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
}) {
  const initials = ctx.brandName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

  if (ctx.logoSVG) {
    // Center the logo inside the box by wrapping it in a nested svg with a viewBox.
    return (
      <g>
        <foreignObject x={x} y={y} width={width} height={height}>
          <div
            // eslint-disable-next-line react/no-unknown-property
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{
              __html: wrapForScale(ctx.logoSVG, width, height),
            }}
          />
        </foreignObject>
      </g>
    );
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill={fill ?? ctx.primaryColor} />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={Math.min(width, height) * 0.55}
        fontWeight={700}
        fill="#ffffff"
      >
        {initials}
      </text>
    </g>
  );
}

// Ensure the embedded SVG fills its container. If the SVG has no width/height
// but has a viewBox, adding width="100%" height="100%" is enough. If it has
// explicit pixel dimensions, we wrap it in a scaling parent.
function wrapForScale(svg: string, w: number, h: number): string {
  // Strip existing width/height attributes and add 100%/100% with preserveAspectRatio.
  const cleaned = svg
    .replace(/<svg([^>]*?)\swidth="[^"]*"/i, '<svg$1')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/i, '<svg$1')
    .replace('<svg', `<svg width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"`);
  return cleaned;
}
