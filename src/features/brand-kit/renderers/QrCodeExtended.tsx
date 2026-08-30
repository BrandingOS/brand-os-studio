import { useMemo, type ReactNode } from 'react';
import { create as createQrCode } from 'qrcode';
import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent, QrContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  brandColors,
  contrastOf,
  fgOn,
  fontStack,
  logoOn,
  surface,
  type SurfaceTokens,
} from './brandStyle';
import { typePx } from './typeFloor';

/**
 * QR codes — four styles, six presentations each, and a code that scans.
 *
 * What this family used to be: a `QrPattern` component that laid out an
 * `n × n` CSS grid and filled a cell when `(r * 13 + c * 7 + ((r ^ c) *
 * 17)) % 5 < 2`. It drew three finder squares so the picture would read
 * as a QR code to a human, and the rest was arithmetic. Nothing encoded
 * anything. A customer could download it, print it on a card, and hand it
 * to somebody whose phone would find nothing there — which is worse than
 * shipping no QR family at all, because the failure happens after the
 * artifact has left.
 *
 * It is now a real code. `qrcode`'s `create()` is synchronous, so the
 * matrix is computed during render and an offscreen export gets the same
 * pixels as the screen — no async, no canvas, no second code path.
 *
 * The content model is two fields and the first of them is the whole
 * point:
 *
 *   payload  what the code RESOLVES TO. Editing it re-encodes the matrix,
 *            which is why the `<svg>` itself declares `data-bind="payload"`
 *            — the code IS the field, and there is no text to bind instead.
 *   label    what a human reads under it. Every design shows it: a code
 *            with nothing beside it tells you nothing about whether you
 *            want to scan it.
 *
 * Three rules the drawing keeps, all of them about whether the thing
 * actually works:
 *
 *   • **Error correction is H (~30%).** That is what pays for the logo in
 *     the middle; at the default M a centred mark takes the code with it.
 *   • **The quiet zone is four modules and nothing is drawn in it.** It is
 *     part of the symbol, not a margin we chose — a code bled to the edge
 *     of a card is a code a scanner cannot find.
 *   • **Ink is the brand's colour only where it READS.** `contrastOf`
 *     decides; below the floor the code falls back to whatever `fgOn`
 *     picks for that ground. A pale brand colour on white is a beautiful
 *     unscannable square.
 *
 * Sizes are relative throughout (the tile is drawn at 260px and scaled by
 * `ScalingStage`), and the four cards differ in the CODE, not only in the
 * frame around it: cell shape, whether the mark sits in the middle, and
 * whether the ink is the brand's colour or its darkest neutral.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The kit's content object. Narrowed to `qr` inside. */
  content?: DeliverableContent;
}

/* ── The code itself ──────────────────────────────────────────────── */

/** Modules of empty margin the symbol requires on every side (ISO 18004). */
const QUIET_ZONE = 4;

export type QrCellShape = 'square' | 'rounded' | 'dot';

export type QrMatrix = {
  /** Modules per side, excluding the quiet zone. */
  size: number;
  /** Row-major, `true` where the module is dark. */
  dark: boolean[];
};

/**
 * Encode a payload, or `null` when there is nothing to encode.
 *
 * Null is the honest answer for an empty payload and for a string the
 * encoder refuses (there is a length ceiling, and 'H' correction lowers
 * it). The designs draw an empty plate in that case — never a decorative
 * matrix, which is the defect this file was written to remove.
 */
export function qrMatrix(payload: string): QrMatrix | null {
  const text = payload.trim();
  if (!text) return null;
  try {
    const { modules } = createQrCode(text, { errorCorrectionLevel: 'H' });
    const size = modules.size;
    const dark: boolean[] = new Array(size * size);
    for (let i = 0; i < size * size; i += 1) dark[i] = Boolean(modules.data[i]);
    return { size, dark };
  } catch {
    return null;
  }
}

/**
 * The centred mark's plate, in modules — `[cols, rows]`.
 *
 * Landscape, and that is the whole reason this is not a square. A brand's
 * placeable logo is very often a WORDMARK four or five times wider than it
 * is tall, and `contain`-ing one into a square hole renders it at a fifth
 * of the height available — a smudge, measured on Raqm's own artwork. A
 * 3:2 plate gives a wordmark real height and merely letterboxes an icon,
 * which is the right way round.
 *
 * Both spans are odd so the plate sits ON centre rather than half a module
 * off it, and the area (~7% of the symbol) stays comfortably inside what
 * 'H' error correction can recover (~30%).
 */
function patchSpan(size: number): [number, number] {
  const odd = (n: number) => Math.max(3, n % 2 === 0 ? n + 1 : n);
  const rows = odd(Math.round(size * 0.2));
  return [odd(Math.round(rows * 1.5)), rows];
}

/**
 * The brand's colour where it reads on this ground, its darkest honest
 * alternative where it does not.
 *
 * A QR scanner is less forgiving than a reader, not more, so the WCAG
 * body floor is the right gate: anything that would fail as text would
 * fail as a code.
 */
export function qrInk(brand: Brand, ground: string, mode: 'brand' | 'neutral'): string {
  const neutral = fgOn(ground);
  if (mode === 'neutral') return neutral;
  const primary = brandColors(brand).primary;
  return contrastOf(primary, ground) >= 4.5 ? primary : neutral;
}

/**
 * A scannable code, drawn as one `<svg>` in module coordinates.
 *
 * The viewBox is the symbol PLUS its quiet zone, so the element can be
 * sized by its container and the margin scales with it. Cells carry
 * `data-qr-cell` because "did this encode anything?" has to be answerable
 * by a test — a picture of a QR code and a QR code look identical.
 */
export function QrCode({
  brand,
  content,
  ink,
  ground,
  shape = 'square',
  withMark = false,
}: {
  brand: Brand;
  content: QrContent;
  ink: string;
  ground: string;
  shape?: QrCellShape;
  withMark?: boolean;
}) {
  const matrix = useMemo(() => qrMatrix(content.payload), [content.payload]);

  if (!matrix) {
    // Nothing to encode. An outline, and no invented data.
    return (
      <div
        data-bind="payload"
        data-qr-empty=""
        className="w-full"
        style={{
          aspectRatio: '1',
          backgroundColor: ground,
          border: `1px dashed ${ink}`,
          borderRadius: 2,
        }}
      />
    );
  }

  const { size, dark } = matrix;
  const total = size + QUIET_ZONE * 2;
  const [spanX, spanY] = withMark ? patchSpan(size) : [0, 0];
  const loX = (size - spanX) / 2;
  const hiX = loX + spanX;
  const loY = (size - spanY) / 2;
  const hiY = loY + spanY;

  /**
   * The three corner eyes are what a decoder LOOKS FOR first, so they are
   * drawn solid whatever the cell shape is. Dots and rounded cells leave
   * notches between neighbours; everywhere else that is a texture, and in
   * a finder pattern it is the feature the scanner is matching against.
   */
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  const cells: ReactNode[] = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!dark[r * size + c]) continue;
      // The mark's plate is opaque, so the modules it covers are not
      // drawn at all — a half-hidden module under a translucent edge is
      // the one thing a decoder cannot recover.
      if (withMark && r >= loY && r < hiY && c >= loX && c < hiX) continue;
      const x = c + QUIET_ZONE;
      const y = r + QUIET_ZONE;
      if (inFinder(r, c)) {
        cells.push(
          <rect key={`${r}-${c}`} data-qr-cell="" x={x} y={y} width={1} height={1} fill={ink} />,
        );
      } else if (shape === 'dot') {
        cells.push(
          <circle key={`${r}-${c}`} data-qr-cell="" cx={x + 0.5} cy={y + 0.5} r={0.5} fill={ink} />,
        );
      } else {
        cells.push(
          <rect
            key={`${r}-${c}`}
            data-qr-cell=""
            x={x}
            y={y}
            width={1}
            height={1}
            rx={shape === 'rounded' ? 0.32 : 0}
            fill={ink}
          />,
        );
      }
    }
  }

  const markWidth = (spanX / total) * 100;
  const markHeight = (spanY / total) * 100;

  return (
    <div className="w-full relative" style={{ aspectRatio: '1' }}>
      <svg
        data-bind="payload"
        data-qr-size={size}
        viewBox={`0 0 ${total} ${total}`}
        width="100%"
        height="100%"
        shapeRendering={shape === 'square' ? 'crispEdges' : undefined}
        role="img"
        aria-label={content.label || content.payload}
      >
        <rect x={0} y={0} width={total} height={total} fill={ground} />
        {cells}
      </svg>
      {withMark ? (
        <div
          className="absolute flex items-center justify-center overflow-hidden"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${markWidth}%`,
            height: `${markHeight}%`,
            backgroundColor: ground,
            borderRadius: shape === 'dot' ? '999px' : 2,
          }}
        >
          <QrMark brand={brand} ground={ground} ink={ink} />
        </div>
      ) : null}
    </div>
  );
}

/** The brand's own mark for the middle of a code, or its initial. */
function QrMark({ brand, ground, ink }: { brand: Brand; ground: string; ink: string }) {
  const logo = logoOn(brand, ground);
  if (logo) {
    return (
      <img src={logo.url} alt="" style={{ width: '88%', height: '84%', objectFit: 'contain' }} />
    );
  }
  return (
    <span
      style={{
        color: ink,
        fontFamily: fontStack(brand, 'heading'),
        fontWeight: 800,
        fontSize: '58%',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      {(brand.name ?? '').trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* ── Bound fragments ──────────────────────────────────────────────── */

/** `textMuted`, but only where it really reads. */
function mutedOn(t: SurfaceTokens): string {
  return contrastOf(t.textMuted, t.bg) >= 4.5 ? t.textMuted : t.text;
}

function Label({
  brand,
  content,
  color,
  size = 7,
  caps = false,
  weight = 500,
}: {
  brand: Brand;
  content: QrContent;
  color: string;
  size?: number;
  caps?: boolean;
  weight?: number;
}) {
  return (
    <Bind
      path="label"
      value={content.label}
      fit="clamp"
      placeholder="Scan"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: typePx(size),
        fontWeight: weight,
        lineHeight: 1.2,
        ...(caps ? { textTransform: 'uppercase', letterSpacing: '0.2em' } : {}),
      }}
    />
  );
}

/* ── The six presentations ────────────────────────────────────────── */

/**
 * What separates the four cards.
 *
 * `shape` and `withMark` change the CODE; `inkMode` changes whose colour
 * it is drawn in. The six layouts below are shared on purpose — they are
 * the ways a code is presented, and giving each style its own six would
 * have been twenty-four layouts to keep readable instead of six.
 */
export type QrStyle = {
  shape: QrCellShape;
  withMark: boolean;
  inkMode: 'brand' | 'neutral';
};

export const QR_STYLES: Record<'branded' | 'minimal' | 'rounded' | 'square', QrStyle> = {
  branded: { shape: 'rounded', withMark: true, inkMode: 'brand' },
  minimal: { shape: 'square', withMark: false, inkMode: 'neutral' },
  rounded: { shape: 'dot', withMark: true, inkMode: 'brand' },
  square: { shape: 'square', withMark: false, inkMode: 'brand' },
};

/** The six presentation names, shared by all four styles. */
export const QR_KEPT_NAMES = [
  'Card',
  'Colour Field',
  'Framed',
  'Night Plate',
  'Poster',
  'Badge',
] as const;

function qrDesigns({ brand, content, style }: { brand: Brand; content: QrContent; style: QrStyle }) {
  const page = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');
  const brandT = surface(brand, 'brand');

  const code = (ground: string) => (
    <QrCode
      brand={brand}
      content={content}
      ground={ground}
      ink={qrInk(brand, ground, style.inkMode)}
      shape={style.shape}
      withMark={style.withMark}
    />
  );

  return {
    // 1 — Card. The code on a plate, its label under it. The default read.
    card: (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: subtle.bg, padding: 14 }}
      >
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{
            backgroundColor: page.bg,
            border: `1px solid ${page.border}`,
            borderRadius: 6,
            padding: 12,
            gap: 8,
          }}
        >
          <div style={{ width: '64%' }}>{code(page.bg)}</div>
          <Label brand={brand} content={content} color={page.text} size={7.5} weight={600} />
        </div>
      </div>
    ),
    // 2 — Colour Field. The brand's colour edge to edge, and the code on a
    // light plate in the middle of it rather than reversed out of it. Every
    // design in this family puts dark modules on a light ground for the
    // same reason: a reversed symbol is one many scanners refuse outright,
    // so the variety here is the SURROUND, never the code.
    field: (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ backgroundColor: brandT.bg, padding: 16, gap: 9 }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: '66%', backgroundColor: page.bg, borderRadius: 4, padding: 7 }}
        >
          {code(page.bg)}
        </div>
        <Label brand={brand} content={content} color={brandT.text} size={7} caps />
      </div>
    ),
    // 3 — Framed. A hairline rule around the whole thing, the label as a
    // caption on the baseline.
    framed: (
      <div className="w-full h-full" style={{ backgroundColor: page.bg, padding: 10 }}>
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{ border: `1px solid ${page.border}`, padding: 12, gap: 9 }}
        >
          <div style={{ width: '60%' }}>{code(page.bg)}</div>
          <div
            className="w-full flex items-center justify-center pt-1.5"
            style={{ borderTop: `1px solid ${page.border}` }}
          >
            <Label brand={brand} content={content} color={mutedOn(page)} size={6.5} caps />
          </div>
        </div>
      </div>
    ),
    // 4 — Night Plate. A dark page, and the code on a light plate rather
    // than reversed out of it: an inverted symbol is a symbol many
    // scanners refuse, and a code that only sometimes works is worse than
    // one that plainly does not.
    night: (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ backgroundColor: inverted.bg, padding: 16, gap: 9 }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: '64%', backgroundColor: page.bg, borderRadius: 4, padding: 7 }}
        >
          {code(page.bg)}
        </div>
        <Label brand={brand} content={content} color={inverted.text} size={7} weight={600} />
      </div>
    ),
    // 5 — Poster. The code at the size it is actually scanned from, over
    // a brand band that carries the label.
    poster: (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg }}>
        <div className="flex-1 flex items-center justify-center min-h-0" style={{ padding: 12 }}>
          <div style={{ width: '78%' }}>{code(page.bg)}</div>
        </div>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '7px 12px' }}
        >
          <Label brand={brand} content={content} color={brandT.text} size={7} caps />
        </div>
      </div>
    ),
    // 6 — Badge. The sticker cut: a brand disc, a light plate inside it.
    badge: (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: subtle.bg, padding: 12 }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{
            width: '92%',
            aspectRatio: '1',
            borderRadius: '50%',
            backgroundColor: brandT.bg,
            padding: 14,
            gap: 6,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: '58%', backgroundColor: page.bg, borderRadius: 3, padding: 5 }}
          >
            {code(page.bg)}
          </div>
          <Label brand={brand} content={content} color={brandT.text} size={6.5} caps />
        </div>
      </div>
    ),
  };
}

/**
 * One renderer body for all four cards.
 *
 * The style is the argument. Four copies of six layouts is how the file
 * this replaced ended up with forty stills nobody could keep straight —
 * and with `[...stills, ...stills, ...stills]`, which made every card
 * offer the same ten designs three times over.
 */
function renderQr(brand: Brand, templateIndex: number, content: DeliverableContent | undefined, style: QrStyle) {
  // The drilldown grid and every offscreen export render with no content
  // object; the kind's own defaults are what they should show, and they
  // come from the brand rather than from this file.
  const c = (
    content && content.kind === 'qr' ? content : hydrateContent('qr', brand, undefined)
  ) as QrContent;
  const d = qrDesigns({ brand, content: c, style });
  const designs = [d.card, d.field, d.framed, d.night, d.poster, d.badge];
  return <>{designs[templateIndex] ?? designs[0]}</>;
}

export function BrandedQrRenderer({ brand, templateIndex, content }: Props) {
  return renderQr(brand, templateIndex, content, QR_STYLES.branded);
}

export function MinimalQrRenderer({ brand, templateIndex, content }: Props) {
  return renderQr(brand, templateIndex, content, QR_STYLES.minimal);
}

export function RoundedQrRenderer({ brand, templateIndex, content }: Props) {
  return renderQr(brand, templateIndex, content, QR_STYLES.rounded);
}

export function SquareQrRenderer({ brand, templateIndex, content }: Props) {
  return renderQr(brand, templateIndex, content, QR_STYLES.square);
}

/* ── Template lists + curation ────────────────────────────────────── */

/**
 * Six kept designs per style, in `ext-1`…`ext-6`.
 *
 * Each list stays thirty entries long because a template id is a
 * persistence key: `ext-7`…`ext-30` keep their slots and are hidden by
 * `curation/qr.ts` rather than deleted or renumbered.
 */
const baseMeta = (prefix: string) =>
  Array.from({ length: 30 }, (_, i) => ({
    idSuffix: `ext-${i + 1}`,
    name: QR_KEPT_NAMES[i] ?? `${prefix} ${i + 1}`,
    category: 'Modern',
  }));

export const QR_BRANDED_EXTENDED = baseMeta('Branded');
export const QR_MINIMAL_EXTENDED = baseMeta('Minimal');
export const QR_ROUNDED_EXTENDED = baseMeta('Rounded');
export const QR_SQUARE_EXTENDED = baseMeta('Square');

/** The template-id prefixes, in the order the cards appear. */
export const QR_TYPES = ['qr-branded', 'qr-minimal', 'qr-rounded', 'qr-square'] as const;

/** Tags by presentation — the same six readings, whatever the style. */
const PRESENTATION_TAGS: string[][] = [
  ['Print', 'Card', 'Light'],
  ['Signage', 'Bold', 'Brand colour'],
  ['Print', 'Editorial', 'Minimal'],
  ['Signage', 'Dark', 'Contrast'],
  ['Poster', 'Large format', 'Brand colour'],
  ['Sticker', 'Badge', 'Brand colour'],
];

export const QR_NAMES: Record<string, string> = Object.fromEntries(
  QR_TYPES.flatMap((type) =>
    QR_KEPT_NAMES.map((name, i) => [`${type}-ext-${i + 1}`, name] as const),
  ),
);

export const QR_TAGS: Record<string, string[]> = Object.fromEntries(
  QR_TYPES.flatMap((type) =>
    PRESENTATION_TAGS.map((tags, i) => [`${type}-ext-${i + 1}`, tags] as const),
  ),
);

export const QR_ARCHIVED_IDS: string[] = QR_TYPES.flatMap((type) =>
  Array.from({ length: 30 - QR_KEPT_NAMES.length }, (_, i) => `${type}-ext-${QR_KEPT_NAMES.length + i + 1}`),
);
