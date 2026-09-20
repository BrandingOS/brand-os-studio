// Shapes and lines.
//
// Each tile previews the shape in the BRAND's own fill, so the panel
// shows what you are about to get rather than a generic grey outline —
// and so the moment you open it, the editor has already told you it
// knows which brand you are in.

import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { Page } from '@/features/editor/schema';
import { InsertTile } from './InsertTile';
import type { InsertRequest } from '../ops/insertRequest';
import { brandFill, pageBackgroundHex, readableInk } from '../ops/insert';

interface Props {
  brandKit: BrandKit | null;
  page: Page | null;
  readOnly: boolean;
  insert: (request: InsertRequest) => void;
}

const SHAPES = [
  { shape: 'rectangle', label: 'Rectangle' },
  { shape: 'ellipse', label: 'Ellipse' },
  { shape: 'polygon', label: 'Triangle' },
  { shape: 'line', label: 'Line' },
] as const;

export function ElementsPanel({ brandKit, page, readOnly, insert }: Props) {
  const fill = page ? brandFill(brandKit, page) : 'var(--ds-text-muted)';
  const ink = page ? readableInk(brandKit, page) : 'var(--ds-text)';
  const radius = brandKit?.spacing.cornerRadius ?? 0;
  // Preview on the PAGE's ground, not the panel's. A line is drawn in
  // ink chosen to read on the page, which on a dark panel in dark mode
  // means a black line on a black tile — invisible, and a lie about
  // what you are inserting.
  const ground = page ? pageBackgroundHex(page) : '#ffffff';

  return (
    <>
      <section className="st-section">
        <p className="st-section-label">Shapes</p>
        <div className="st-tile-grid">
          {SHAPES.map((s) => (
            <InsertTile
              key={s.shape}
              label={s.label}
              caption={s.label}
              disabled={readOnly}
              request={{ kind: 'shape', shape: s.shape }}
              onInsert={insert}
            >
              <ShapeArt
                shape={s.shape}
                fill={fill}
                ink={ink}
                radius={radius}
                ground={ground}
              />
            </InsertTile>
          ))}
        </div>
      </section>
    </>
  );
}

function ShapeArt({
  shape,
  fill,
  ink,
  radius,
  ground,
}: {
  shape: 'rectangle' | 'ellipse' | 'polygon' | 'line';
  fill: string;
  ink: string;
  radius: number;
  ground: string;
}) {
  const common = { width: '100%', height: '100%', viewBox: '0 0 48 48' } as const;
  const bg = <rect x="0" y="0" width="48" height="48" rx="6" fill={ground} />;
  if (shape === 'rectangle') {
    return (
      <svg {...common} className="st-tile-art" aria-hidden>
        {bg}
        {/* The brand's own corner radius, scaled to the tile. */}
        <rect x="6" y="10" width="36" height="28" rx={Math.min(12, radius / 2)} fill={fill} />
      </svg>
    );
  }
  if (shape === 'ellipse') {
    return (
      <svg {...common} className="st-tile-art" aria-hidden>
        {bg}
        <circle cx="24" cy="24" r="16" fill={fill} />
      </svg>
    );
  }
  if (shape === 'polygon') {
    return (
      <svg {...common} className="st-tile-art" aria-hidden>
        {bg}
        <polygon points="24,8 42,38 6,38" fill={fill} />
      </svg>
    );
  }
  return (
    <svg {...common} className="st-tile-art" aria-hidden>
      {bg}
      <line x1="7" y1="24" x2="41" y2="24" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
