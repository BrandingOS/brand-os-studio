/**
 * Chart elements — the twelve chart types the Insert menu offers. LIVE
 * charts drawn to the Chronicle reference set (owner-supplied captures,
 * 2026-08-22): uniform series color, top-rounded columns / right-rounded
 * bars, a value axis that starts at 0 with minor grid lines between the
 * majors, an outline legend pill (per-slice pill ROW on radial charts),
 * an axis-name pill, area-filled lines with white dots, trapezoid funnels
 * with a monochromatic ramp, semantic waterfall colors with dashed
 * connectors, and a five-ring radar with its scale printed on the spine.
 *
 * Everything the ChartToolbar's Settings menu offers is WIRED here:
 * data labels (`showValues`), legend, grid, value axis (`showAxis`),
 * category axis (`showCategoryAxis`), the axis-name pill
 * (`showAxisLabel` + `axisLabel`), tick label mode (`axisLabelsMode`),
 * scale end (`axisMax`) and abbreviation (ValueFormat.full).
 *
 * Interactions (all preserved):
 * - Data changes MORPH (useAnimatedNumbers); drags run at a fast tween.
 * - Shapes DRAG to change values (columns/points/slices vertically, bars
 *   and funnel bands horizontally, radar vertices along their spokes).
 *   Printed values are display-only BY OWNER DECISION (2026-08-22) —
 *   a value changes by dragging its shape or through the data editor.
 * - Hover grows the shape (DS easing) and raises the ChartTip.
 * - Category labels and the legend name are click-and-type in place.
 *
 * Ink is `currentColor`; only the accent is a prop — a slide passes the
 * brand's primary. Deliberately ZERO chart libraries: our documents
 * persist as HTML snapshots (a <canvas> chart would serialize blank),
 * previews scale by transform (SVG stays crisp), and theming is
 * currentColor — exactly where libraries fight us.
 */
import { useId, useState } from 'react';
import './elements.css';
import { displayLabel, formatValue, niceScale, type ValueFormat } from './chartData';
import { useAnimatedNumbers, useAnimatedSeries } from './useAnimatedNumbers';

/**
 * Monochrome by default — a chart draws entirely in the ink it inherits
 * (white on dark, black on light). On a real slide the host passes the
 * brand's color here; nothing else changes.
 */
export const ELEMENT_ACCENT = 'currentColor';

export interface ChartProps {
  values?: number[];
  labels?: string[];
  accent?: string;
  /** Explicit per-series colors (Style → "<name> color"), index-aligned
   *  with the series. A set color paints its segments at FULL strength;
   *  an unset one keeps the accent's shade ladder. */
  seriesColors?: Array<string | undefined>;
  width?: number;
  format?: ValueFormat;
  /** Printed values — the Settings "Data labels" switch. */
  showValues?: boolean;
  /** First series name — with `legend`, drawn as the legend pill. */
  seriesName?: string;
  /** The legend (pill on cartesian charts, per-slice row on radial). */
  legend?: boolean;
  /** Grid lines (majors + the unlabeled minors between them). */
  grid?: boolean;
  /** The VALUE axis: tick labels + axis lines. */
  showAxis?: boolean;
  /** The CATEGORY axis: the labels under columns / beside bars. */
  showCategoryAxis?: boolean;
  /** The axis-name pill (below cartesian charts; rotated left on bars). */
  showAxisLabel?: boolean;
  /** What the axis-name pill says — usually the label column's name. */
  axisLabel?: string;
  /** 'edges' prints only the 0 and max tick labels. */
  axisLabelsMode?: 'auto' | 'edges';
  /** Overrides where the value scale ends (Settings "End at"). */
  axisMax?: number;
  /**
   * The drawing stage in viewBox units (default 300×180). Focus mode
   * passes a viewport-sized stage: the PLOT then grows to the screen
   * while type and chrome stay at reading size — a true re-layout, not a
   * zoom (Chronicle's focusMode, owner request 2026-08-22). Cartesian
   * charts honor it; radial ones keep their fixed stage.
   */
  plotSize?: { w: number; h: number };
  /** Click-and-type on the legend pill renames the series; the capsule
   *  stretches and shrinks with the text as it is typed. */
  onSeriesNameChange?: (name: string) => void;
  /** Click-and-type on the axis-name pill renames the label column. */
  onAxisLabelChange?: (name: string) => void;
  /** Direct manipulation: the shapes themselves drag. */
  onValuesChange?: (values: number[]) => void;
  /** Category labels become type-in-place. */
  onLabelsChange?: (labels: string[]) => void;
}

export interface SeriesChartProps extends Omit<ChartProps, 'values'> {
  /** One inner array per bar/column: stacked segment sizes, base first. */
  series?: number[][];
  /** Segment names, base first — the hover tip lists one dot + value per
   *  segment under them, and the legend draws ONE PILL PER SERIES. */
  seriesNames?: string[];
  /** Renames any series from its own legend pill (owner request
   *  2026-08-22: stacked charts need a second, renamable legend). */
  onSeriesNamesChange?: (names: string[]) => void;
  /** Direct manipulation for stacked charts: every SEGMENT drags. */
  onSeriesChange?: (series: number[][]) => void;
}

/* ── Geometry helpers ───────────────────────────────────────────────── */

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(rad(deg)),
  cy + r * Math.sin(rad(deg)),
];

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** A Catmull-Rom spline — smooth AND passing THROUGH every data point,
 *  so the dots sit ON the line, part of it (owner request 2026-08-22:
 *  the old midpoint smoothing floated the dots off the curve). */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const prev = points[i - 1] ?? points[i];
    const a = points[i];
    const b = points[i + 1];
    const next = points[i + 2] ?? b;
    const c1x = a[0] + (b[0] - prev[0]) / 6;
    const c1y = a[1] + (b[1] - prev[1]) / 6;
    const c2x = b[0] - (next[0] - a[0]) / 6;
    const c2y = b[1] - (next[1] - a[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d;
}

/** Columns round their TOP corners only (the reference look). */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`;
}

/** Bars round their RIGHT corners only. */
function rightRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, h / 2, w));
  return `M ${x} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} H ${x} Z`;
}

const delay = (i: number) => ({ '--el-i': i }) as React.CSSProperties;
const after = (ms: number) => ({ '--el-d': `${ms}ms` }) as React.CSSProperties;

/** The monochromatic ramp radial slices and funnel bands wear: the first
 *  item takes the accent at full strength, later ones fade — a shade
 *  ladder that works for currentColor and any brand hex alike. */
const rampOpacity = (i: number, n: number) =>
  n <= 1 ? 1 : Math.max(0.14, 1 - (i / (n - 1)) * 0.86);

/** The DS-family easing every hover emphasis uses. */
const HOVER_EASE = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

/** The frame axes — baseline + value axis. Heavier than the grid, and
 *  offset OUTWARD by half their width so they sit BESIDE the plot: a
 *  bar ends flush at the plot edge and can never show through or under
 *  the line (owner request 2026-08-22). */
const AXIS_W = 0.75;
const AXIS_OPACITY = 0.45;

/** Waterfall semantics (the reference's): start/end in ink, moves colored. */
const WF_UP = '#4E9B57';
const WF_DOWN = '#C4554D';

/* ── Frame ──────────────────────────────────────────────────────────── */

/** 300×180 viewBox; showValues carves margins for tick + label text, a
 *  legend pill claims a strip at the top, the axis-name pill one at the
 *  bottom. */
function plotRect(
  showValues: boolean,
  legend = false,
  axisName = false,
  size: { w: number; h: number } = { w: 300, h: 180 },
) {
  const y0 = (showValues ? 10 : 8) + (legend ? 20 : 0);
  const y1 = size.h - (showValues ? 26 : 20) - (showValues && axisName ? 14 : 0);
  return showValues
    ? { x0: 38, x1: size.w - 8, y0, y1 }
    : { x0: 8, x1: size.w - 8, y0, y1 };
}
type Plot = ReturnType<typeof plotRect>;

/** No box, no chrome — the text IS the input. The line-height pins the
 *  glyph baseline ~9px into the 12px box so a foreignObject at `y - 9`
 *  prints exactly where `<text y={y}>` would; display:block keeps it off
 *  the container baseline (an inline input sags a few px). */
const BARE_INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  padding: 0,
  margin: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'inherit',
  lineHeight: '12px',
  cursor: 'text',
  caretColor: 'currentColor',
};

/** The Chronicle-style legend pill: an OUTLINE capsule (no fill), the
 *  series marker (dot for bars/columns, dash for line-drawn charts), the
 *  name — click-and-type in place with `onRename`, and the capsule
 *  stretches with every keystroke. */
function Legend({
  label,
  color,
  marker = 'dot',
  markerOpacity = 1,
  scale = 1,
  ariaLabel = 'Legend name',
  onRename,
}: {
  label: string;
  color: string;
  marker?: 'dot' | 'dash';
  /** Stacked pills carry their segment's SHADE. */
  markerOpacity?: number;
  /** Focus mode shrinks the pill — chrome must not grow with the plot. */
  scale?: number;
  /** Unique per pill when several sit in one row. */
  ariaLabel?: string;
  onRename?: (name: string) => void;
}) {
  // While the name is being edited it lives in a DRAFT: non-empty
  // keystrokes commit live, but an emptied field does NOT — committing ''
  // would unmount the pill mid-edit (the host hides a nameless legend),
  // stranding the user (owner report 2026-08-22). Emptiness commits only
  // on Enter/blur, and only THEN may the pill disappear.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? label;
  const w = Math.max(28, 21 + text.length * 3.9);
  return (
    <g data-chart-legend="true" transform={scale !== 1 ? `scale(${scale})` : undefined}>
      {/* rx 5 viewBox units ≈ the DS control radius at the typical render
          scale; the hairline outline is deliberately sub-pixel. */}
      <rect
        x={0}
        y={0}
        width={w}
        height={14}
        rx={5}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="0.75"
      />
      {marker === 'dash' ? (
        <line
          x1={5.5}
          y1={7}
          x2={11.5}
          y2={7}
          stroke={color}
          strokeOpacity={markerOpacity}
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        />
      ) : (
        <circle cx={8.5} cy={7} r={2.5} fill={color} fillOpacity={markerOpacity} aria-hidden />
      )}
      {onRename ? (
        <foreignObject
          x={14.5}
          // y=1 sits the TEXT's visual center (x-height middle, not the
          // box) on the dot's center — at y=2 the name read a hair low.
          y={1}
          width={Math.max(12, w - 19)}
          height={11}
          style={{ overflow: 'visible' }}
        >
          <input
            aria-label={ariaLabel}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              if (next.trim() !== '') onRename(next);
            }}
            onFocus={(e) => {
              const el = e.currentTarget;
              setDraft(label);
              requestAnimationFrame(() => el.select());
            }}
            onBlur={() => {
              if (draft !== null) onRename(draft);
              setDraft(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ ...BARE_INPUT, fontSize: 7.5, lineHeight: '11px', opacity: 0.75 }}
          />
        </foreignObject>
      ) : (
        <text x={14.5} y={9} fontSize="7.5" fill="currentColor" fillOpacity="0.75">
          {label}
        </text>
      )}
    </g>
  );
}

/** Radial charts carry a pill PER SLICE across the top (the reference's
 *  row of category chips) — dot in the slice's ramp shade, label
 *  click-and-type when the host allows label edits. */
function PillRow({
  count,
  labels,
  accent,
  onLabelsChange,
}: {
  count: number;
  labels?: string[];
  accent: string;
  onLabelsChange?: (labels: string[]) => void;
}) {
  const items = Array.from({ length: count }, (_, i) => labels?.[i] ?? `Item ${i + 1}`);
  // Months print abbreviated at rest; focusing shows the stored text.
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <foreignObject
      data-chart-legend="true"
      x={4}
      y={3}
      width={292}
      height={40}
      style={{ overflow: 'visible' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((label, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3.5,
              padding: '1.5px 6px',
              // DS-family rounding (≈ --ds-radius-control at render scale)
              // and a hairline outline, matching the Legend pill.
              borderRadius: 5,
              border: '0.75px solid color-mix(in srgb, currentColor 22%, transparent)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 4.5,
                height: 4.5,
                borderRadius: 3,
                background: accent,
                opacity: rampOpacity(i, items.length),
                flex: 'none',
              }}
            />
            {onLabelsChange ? (
              <input
                aria-label={`Legend label ${i + 1}`}
                value={editing === i ? label : displayLabel(label)}
                onChange={(e) =>
                  onLabelsChange(items.map((l, j) => (j === i ? e.target.value : l)))
                }
                onFocus={() => setEditing(i)}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
                style={{
                  ...BARE_INPUT,
                  width: `${Math.max(2, (editing === i ? label : displayLabel(label)).length)}ch`,
                  fontSize: 7,
                  lineHeight: '9.5px',
                  opacity: 0.75,
                }}
              />
            ) : (
              <span style={{ fontSize: 7, lineHeight: '9.5px', opacity: 0.75 }}>
                {displayLabel(label)}
              </span>
            )}
          </span>
        ))}
      </div>
    </foreignObject>
  );
}

/** The axis-name pill — below cartesian charts, rotated on the left of
 *  horizontal bars. Same material as the Legend pill (outline capsule,
 *  hairline, DS rounding) and click-and-type the same way; like the
 *  legend, an EMPTIED name only commits on Enter/blur, so the pill never
 *  unmounts mid-edit. */
function AxisNamePill({
  x,
  y,
  label,
  rotate,
  onRename,
}: {
  x: number;
  y: number;
  label: string;
  rotate?: boolean;
  onRename?: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? label;
  const w = Math.max(24, 13 + text.length * 3.9);
  return (
    <g data-axis-pill="true" transform={rotate ? `rotate(-90 ${x} ${y})` : undefined}>
      <rect
        x={x - w / 2}
        y={y - 7}
        width={w}
        height={14}
        rx={5}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="0.75"
      />
      {onRename ? (
        <foreignObject
          x={x - w / 2 + 4}
          y={y - 6}
          width={Math.max(12, w - 8)}
          height={11}
          style={{ overflow: 'visible' }}
        >
          <input
            aria-label="Axis name"
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              if (next.trim() !== '') onRename(next);
            }}
            onFocus={(e) => {
              const el = e.currentTarget;
              setDraft(label);
              requestAnimationFrame(() => el.select());
            }}
            onBlur={() => {
              if (draft !== null) onRename(draft);
              setDraft(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              ...BARE_INPUT,
              fontSize: 7.5,
              lineHeight: '11px',
              textAlign: 'center',
              opacity: 0.6,
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={x}
          y={y + 2}
          textAnchor="middle"
          fontSize="7.5"
          fill="currentColor"
          fillOpacity="0.6"
        >
          {text}
        </text>
      )}
    </g>
  );
}

function Grid({ p, grid = true }: { p: Plot; grid?: boolean }) {
  if (!grid) return null;
  const h = p.y1 - p.y0;
  return (
    <g aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={p.x0}
          y1={p.y1 - h * f}
          x2={p.x1}
          y2={p.y1 - h * f}
          stroke="currentColor"
          strokeOpacity="0.07"
          strokeWidth="0.75"
        />
      ))}
    </g>
  );
}

/** Ticks (0 included), minor grid halfway between majors, axis lines and
 *  the category labels — the showValues frame for vertical charts. */
function CartesianAxis({
  p,
  ticks,
  niceMax,
  labels,
  xAt,
  format,
  grid,
  showAxis = true,
  labelsMode = 'auto',
  baseline = true,
  onLabelChange,
}: {
  p: Plot;
  ticks: number[];
  niceMax: number;
  labels?: string[];
  xAt: (i: number) => number;
  format?: ValueFormat;
  grid?: boolean;
  showAxis?: boolean;
  labelsMode?: 'auto' | 'edges';
  /** Bar-family charts pass false and redraw the baseline OVER their
   *  bars, so the line visibly cuts the bar starts (owner request). */
  baseline?: boolean;
  onLabelChange?: (index: number, label: string) => void;
}) {
  const h = p.y1 - p.y0;
  const halfStep = (ticks[0] ?? 0) / 2;
  const wantsLabel = (t: number) => (labelsMode === 'edges' ? t === 0 || t === niceMax : true);
  return (
    <g aria-hidden>
      {/* Minor grid: an unlabeled line HALFWAY between every major pair
          (100 · 200 get a quiet 150 between them), fainter than majors. */}
      {grid !== false &&
        halfStep > 0 &&
        [0, ...ticks].map((t) =>
          t + halfStep <= niceMax ? (
            <line
              key={`minor-${t}`}
              data-chart-minor="true"
              x1={p.x0}
              y1={p.y1 - ((t + halfStep) / niceMax) * h}
              x2={p.x1}
              y2={p.y1 - ((t + halfStep) / niceMax) * h}
              stroke="currentColor"
              strokeOpacity="0.07"
              strokeWidth="0.75"
            />
          ) : null,
        )}
      {[0, ...ticks].map((t) => {
        const y = p.y1 - (t / niceMax) * h;
        return (
          <g key={t}>
            {t > 0 && grid !== false && (
              <line x1={p.x0} y1={y} x2={p.x1} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.75" />
            )}
            {showAxis && wantsLabel(t) && (
              <text
                x={p.x0 - 5}
                y={y + 3}
                textAnchor="end"
                fontSize="8.5"
                fill="currentColor"
                fillOpacity="0.45"
              >
                {/* Ticks stay symbol-free (the reference's rule) — only
                    the abbreviation choice carries over. */}
                {formatValue(t, format?.full ? { full: true } : undefined)}
              </text>
            )}
          </g>
        );
      })}
      {/* The frame axes sit half a width OUTSIDE the plot, so the bars
          end flush against their inner edge — nothing ever shows under
          or through them (owner request 2026-08-22). */}
      {showAxis && (
        <line
          x1={p.x0 - AXIS_W / 2}
          y1={p.y0}
          x2={p.x0 - AXIS_W / 2}
          y2={p.y1}
          stroke="currentColor"
          strokeOpacity={AXIS_OPACITY}
          strokeWidth={AXIS_W}
        />
      )}
      {baseline && (
        <line
          x1={showAxis ? p.x0 - AXIS_W : p.x0}
          y1={p.y1 + AXIS_W / 2}
          x2={p.x1}
          y2={p.y1 + AXIS_W / 2}
          stroke="currentColor"
          strokeOpacity={AXIS_OPACITY}
          strokeWidth={AXIS_W}
        />
      )}
      {labels?.map((label, i) =>
        onLabelChange ? (
          <EditableLabel
            key={i}
            x={xAt(i)}
            y={p.y1 + 13}
            label={label}
            ariaLabel={`Chart label ${i + 1}`}
            onCommit={(next) => onLabelChange(i, next)}
          />
        ) : (
          <text
            key={i}
            x={xAt(i)}
            y={p.y1 + 13}
            textAnchor="middle"
            fontSize="8.5"
            fill="currentColor"
            fillOpacity="0.45"
          >
            {(() => {
              const shown = displayLabel(label);
              return shown.length > 7 ? `${shown.slice(0, 6)}…` : shown;
            })()}
          </text>
        ),
      )}
    </g>
  );
}

function ChartSvg({
  testId,
  width,
  viewBox = '0 0 300 180',
  onLeave,
  onCursor,
  children,
}: {
  testId: string;
  width: number;
  viewBox?: string;
  onLeave?: () => void;
  /** The cursor in viewBox units, ALREADY offset 15px right / 10px down
   *  (screen px, converted) — the hover tip rides it (owner request
   *  2026-08-22: the popup follows the mouse). */
  onCursor?: (x: number, y: number) => void;
  children: React.ReactNode;
}) {
  const track = onCursor
    ? (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const sx = vb.width / rect.width;
        const sy = vb.height / rect.height;
        onCursor((e.clientX - rect.left + 15) * sx, (e.clientY - rect.top + 10) * sy);
      }
    : undefined;
  return (
    <svg
      viewBox={viewBox}
      style={{ width, display: 'block', fontFamily: 'inherit', overflow: 'visible' }}
      data-element={testId}
      onMouseLeave={onLeave}
      onMouseMove={track}
      onMouseOver={track}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** The printed value beside a shape. Display-only by owner decision. */
/** The rial sign is a MARKER, never printed: fonts render U+FDFC as a
 *  "ريال" word ligature, so wherever it appears the official Saudi
 *  riyal artwork is drawn instead (owner request 2026-08-22). */
const SAR_MARKER = '﷼';
const SAR_VB = { w: 1124.14, h: 1256.39 };
const SAR_PATHS = [
  'M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z',
  'M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z',
];

/** The riyal mark in SVG chart space — baseline-aligned at (x, y),
 *  `h` tall, inheriting the surrounding fill. */
function SarMark({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g transform={`translate(${x} ${y - h}) scale(${h / SAR_VB.h})`} aria-label="SAR">
      {SAR_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

/** The riyal mark for HTML surfaces (the hover tip). */
function SarMarkHtml({ size }: { size: number }) {
  return (
    <svg
      viewBox={`0 0 ${SAR_VB.w} ${SAR_VB.h}`}
      style={{ height: size, width: 'auto', flex: 'none' }}
      aria-label="SAR"
    >
      {SAR_PATHS.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Digits at the value type's size — close enough to lay the riyal
 *  mark beside a number without measuring the DOM. */
const estValueWidth = (t: string) =>
  [...t].reduce((acc, ch) => acc + ('.,'.includes(ch) ? 2.7 : 5.1), 0);

function Value({
  x,
  y,
  text,
  hot,
  accent,
  anchor = 'middle',
  entranceMs,
}: {
  x: number;
  y: number;
  text: string;
  hot?: boolean;
  accent: string;
  anchor?: 'start' | 'middle' | 'end';
  entranceMs?: number;
}) {
  const fill = hot ? accent : 'currentColor';
  const fillOpacity = hot ? 1 : 0.75;
  if (text.includes(SAR_MARKER)) {
    const bare = text.split(SAR_MARKER).join('').trim();
    const iconH = 6.8;
    const iconW = iconH * (SAR_VB.w / SAR_VB.h);
    const gap = 1.6;
    const total = iconW + gap + estValueWidth(bare);
    const leftX = anchor === 'middle' ? x - total / 2 : anchor === 'start' ? x : x - total;
    return (
      <g
        className={entranceMs === undefined ? undefined : 'el-fade'}
        style={entranceMs === undefined ? undefined : after(entranceMs)}
        fill={fill}
        fillOpacity={fillOpacity}
      >
        <SarMark x={leftX} y={y} h={iconH} />
        <text
          data-chart-value="true"
          x={leftX + iconW + gap}
          y={y}
          textAnchor="start"
          fontSize="9"
          fontWeight={600}
        >
          {bare}
        </text>
      </g>
    );
  }
  return (
    <text
      data-chart-value="true"
      className={entranceMs === undefined ? undefined : 'el-fade'}
      style={entranceMs === undefined ? undefined : after(entranceMs)}
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="9"
      fontWeight={600}
      fill={fill}
      fillOpacity={fillOpacity}
    >
      {text}
    </text>
  );
}

/** A category label as bare click-and-type text. */
function EditableLabel({
  x,
  y,
  label,
  anchor = 'middle',
  ariaLabel,
  onCommit,
}: {
  x: number;
  y: number;
  label: string;
  anchor?: 'start' | 'middle' | 'end';
  ariaLabel: string;
  onCommit: (label: string) => void;
}) {
  // At rest the label PRINTS abbreviated (months → Jan/Feb); focusing
  // swaps to the stored full text so the user edits the real value.
  const [draft, setDraft] = useState<string | null>(null);
  const w = 60;
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return (
    <foreignObject x={left} y={y - 9} width={w} height={12} style={{ overflow: 'visible' }}>
      <input
        aria-label={ariaLabel}
        value={draft ?? displayLabel(label)}
        onChange={(e) => {
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        onFocus={(e) => {
          const el = e.currentTarget;
          setDraft(label);
          requestAnimationFrame(() => el.select());
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          ...BARE_INPUT,
          fontSize: 8.5,
          textAlign: anchor === 'start' ? 'left' : anchor === 'end' ? 'right' : 'center',
          opacity: 0.5,
        }}
      />
    </foreignObject>
  );
}

/**
 * The hover popup — editor-chrome material (the FloatingToolbar's dark
 * card, DS radii), never the slide's artwork.
 */
function ChartTip({
  x,
  y,
  vbW,
  vbH,
  label,
  value,
  dotColor,
  dotOpacity = 1,
  rows,
}: {
  x: number;
  y: number;
  vbW: number;
  vbH: number;
  label: string;
  value: string;
  dotColor: string;
  dotOpacity?: number;
  /** Multi-series readout (stacked charts): one dot + value per segment
   *  in that segment's shade, instead of the single big value. */
  rows?: Array<{ label?: string; value: string; color: string; opacity?: number }>;
}) {
  const W = 96;
  const H = rows ? 18 + rows.length * 14 : 40;
  const left = Math.max(2, Math.min(x, vbW - W - 2));
  const top = Math.max(2, Math.min(y, vbH - H - 2));
  return (
    <foreignObject
      data-chart-tip="true"
      x={left}
      y={top}
      width={W}
      height={H}
      pointerEvents="none"
      style={{ overflow: 'visible' }}
    >
      <div
        className="el-rise"
        style={{
          display: 'flex',
          width: 'max-content',
          flexDirection: 'column',
          gap: 1,
          background: '#242427',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--ds-radius-control, 8px)',
          padding: '5px 8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {rows ? (
          <>
            <span style={{ fontSize: 7.5, lineHeight: 1.3, color: 'rgba(255,255,255,0.55)' }}>
              {displayLabel(label)}
            </span>
            {rows.map((row, i) => (
              <span
                key={i}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, lineHeight: 1.2 }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2,
                    background: row.color,
                    opacity: Math.max(0.35, row.opacity ?? 1),
                    flex: 'none',
                  }}
                />
                {row.label && (
                  <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)' }}>
                    {displayLabel(row.label)}
                  </span>
                )}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: 2,
                    fontSize: 10.5,
                    fontWeight: 650,
                    color: '#FFFFFF',
                  }}
                >
                  {row.value.includes(SAR_MARKER) && <SarMarkHtml size={8} />}
                  {row.value.split(SAR_MARKER).join('').trim()}
                </span>
              </span>
            ))}
          </>
        ) : (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 7.5,
                lineHeight: 1.3,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2,
                  background: dotColor,
                  opacity: Math.max(0.5, dotOpacity),
                  flex: 'none',
                }}
              />
              {displayLabel(label)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 2.5,
                fontSize: 12.5,
                fontWeight: 650,
                lineHeight: 1.15,
                color: '#FFFFFF',
              }}
            >
              {value.includes(SAR_MARKER) && <SarMarkHtml size={9.5} />}
              {value.split(SAR_MARKER).join('').trim()}
            </span>
          </>
        )}
      </div>
    </foreignObject>
  );
}

/**
 * Press a shape and pull. The cursor's travel converts to value units
 * through the chart's own scale (viewBox → screen measured at press), so
 * the shape tracks the hand exactly; the host commits every step live.
 */
function startValueDrag(
  e: React.MouseEvent<SVGGraphicsElement>,
  opts: {
    axis: 'x' | 'y';
    value: number;
    /** Value units per viewBox unit along the drag axis. */
    valuePerUnit: number;
    min?: number;
    commit: (value: number) => void;
    onEnd?: () => void;
  },
) {
  const svg = e.currentTarget.ownerSVGElement;
  if (!svg) return;
  e.preventDefault();
  // A shape drag is the shape's alone — without this the press bubbles to
  // the surrounding chart BLOCK and moves the whole chart too.
  e.stopPropagation();
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const perPx =
    opts.axis === 'y'
      ? (vb.height / rect.height) * opts.valuePerUnit
      : (vb.width / rect.width) * opts.valuePerUnit;
  const startPos = opts.axis === 'y' ? e.clientY : e.clientX;
  const move = (ev: MouseEvent) => {
    const pos = opts.axis === 'y' ? ev.clientY : ev.clientX;
    const raw = opts.value + (opts.axis === 'y' ? startPos - pos : pos - startPos) * perPx;
    const clamped = opts.min !== undefined ? Math.max(opts.min, raw) : raw;
    opts.commit(Math.abs(clamped) >= 10 ? Math.round(clamped) : Math.round(clamped * 10) / 10);
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    opts.onEnd?.();
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

/* ── Columns & bars ─────────────────────────────────────────────────── */

const COLUMN_SAMPLE = [45, 80, 30, 62, 95, 50];

export function ColumnChart({
  values = COLUMN_SAMPLE,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onSeriesNameChange,
  onAxisLabelChange,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const showLegend = Boolean(legend && seriesName);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const p = plotRect(!!showValues, showLegend, showPill, SZ);
  const capMax = axisMax && axisMax > 0 ? axisMax : Math.max(...values, 1);
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const step = (p.x1 - p.x0) / values.length;
  const xAt = (i: number) => p.x0 + i * step + step / 2;
  const barW = Math.min(SZ.w / 10, step * 0.68);
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="column-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {showLegend && (
        <Legend scale={SZ.w > 500 ? 0.85 : 1} label={seriesName!} color={accent} onRename={onSeriesNameChange} />
      )}
      {showValues ? (
        <CartesianAxis
          p={p}
          ticks={ticks}
          niceMax={niceMax}
          labels={showCategoryAxis ? labels : undefined}
          xAt={xAt}
          format={format}
          grid={grid}
          showAxis={showAxis}
          labelsMode={axisLabelsMode}
          baseline={false}
          onLabelChange={
            onLabelsChange && labels
              ? (i, next) => onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
              : undefined
          }
        />
      ) : (
        <Grid p={p} grid={grid} />
      )}
      {showPill && <AxisNamePill x={(p.x0 + p.x1) / 2} y={SZ.h - 8} label={axisLabel!} onRename={onAxisLabelChange} />}
      {v.map((val, i) => {
        const h = Math.max(0, (val / scaleMax) * (p.y1 - p.y0));
        const hot = hover === i;
        const labelY = Math.max(p.y0 + 4, p.y1 - h - 8);
        return (
          <g key={i}>
            <rect
              x={p.x0 + i * step}
              y={p.y0}
              width={step}
              height={p.y1 - p.y0}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {/* The reference's hover: a quiet ink veil EXACTLY the bar's
                width, running from the plot top down to the baseline. */}
            {hot && (
              <rect
                data-chart-highlight="true"
                x={xAt(i) - barW / 2}
                y={p.y0}
                width={barW}
                height={p.y1 - p.y0}
                fill="currentColor"
                fillOpacity="0.08"
                pointerEvents="none"
              />
            )}
            <path
              className="el-grow-y"
              style={{
                ...delay(i),
                cursor: onValuesChange ? 'ns-resize' : undefined,
              }}
              d={topRoundedRect(xAt(i) - barW / 2, p.y1 - h, barW, h, 5)}
              fill={accent}
              fillOpacity={1}
              onMouseEnter={() => setHover(i)}
              onMouseDown={
                onValuesChange
                  ? (e) => {
                      setDragging(true);
                      setHover(i);
                      startValueDrag(e, {
                        axis: 'y',
                        value: values[i],
                        valuePerUnit: scaleMax / (p.y1 - p.y0),
                        min: 0,
                        commit: (next) => setOne(i, next),
                        onEnd: () => setDragging(false),
                      });
                    }
                  : undefined
              }
            />
            {(showValues || hot) && (
              <Value
                x={xAt(i)}
                y={labelY}
                text={formatValue(val, format)}
                hot={hot}
                accent={accent}
                entranceMs={hot ? undefined : 200 + i * 60}
              />
            )}
          </g>
        );
      })}
      {/* The baseline sits just BELOW the plot, heavy and solid — the
          bars end flush against it and can never show under it. */}
      {showValues && (
        <line
          x1={showAxis ? p.x0 - AXIS_W : p.x0}
          y1={p.y1 + AXIS_W / 2}
          x2={p.x1}
          y2={p.y1 + AXIS_W / 2}
          stroke="currentColor"
          strokeOpacity={AXIS_OPACITY}
          strokeWidth={AXIS_W}
          pointerEvents="none"
        />
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
        />
      )}
    </ChartSvg>
  );
}

export function BarChart({
  values = [70, 95, 40, 60],
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onSeriesNameChange,
  onAxisLabelChange,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const showLegend = Boolean(legend && seriesName);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const base = plotRect(!!showValues, showLegend, false, SZ);
  // The rotated axis-name pill claims a strip on the LEFT for bars.
  const p = showPill ? { ...base, x0: base.x0 + 12 } : base;
  const capMax = axisMax && axisMax > 0 ? axisMax : Math.max(...values, 1);
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const step = (p.y1 - p.y0 + 8) / values.length;
  const yAt = (i: number) => p.y0 - 4 + i * step + step / 2;
  const barH = Math.min(SZ.h / 7, step * 0.72);
  const wantsTick = (t: number) => (axisLabelsMode === 'edges' ? t === 0 || t === niceMax : true);
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="bar-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {showLegend && (
        <Legend scale={SZ.w > 500 ? 0.85 : 1} label={seriesName!} color={accent} onRename={onSeriesNameChange} />
      )}
      {showPill && (
        <AxisNamePill
          x={base.x0 - 28}
          y={(p.y0 + p.y1) / 2}
          label={axisLabel!}
          rotate
          onRename={onAxisLabelChange}
        />
      )}
      {/* The value axis runs along the BOTTOM: vertical grid lines at
          every tick (minors halfway), labels 0 → max beneath, a stronger
          zero line where the bars set off. */}
      {showValues && (
        <g aria-hidden>
          {grid &&
            (ticks[0] ?? 0) > 0 &&
            [0, ...ticks].map((t) => {
              const half = t + ticks[0] / 2;
              if (half > scaleMax) return null;
              const x = p.x0 + (half / scaleMax) * (p.x1 - p.x0);
              return (
                <line
                  key={`minor-${t}`}
                  data-chart-minor="true"
                  x1={x}
                  y1={p.y0 - 4}
                  x2={x}
                  y2={p.y1 + 8}
                  stroke="currentColor"
                  strokeOpacity="0.07"
                  strokeWidth="0.75"
                />
              );
            })}
          {[0, ...ticks].map((t) => {
            const x = p.x0 + (t / scaleMax) * (p.x1 - p.x0);
            return (
              <g key={t}>
                {/* The zero line is drawn AFTER the bars (it must cut
                    their start), so the loop keeps only the majors. */}
                {t > 0 && grid && (
                  <line
                    x1={x}
                    y1={p.y0 - 4}
                    x2={x}
                    y2={p.y1 + 8}
                    stroke="currentColor"
                    strokeOpacity="0.07"
                    strokeWidth="0.75"
                  />
                )}
                {showAxis && wantsTick(t) && (
                  <text
                    x={x}
                    y={p.y1 + 17}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="currentColor"
                    fillOpacity="0.45"
                  >
                    {/* Ticks stay symbol-free (the reference's rule) — only
                    the abbreviation choice carries over. */}
                {formatValue(t, format?.full ? { full: true } : undefined)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
      {v.map((val, i) => {
        const w = Math.max(0, (val / scaleMax) * (p.x1 - p.x0));
        const hot = hover === i;
        return (
          <g key={i}>
            <rect
              x={p.x0}
              y={yAt(i) - step / 2}
              width={p.x1 - p.x0}
              height={step}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hot && (
              <rect
                data-chart-highlight="true"
                x={p.x0}
                y={yAt(i) - barH / 2}
                width={p.x1 - p.x0}
                height={barH}
                fill="currentColor"
                fillOpacity="0.08"
                pointerEvents="none"
              />
            )}
            {showValues &&
              showCategoryAxis &&
              labels?.[i] !== undefined &&
              (onLabelsChange ? (
                <EditableLabel
                  x={p.x0 - 5}
                  y={yAt(i) + 3}
                  label={labels[i]}
                  anchor="end"
                  ariaLabel={`Chart label ${i + 1}`}
                  onCommit={(next) =>
                    onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
                  }
                />
              ) : (
                <text
                  x={p.x0 - 5}
                  y={yAt(i) + 3}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="currentColor"
                  fillOpacity="0.45"
                >
                  {(() => {
                    const shown = displayLabel(labels[i]);
                    return shown.length > 6 ? `${shown.slice(0, 5)}…` : shown;
                  })()}
                </text>
              ))}
            <path
              className="el-grow-x"
              style={{
                ...delay(i),
                cursor: onValuesChange ? 'ew-resize' : undefined,
              }}
              d={rightRoundedRect(p.x0, yAt(i) - barH / 2, w, barH, 5)}
              fill={accent}
              fillOpacity={1}
              onMouseEnter={() => setHover(i)}
              onMouseDown={
                onValuesChange
                  ? (e) => {
                      setDragging(true);
                      setHover(i);
                      startValueDrag(e, {
                        axis: 'x',
                        value: values[i],
                        valuePerUnit: scaleMax / (p.x1 - p.x0),
                        min: 0,
                        commit: (next) => setOne(i, next),
                        onEnd: () => setDragging(false),
                      });
                    }
                  : undefined
              }
            />
            {(showValues || hot) && (
              <Value
                x={Math.min(p.x1 - 2, p.x0 + w + 6)}
                y={yAt(i) + 3}
                text={formatValue(val, format)}
                hot={hot}
                accent={accent}
                anchor="start"
                entranceMs={hot ? undefined : 200 + i * 70}
              />
            )}
          </g>
        );
      })}
      {/* The zero line sits just LEFT of the plot, heavy and solid —
          the bars start flush against it and can never show under it. */}
      {showValues && (
        <g pointerEvents="none">
          {/* The rows sit on a band 4 units taller than the plot (see
              `yAt`). The frame reaches a little PAST that band — the
              zero line rises above the first bar and the bottom axis
              sits clear below the last one — and the two are JOINED at
              the corner the same way the Column frame joins (owner
              requests 2026-08-22). */}
          <line
            x1={p.x0 - AXIS_W / 2}
            y1={p.y0 - 8}
            x2={p.x0 - AXIS_W / 2}
            y2={p.y1 + 8}
            stroke="currentColor"
            strokeOpacity={AXIS_OPACITY}
            strokeWidth={AXIS_W}
          />
          <line
            x1={p.x0 - AXIS_W}
            y1={p.y1 + 8 + AXIS_W / 2}
            x2={p.x1}
            y2={p.y1 + 8 + AXIS_W / 2}
            stroke="currentColor"
            strokeOpacity={AXIS_OPACITY}
            strokeWidth={AXIS_W}
          />
        </g>
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
        />
      )}
    </ChartSvg>
  );
}

const STACK_SAMPLE = [
  [30, 22, 14],
  [46, 26, 18],
  [24, 16, 10],
  [38, 30, 20],
  [52, 34, 22],
  [32, 20, 12],
];
const STACK_OPACITY = [1, 0.55, 0.3, 0.18];

export function StackedColumnChart({
  series = STACK_SAMPLE,
  seriesNames,
  seriesColors,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onSeriesNameChange,
  onSeriesNamesChange,
  onAxisLabelChange,
  onLabelsChange,
  onSeriesChange,
}: SeriesChartProps) {
  const [dragging, setDragging] = useState(false);
  const animated = useAnimatedSeries(series, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const pillNames =
    seriesNames && seriesNames.length > 0 ? seriesNames : seriesName ? [seriesName] : [];
  const showLegend = Boolean(legend && pillNames.length > 0);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const p = plotRect(!!showValues, showLegend, showPill, SZ);
  const totals = series.map((s) => s.reduce((a, b) => a + b, 0));
  const capMax = axisMax && axisMax > 0 ? axisMax : Math.max(...totals, 1);
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const step = (p.x1 - p.x0) / series.length;
  const xAt = (i: number) => p.x0 + i * step + step / 2;
  const barW = Math.min(SZ.w / 10, step * 0.68);
  const gridMask = `gm${useId().replace(/:/g, '')}`;
  return (
    <ChartSvg testId="stacked-column-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {/* One pill PER SERIES, each in its segment's shade and renamable
          in place (owner request 2026-08-22). */}
      {showLegend && (
        <g transform={SZ.w > 500 ? 'scale(0.85)' : undefined}>
          {pillNames.map((name, s) => {
            const offset = pillNames
              .slice(0, s)
              .reduce((acc, prev) => acc + Math.max(28, 21 + prev.length * 3.9) + 5, 0);
            return (
              <g key={s} transform={`translate(${offset} 0)`}>
                <Legend
                  label={name}
                  color={seriesColors?.[s] ?? accent}
                  markerOpacity={seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12}
                  ariaLabel={`Legend name ${s + 1}`}
                  onRename={
                    onSeriesNamesChange
                      ? (next) =>
                          onSeriesNamesChange(pillNames.map((x, j) => (j === s ? next : x)))
                      : s === 0
                        ? onSeriesNameChange
                        : undefined
                  }
                />
              </g>
            );
          })}
        </g>
      )}
      {/* The grid is CARVED OUT behind each stack: a translucent
          segment must never show a line through it, and its own shade
          must not change — so the lines stop at the stack's silhouette
          instead (owner request 2026-08-22). */}
      <defs>
        <mask id={gridMask} maskUnits="userSpaceOnUse" x={0} y={0} width={SZ.w} height={SZ.h}>
          <rect x={0} y={0} width={SZ.w} height={SZ.h} fill="#fff" />
          {animated.map((segments, i) => {
            const total = segments.reduce((a, b) => a + b, 0);
            const h = Math.max(0, (total / scaleMax) * (p.y1 - p.y0));
            return h > 0 ? (
              <path
                key={i}
                className="el-grow-y"
                style={delay(i)}
                d={topRoundedRect(xAt(i) - barW / 2, p.y1 - h, barW, h, 3)}
                fill="#000"
              />
            ) : null;
          })}
        </mask>
      </defs>
      <g mask={`url(#${gridMask})`}>
        {showValues ? (
          <CartesianAxis
            p={p}
            ticks={ticks}
            niceMax={niceMax}
            labels={showCategoryAxis ? labels : undefined}
            xAt={xAt}
            format={format}
            grid={grid}
            showAxis={showAxis}
            labelsMode={axisLabelsMode}
            baseline={false}
            onLabelChange={
              onLabelsChange && labels
                ? (i, next) => onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
                : undefined
            }
          />
        ) : (
          <Grid p={p} grid={grid} />
        )}
      </g>
      {showPill && <AxisNamePill x={(p.x0 + p.x1) / 2} y={SZ.h - 8} label={axisLabel!} onRename={onAxisLabelChange} />}
      {animated.map((segments, i) => {
        let y = p.y1;
        // The bottommost visible segment is CUT flat by the baseline —
        // no rounded start, no gap (owner request 2026-08-22).
        let baseTaken = false;
        const hot = hover === i;
        const total = segments.reduce((a, b) => a + b, 0);
        return (
          <g key={i}>
            <rect
              x={p.x0 + i * step}
              y={p.y0}
              width={step}
              height={p.y1 - p.y0}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {/* The reference's hover: a quiet ink veil EXACTLY the bar's
                width, running from the plot top down to the baseline. */}
            {hot && (
              <rect
                data-chart-highlight="true"
                x={xAt(i) - barW / 2}
                y={p.y0}
                width={barW}
                height={p.y1 - p.y0}
                fill="currentColor"
                fillOpacity="0.08"
                pointerEvents="none"
              />
            )}
            <g
              className="el-grow-y"
              style={{
                ...delay(i),
              }}
            >
              {segments.map((val, s) => {
                const h = Math.max(0, (val / scaleMax) * (p.y1 - p.y0));
                y -= h;
                const isBase = !baseTaken && h > 0;
                if (isBase) baseTaken = true;
                const shared = {
                  style: onSeriesChange
                    ? ({ cursor: 'ns-resize' } as React.CSSProperties)
                    : undefined,
                  fill: seriesColors?.[s] ?? accent,
                  fillOpacity: seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12,
                  onMouseEnter: () => setHover(i),
                  onMouseDown: onSeriesChange
                    ? (e: React.MouseEvent<SVGGraphicsElement>) => {
                        setDragging(true);
                        setHover(i);
                        startValueDrag(e, {
                          axis: 'y',
                          value: series[i][s],
                          valuePerUnit: scaleMax / (p.y1 - p.y0),
                          min: 0,
                          commit: (next) =>
                            onSeriesChange(
                              series.map((col, ci) =>
                                ci === i
                                  ? col.map((sv, si) => (si === s ? next : sv))
                                  : col,
                              ),
                            ),
                          onEnd: () => setDragging(false),
                        });
                      }
                    : undefined,
                };
                // The base segment keeps its rounded top but runs flat
                // down to the baseline — the line crops its start.
                return isBase ? (
                  <path
                    key={s}
                    {...shared}
                    d={topRoundedRect(
                      xAt(i) - barW / 2,
                      y + 1,
                      barW,
                      Math.max(0, p.y1 - y - 1),
                      3,
                    )}
                  />
                ) : (
                  <rect
                    key={s}
                    {...shared}
                    x={xAt(i) - barW / 2}
                    y={y + 1}
                    width={barW}
                    height={Math.max(0, h - 2)}
                    rx={3}
                  />
                );
              })}
            </g>
            {(showValues || hot) && (
              <Value
                x={xAt(i)}
                y={y - 5}
                text={formatValue(total, format)}
                hot={hot}
                accent={accent}
                entranceMs={hot ? undefined : 200 + i * 60}
              />
            )}
          </g>
        );
      })}
      {/* The baseline sits just BELOW the plot, heavy and solid — the
          bars end flush against it and can never show under it. */}
      {showValues && (
        <line
          x1={showAxis ? p.x0 - AXIS_W : p.x0}
          y1={p.y1 + AXIS_W / 2}
          x2={p.x1}
          y2={p.y1 + AXIS_W / 2}
          stroke="currentColor"
          strokeOpacity={AXIS_OPACITY}
          strokeWidth={AXIS_W}
          pointerEvents="none"
        />
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(totals[hover], format)}
          dotColor={accent}
          // One dot + value PER SEGMENT, in the segment's own shade.
          rows={series[hover].map((v, s) => ({
            label: seriesNames?.[s] ?? `Series ${s + 1}`,
            value: formatValue(v, format),
            color: seriesColors?.[s] ?? accent,
            opacity: seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12,
          }))}
        />
      )}
    </ChartSvg>
  );
}

export function StackedBarChart({
  series = [
    [40, 26, 16],
    [52, 30, 22],
    [28, 18, 12],
    [44, 24, 14],
  ],
  seriesNames,
  seriesColors,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onSeriesNameChange,
  onSeriesNamesChange,
  onAxisLabelChange,
  onLabelsChange,
  onSeriesChange,
}: SeriesChartProps) {
  const [dragging, setDragging] = useState(false);
  const animated = useAnimatedSeries(series, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const pillNames =
    seriesNames && seriesNames.length > 0 ? seriesNames : seriesName ? [seriesName] : [];
  const showLegend = Boolean(legend && pillNames.length > 0);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const base = plotRect(!!showValues, showLegend, false, SZ);
  const p = showPill ? { ...base, x0: base.x0 + 12 } : base;
  const totals = series.map((s) => s.reduce((a, b) => a + b, 0));
  const capMax = axisMax && axisMax > 0 ? axisMax : Math.max(...totals, 1);
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const step = (p.y1 - p.y0 + 8) / series.length;
  const yAt = (i: number) => p.y0 - 4 + i * step + step / 2;
  const barH = Math.min(SZ.h / 7, step * 0.72);
  const gridMask = `gm${useId().replace(/:/g, '')}`;
  const wantsTick = (t: number) => (axisLabelsMode === 'edges' ? t === 0 || t === niceMax : true);
  return (
    <ChartSvg testId="stacked-bar-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {/* One pill PER SERIES, each in its segment's shade and renamable
          in place (owner request 2026-08-22). */}
      {showLegend && (
        <g transform={SZ.w > 500 ? 'scale(0.85)' : undefined}>
          {pillNames.map((name, s) => {
            const offset = pillNames
              .slice(0, s)
              .reduce((acc, prev) => acc + Math.max(28, 21 + prev.length * 3.9) + 5, 0);
            return (
              <g key={s} transform={`translate(${offset} 0)`}>
                <Legend
                  label={name}
                  color={seriesColors?.[s] ?? accent}
                  markerOpacity={seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12}
                  ariaLabel={`Legend name ${s + 1}`}
                  onRename={
                    onSeriesNamesChange
                      ? (next) =>
                          onSeriesNamesChange(pillNames.map((x, j) => (j === s ? next : x)))
                      : s === 0
                        ? onSeriesNameChange
                        : undefined
                  }
                />
              </g>
            );
          })}
        </g>
      )}
      {showPill && (
        <AxisNamePill
          x={base.x0 - 28}
          y={(p.y0 + p.y1) / 2}
          label={axisLabel!}
          rotate
          onRename={onAxisLabelChange}
        />
      )}
      {/* The grid is CARVED OUT behind each stack: a translucent
          segment must never show a line through it, and its own shade
          must not change — so the lines stop at the stack's silhouette
          instead (owner request 2026-08-22). */}
      <defs>
        <mask id={gridMask} maskUnits="userSpaceOnUse" x={0} y={0} width={SZ.w} height={SZ.h}>
          <rect x={0} y={0} width={SZ.w} height={SZ.h} fill="#fff" />
          {animated.map((segments, i) => {
            const total = segments.reduce((a, b) => a + b, 0);
            const w = Math.max(0, (total / scaleMax) * (p.x1 - p.x0));
            return w > 0 ? (
              <path
                key={i}
                className="el-grow-x"
                style={delay(i)}
                d={rightRoundedRect(p.x0, yAt(i) - barH / 2, w, barH, 3)}
                fill="#000"
              />
            ) : null;
          })}
        </mask>
      </defs>
      {showValues && (
        <g aria-hidden mask={`url(#${gridMask})`}>
          {grid &&
            (ticks[0] ?? 0) > 0 &&
            [0, ...ticks].map((t) => {
              const half = t + ticks[0] / 2;
              if (half > scaleMax) return null;
              const x = p.x0 + (half / scaleMax) * (p.x1 - p.x0);
              return (
                <line
                  key={`minor-${t}`}
                  data-chart-minor="true"
                  x1={x}
                  y1={p.y0 - 4}
                  x2={x}
                  y2={p.y1 + 8}
                  stroke="currentColor"
                  strokeOpacity="0.07"
                  strokeWidth="0.75"
                />
              );
            })}
          {[0, ...ticks].map((t) => {
            const x = p.x0 + (t / scaleMax) * (p.x1 - p.x0);
            return (
              <g key={t}>
                {/* The zero line is drawn AFTER the bars (it must cut
                    their start), so the loop keeps only the majors. */}
                {t > 0 && grid && (
                  <line
                    x1={x}
                    y1={p.y0 - 4}
                    x2={x}
                    y2={p.y1 + 8}
                    stroke="currentColor"
                    strokeOpacity="0.07"
                    strokeWidth="0.75"
                  />
                )}
                {showAxis && wantsTick(t) && (
                  <text
                    x={x}
                    y={p.y1 + 17}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="currentColor"
                    fillOpacity="0.45"
                  >
                    {/* Ticks stay symbol-free (the reference's rule) — only
                    the abbreviation choice carries over. */}
                {formatValue(t, format?.full ? { full: true } : undefined)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
      {animated.map((segments, i) => {
        let x = p.x0;
        // The leftmost visible segment is CUT flat by the zero line —
        // no rounded start, no gap (owner request 2026-08-22).
        let baseTaken = false;
        const hot = hover === i;
        const total = segments.reduce((a, b) => a + b, 0);
        return (
          <g key={i}>
            <rect
              x={p.x0}
              y={yAt(i) - step / 2}
              width={p.x1 - p.x0}
              height={step}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hot && (
              <rect
                data-chart-highlight="true"
                x={p.x0}
                y={yAt(i) - barH / 2}
                width={p.x1 - p.x0}
                height={barH}
                fill="currentColor"
                fillOpacity="0.08"
                pointerEvents="none"
              />
            )}
            {showValues &&
              showCategoryAxis &&
              labels?.[i] !== undefined &&
              (onLabelsChange ? (
                <EditableLabel
                  x={p.x0 - 5}
                  y={yAt(i) + 3}
                  label={labels[i]}
                  anchor="end"
                  ariaLabel={`Chart label ${i + 1}`}
                  onCommit={(next) =>
                    onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
                  }
                />
              ) : (
                <text
                  x={p.x0 - 5}
                  y={yAt(i) + 3}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="currentColor"
                  fillOpacity="0.45"
                >
                  {(() => {
                    const shown = displayLabel(labels[i]);
                    return shown.length > 6 ? `${shown.slice(0, 5)}…` : shown;
                  })()}
                </text>
              ))}
            <g
              className="el-grow-x"
              style={{
                ...delay(i),
              }}
            >
              {segments.map((val, s) => {
                const w = Math.max(0, (val / scaleMax) * (p.x1 - p.x0));
                const isBase = !baseTaken && w > 0;
                if (isBase) baseTaken = true;
                const shared = {
                  style: onSeriesChange
                    ? ({ cursor: 'ew-resize' } as React.CSSProperties)
                    : undefined,
                  fill: seriesColors?.[s] ?? accent,
                  fillOpacity: seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12,
                  onMouseEnter: () => setHover(i),
                  onMouseDown: onSeriesChange
                    ? (e: React.MouseEvent<SVGGraphicsElement>) => {
                        setDragging(true);
                        setHover(i);
                        startValueDrag(e, {
                          axis: 'x',
                          value: series[i][s],
                          valuePerUnit: scaleMax / (p.x1 - p.x0),
                          min: 0,
                          commit: (next) =>
                            onSeriesChange(
                              series.map((col, ci) =>
                                ci === i
                                  ? col.map((sv, si) => (si === s ? next : sv))
                                  : col,
                              ),
                            ),
                          onEnd: () => setDragging(false),
                        });
                      }
                    : undefined,
                };
                // The base segment keeps its rounded end but starts flat
                // AT the zero line — the line crops its start.
                const seg = isBase ? (
                  <path
                    key={s}
                    {...shared}
                    d={rightRoundedRect(
                      x,
                      yAt(i) - barH / 2,
                      Math.max(0, w - 1),
                      barH,
                      3,
                    )}
                  />
                ) : (
                  <rect
                    key={s}
                    {...shared}
                    x={x + 1}
                    y={yAt(i) - barH / 2}
                    width={Math.max(0, w - 2)}
                    height={barH}
                    rx={3}
                  />
                );
                x += w;
                return seg;
              })}
            </g>
            {(showValues || hot) && (
              <Value
                x={Math.min(p.x1 - 2, x + 5)}
                y={yAt(i) + 3}
                text={formatValue(total, format)}
                hot={hot}
                accent={accent}
                anchor="start"
                entranceMs={hot ? undefined : 200 + i * 70}
              />
            )}
          </g>
        );
      })}
      {/* The zero line sits just LEFT of the plot, heavy and solid —
          the bars start flush against it and can never show under it. */}
      {showValues && (
        <g pointerEvents="none">
          {/* The rows sit on a band 4 units taller than the plot (see
              `yAt`). The frame reaches a little PAST that band — the
              zero line rises above the first bar and the bottom axis
              sits clear below the last one — and the two are JOINED at
              the corner the same way the Column frame joins (owner
              requests 2026-08-22). */}
          <line
            x1={p.x0 - AXIS_W / 2}
            y1={p.y0 - 8}
            x2={p.x0 - AXIS_W / 2}
            y2={p.y1 + 8}
            stroke="currentColor"
            strokeOpacity={AXIS_OPACITY}
            strokeWidth={AXIS_W}
          />
          <line
            x1={p.x0 - AXIS_W}
            y1={p.y1 + 8 + AXIS_W / 2}
            x2={p.x1}
            y2={p.y1 + 8 + AXIS_W / 2}
            stroke="currentColor"
            strokeOpacity={AXIS_OPACITY}
            strokeWidth={AXIS_W}
          />
        </g>
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(totals[hover], format)}
          dotColor={accent}
          // One dot + value PER SEGMENT, in the segment's own shade.
          rows={series[hover].map((v, s) => ({
            label: seriesNames?.[s] ?? `Series ${s + 1}`,
            value: formatValue(v, format),
            color: seriesColors?.[s] ?? accent,
            opacity: seriesColors?.[s] ? 1 : STACK_OPACITY[s] ?? 0.12,
          }))}
        />
      )}
    </ChartSvg>
  );
}

/* ── Lines ──────────────────────────────────────────────────────────── */

const LINE_SAMPLE = [30, 55, 42, 88, 24, 70];

/** Points span the plot EDGE TO EDGE — first and last sit on the frame,
 *  so the area wash reads as cropped by the plot's sides (the reference
 *  look), not floating inset. */
function linePoints(v: number[], p: Plot, scaleMax: number): Array<[number, number]> {
  return v.map((val, i) => [
    p.x0 + (i * (p.x1 - p.x0)) / Math.max(1, v.length - 1),
    p.y1 - (val / scaleMax) * (p.y1 - p.y0 - 10),
  ]);
}

export function LineChart({
  values = LINE_SAMPLE,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onSeriesNameChange,
  onAxisLabelChange,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const gradientId = useId();
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const showLegend = Boolean(legend && seriesName);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const p = plotRect(!!showValues, showLegend, showPill, SZ);
  const capMax = axisMax && axisMax > 0 ? axisMax : Math.max(...values, 1);
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const points = linePoints(v, p, scaleMax);
  const step = (p.x1 - p.x0) / v.length;
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath =
    points.length >= 2
      ? `${smoothPath(points)} L ${last[0].toFixed(1)} ${p.y1} L ${first[0].toFixed(1)} ${p.y1} Z`
      : '';
  return (
    <ChartSvg testId="line-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showLegend && (
        <Legend scale={SZ.w > 500 ? 0.85 : 1} label={seriesName!} color={accent} marker="dash" onRename={onSeriesNameChange} />
      )}
      {showValues ? (
        <CartesianAxis
          p={p}
          ticks={ticks}
          niceMax={niceMax}
          labels={showCategoryAxis ? labels : undefined}
          xAt={(i) => points[i]?.[0] ?? 0}
          format={format}
          grid={grid}
          showAxis={showAxis}
          labelsMode={axisLabelsMode}
          onLabelChange={
            onLabelsChange && labels
              ? (i, next) => onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
              : undefined
          }
        />
      ) : (
        <Grid p={p} grid={grid} />
      )}
      {showPill && <AxisNamePill x={(p.x0 + p.x1) / 2} y={SZ.h - 8} label={axisLabel!} onRename={onAxisLabelChange} />}
      {/* The reference's area wash under the curve. */}
      {areaPath && (
        <path
          className="el-fade"
          style={after(350)}
          d={areaPath}
          fill={`url(#${gradientId})`}
          pointerEvents="none"
        />
      )}
      <path
        className="el-draw"
        d={smoothPath(points)}
        pathLength={1}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {points.map(([x, y], i) => {
        const hot = hover === i;
        return (
          <g key={i}>
            <rect
              x={p.x0 + i * step}
              y={p.y0}
              width={step}
              height={p.y1 - p.y0}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {/* The line's hover is a DASHED vertical through the point
                (the reference look), not a veil. */}
            {hot && (
              <line
                data-chart-highlight="true"
                x1={x}
                y1={p.y0}
                x2={x}
                y2={p.y1}
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeDasharray="4 4"
                pointerEvents="none"
              />
            )}
            {/* White-cored dots, the reference look. */}
            <circle
              className="el-fade"
              style={after(150 + i * 110)}
              cx={x}
              cy={y}
              r={hot ? 4.4 : 3}
              fill="#FFFFFF"
              stroke={accent}
              strokeWidth={hot ? 2.2 : 1.6}
            />
            {onValuesChange && (
              <circle
                cx={x}
                cy={y}
                r={9}
                fill="transparent"
                style={{ cursor: 'ns-resize' }}
                onMouseEnter={() => setHover(i)}
                onMouseDown={(e) => {
                  setDragging(true);
                  setHover(i);
                  startValueDrag(e, {
                    axis: 'y',
                    value: values[i],
                    valuePerUnit: scaleMax / (p.y1 - p.y0 - 10),
                    min: 0,
                    commit: (next) => setOne(i, next),
                    onEnd: () => setDragging(false),
                  });
                }}
              />
            )}
            {(showValues || hot) && (
              <Value
                x={x}
                y={Math.max(p.y0 + 8, y - 9)}
                text={formatValue(v[i], format)}
                hot={hot}
                accent={accent}
                entranceMs={hot ? undefined : 250 + i * 110}
              />
            )}
          </g>
        );
      })}
      {hover !== null && points[hover] && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
        />
      )}
    </ChartSvg>
  );
}

/* ── Radial (pie · donut · half donut) ──────────────────────────────── */

/** Slice angles. Caps are BUTT, never round — a round cap extends half
 *  the stroke width past the angle, so neighbouring translucent slices
 *  overlapped and blended into a third color at every joint (owner
 *  report 2026-08-22). The donut family keeps a 2.5° breathing gap;
 *  the pie passes 0 — its slices sit FLUSH (owner request same day). */
function arcSegments(values: number[], from: number, span: number, gap = 2.5) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let angle = from;
  return values.map((v) => {
    const sweep = Math.max(0, (v / total) * span);
    const seg = { a0: angle, a1: angle + Math.max(0.1, sweep - gap) };
    angle += sweep;
    return seg;
  });
}

const ARC_SAMPLE = [34, 27, 22, 17];

/** The reference's outside labels: each slice's value printed just past
 *  the rim at its mid-angle. */
function OutsideLabels({
  cx,
  cy,
  r,
  segments,
  values,
  format,
  accent,
  hover,
}: {
  cx: number;
  cy: number;
  r: number;
  segments: Array<{ a0: number; a1: number }>;
  values: number[];
  format?: ValueFormat;
  accent: string;
  hover: number | null;
}) {
  return (
    <g aria-hidden>
      {segments.map((seg, i) => {
        const mid = (seg.a0 + seg.a1) / 2;
        const [x, y] = polar(cx, cy, r, mid);
        const c = Math.cos(rad(mid));
        const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
        return (
          <Value
            key={i}
            x={x}
            y={y + 3}
            text={formatValue(values[i], format)}
            hot={hover === i}
            accent={accent}
            anchor={anchor}
            entranceMs={250 + i * 90}
          />
        );
      })}
    </g>
  );
}

export function PieChart({
  values = ARC_SAMPLE,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  legend,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const segments = arcSegments(v, -90, 360, 0);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 150;
  const cy = 142;
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="pie-chart" width={width} viewBox="0 0 300 244" onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {legend && (
        <PillRow count={v.length} labels={labels} accent={accent} onLabelsChange={onLabelsChange} />
      )}
      {segments.map((seg, i) => (
        <path
          key={i}
          className="el-draw"
          style={{
            ...after(i * 140),
            transform: hover === i ? 'scale(1.05)' : undefined,
            transformOrigin: `${cx}px ${cy}px`,
            transition: HOVER_EASE,
            cursor: onValuesChange ? 'ns-resize' : undefined,
          }}
          d={arcPath(cx, cy, 44, seg.a0, seg.a1)}
          pathLength={1}
          fill="none"
          stroke={accent}
          strokeOpacity={rampOpacity(i, v.length) * (hover === null || hover === i ? 1 : 0.45)}
          strokeWidth="88"
          onMouseEnter={() => setHover(i)}
          onMouseDown={
            onValuesChange
              ? (e) => {
                  setDragging(true);
                  setHover(i);
                  startValueDrag(e, {
                    axis: 'y',
                    value: values[i],
                    valuePerUnit: total / 160,
                    min: 0,
                    commit: (next) => setOne(i, next),
                    onEnd: () => setDragging(false),
                  });
                }
              : undefined
          }
        />
      ))}
      {showValues && (
        <OutsideLabels
          cx={cx}
          cy={cy}
          r={100}
          segments={segments}
          values={v}
          format={format}
          accent={accent}
          hover={hover}
        />
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={300}
          vbH={244}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
          dotOpacity={rampOpacity(hover, v.length)}
        />
      )}
    </ChartSvg>
  );
}

export function DonutChart({
  values = ARC_SAMPLE,
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  legend,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const segments = arcSegments(v, -90, 360);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 150;
  const cy = 142;
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="donut-chart" width={width} viewBox="0 0 300 244" onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {legend && (
        <PillRow count={v.length} labels={labels} accent={accent} onLabelsChange={onLabelsChange} />
      )}
      {segments.map((seg, i) => (
        <path
          key={i}
          className="el-draw"
          style={{
            ...after(i * 140),
            transform: hover === i ? 'scale(1.05)' : undefined,
            transformOrigin: `${cx}px ${cy}px`,
            transition: HOVER_EASE,
            cursor: onValuesChange ? 'ns-resize' : undefined,
          }}
          d={arcPath(cx, cy, 74, seg.a0, seg.a1)}
          pathLength={1}
          fill="none"
          stroke={accent}
          strokeOpacity={rampOpacity(i, v.length) * (hover === null || hover === i ? 1 : 0.45)}
          strokeWidth="26"
          onMouseEnter={() => setHover(i)}
          onMouseDown={
            onValuesChange
              ? (e) => {
                  setDragging(true);
                  setHover(i);
                  startValueDrag(e, {
                    axis: 'y',
                    value: values[i],
                    valuePerUnit: total / 160,
                    min: 0,
                    commit: (next) => setOne(i, next),
                    onEnd: () => setDragging(false),
                  });
                }
              : undefined
          }
        />
      ))}
      {showValues && (
        <OutsideLabels
          cx={cx}
          cy={cy}
          r={99}
          segments={segments}
          values={v}
          format={format}
          accent={accent}
          hover={hover}
        />
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={300}
          vbH={244}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
          dotOpacity={rampOpacity(hover, v.length)}
        />
      )}
    </ChartSvg>
  );
}

export function HalfDonutChart({
  values = [42, 33, 25],
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  legend,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const segments = arcSegments(v, 180, 180);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 150;
  const cy = 172;
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg
      testId="half-donut-chart"
      width={width}
      viewBox="0 0 300 190"
      onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {legend && (
        <PillRow count={v.length} labels={labels} accent={accent} onLabelsChange={onLabelsChange} />
      )}
      {segments.map((seg, i) => (
        <path
          key={i}
          className="el-draw"
          style={{
            ...after(i * 160),
            transform: hover === i ? 'scale(1.04)' : undefined,
            transformOrigin: `${cx}px ${cy}px`,
            transition: HOVER_EASE,
            cursor: onValuesChange ? 'ns-resize' : undefined,
          }}
          d={arcPath(cx, cy, 82, seg.a0, seg.a1)}
          pathLength={1}
          fill="none"
          stroke={accent}
          strokeOpacity={rampOpacity(i, v.length) * (hover === null || hover === i ? 1 : 0.45)}
          strokeWidth="26"
          onMouseEnter={() => setHover(i)}
          onMouseDown={
            onValuesChange
              ? (e) => {
                  setDragging(true);
                  setHover(i);
                  startValueDrag(e, {
                    axis: 'y',
                    value: values[i],
                    valuePerUnit: total / 160,
                    min: 0,
                    commit: (next) => setOne(i, next),
                    onEnd: () => setDragging(false),
                  });
                }
              : undefined
          }
        />
      ))}
      {showValues && (
        <OutsideLabels
          cx={cx}
          cy={cy}
          r={106}
          segments={segments}
          values={v}
          format={format}
          accent={accent}
          hover={hover}
        />
      )}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={300}
          vbH={190}
          label={labels?.[hover] ?? `Item ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
          dotOpacity={rampOpacity(hover, v.length)}
        />
      )}
    </ChartSvg>
  );
}

/* ── Radar ──────────────────────────────────────────────────────────── */

export function RadarChart({
  values = [85, 55, 90, 50, 70],
  labels,
  accent = ELEMENT_ACCENT,
  width = 200,
  format,
  showValues,
  seriesName,
  legend,
  showAxis = true,
  onSeriesNameChange,
  onValuesChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const showLegend = Boolean(legend && seriesName);
  const SZ = { w: 300, h: 180 };
  const cx = 100;
  const cy = showLegend ? 108 : 100;
  const R = showValues ? 62 : 74;
  const max = Math.max(...values, 1);
  const angle = (i: number) => -90 + (i * 360) / Math.max(1, v.length);
  const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
  const ring = (f: number) =>
    v.map((_, i) => polar(cx, cy, R * f, angle(i)).map((n) => n.toFixed(1)).join(',')).join(' ');
  const dataPoints = v.map((val, i) => polar(cx, cy, R * Math.min(1, val / max), angle(i)));
  const dataPath = `M ${dataPoints.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
  return (
    <ChartSvg
      testId="radar-chart"
      width={width}
      viewBox={showLegend ? '0 0 200 216' : '0 0 200 200'}
    >
      {showLegend && (
        <Legend scale={SZ.w > 500 ? 0.85 : 1} label={seriesName!} color={accent} marker="dash" onRename={onSeriesNameChange} />
      )}
      {RINGS.map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="currentColor" strokeOpacity="0.12" />
      ))}
      {v.map((_, i) => {
        const [x, y] = polar(cx, cy, R, angle(i));
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.1" />;
      })}
      {/* The reference prints the scale up the vertical spine. */}
      {showValues &&
        showAxis &&
        RINGS.map((f) => {
          const [x, y] = polar(cx, cy, R * f, -90);
          return (
            <text
              key={f}
              x={x + 4}
              y={y + 2.5}
              fontSize="6.5"
              fill="currentColor"
              fillOpacity="0.4"
            >
              {formatValue(Math.round(max * f), format?.full ? { full: true } : undefined)}
            </text>
          );
        })}
      {showValues &&
        v.map((_, i) => {
          const [x, y] = polar(cx, cy, R + 13, angle(i));
          const label = labels?.[i] ?? `${i + 1}`;
          return (
            <text
              key={i}
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontSize="8.5"
              fill="currentColor"
              fillOpacity="0.5"
            >
              {(() => {
                const shown = displayLabel(label);
                return shown.length > 8 ? `${shown.slice(0, 7)}…` : shown;
              })()}
            </text>
          );
        })}
      <path className="el-draw" d={dataPath} pathLength={1} fill="none" stroke={accent} strokeWidth="1.8" />
      <path className="el-fade" style={after(500)} d={dataPath} fill={accent} fillOpacity="0.14" />
      {/* White-cored vertex dots (always — the reference draws them). */}
      {dataPoints.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.6} fill="#FFFFFF" stroke={accent} strokeWidth="1.4" pointerEvents="none" />
          {onValuesChange && (
            <circle
              cx={x}
              cy={y}
              r={9}
              fill="transparent"
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => {
                const svg = e.currentTarget.ownerSVGElement;
                if (!svg) return;
                e.preventDefault();
                e.stopPropagation();
                setDragging(true);
                const rect = svg.getBoundingClientRect();
                const scale = rect.width / 200;
                const cxs = rect.left + cx * scale;
                const cys = rect.top + cy * scale;
                const a = rad(angle(i));
                const ux = Math.cos(a);
                const uy = Math.sin(a);
                const maxAtStart = Math.max(...values, 1);
                const move = (ev: MouseEvent) => {
                  const dist = ((ev.clientX - cxs) * ux + (ev.clientY - cys) * uy) / scale;
                  const frac = Math.min(1.5, Math.max(0, dist / R));
                  const raw = frac * maxAtStart;
                  const next = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
                  onValuesChange(values.map((val, j) => (j === i ? next : val)));
                };
                const up = () => {
                  window.removeEventListener('mousemove', move);
                  window.removeEventListener('mouseup', up);
                  setDragging(false);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
              }}
            />
          )}
        </g>
      ))}
    </ChartSvg>
  );
}

/* ── Funnel & waterfall ─────────────────────────────────────────────── */

export function FunnelChart({
  values = [100, 74, 50, 28],
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  seriesName,
  legend,
  showCategoryAxis = true,
  onSeriesNameChange,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const showLegend = Boolean(legend && seriesName);
  const max = Math.max(...values, 1);
  // The funnel keeps its fixed stage (focus scales it moderately).
  const SZ = { w: 300, h: 180 };
  const top = 6 + (showLegend ? 20 : 0);
  const bandH = (174 - top) / v.length - 6;
  const MAX_W = 200;
  const cxx = 170;
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="funnel-chart" width={width} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {showLegend && (
        <Legend scale={SZ.w > 500 ? 0.85 : 1} label={seriesName!} color={accent} marker="dash" onRename={onSeriesNameChange} />
      )}
      {v.map((val, i) => {
        const y = top + i * (bandH + 6);
        // A band is a TRAPEZOID from this value's width down to the next
        // band's width — the reference funnel, not a stack of pills.
        const wTop = Math.max(10, (val / max) * MAX_W);
        const wBottom = Math.max(10, ((v[i + 1] ?? val) / max) * MAX_W);
        const hot = hover === i;
        const path = `M ${cxx - wTop / 2} ${y} L ${cxx + wTop / 2} ${y} L ${cxx + wBottom / 2} ${y + bandH} L ${cxx - wBottom / 2} ${y + bandH} Z`;
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            {showValues &&
              showCategoryAxis &&
              labels?.[i] !== undefined &&
              (onLabelsChange ? (
                <EditableLabel
                  x={cxx - MAX_W / 2 - 10}
                  y={y + bandH / 2 + 3}
                  label={labels[i]}
                  anchor="end"
                  ariaLabel={`Chart label ${i + 1}`}
                  onCommit={(next) =>
                    onLabelsChange(labels.map((l, j) => (j === i ? next : l)))
                  }
                />
              ) : (
                <text
                  x={cxx - MAX_W / 2 - 10}
                  y={y + bandH / 2 + 3}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="currentColor"
                  fillOpacity="0.45"
                >
                  {(() => {
                    const shown = displayLabel(labels[i]);
                    return shown.length > 6 ? `${shown.slice(0, 5)}…` : shown;
                  })()}
                </text>
              ))}
            <path
              className="el-grow-cx"
              style={{
                ...delay(i),
                transform: hot ? 'scale(1.03)' : undefined,
                transition: HOVER_EASE,
                cursor: onValuesChange ? 'ew-resize' : undefined,
              }}
              d={path}
              fill={accent}
              fillOpacity={rampOpacity(i, v.length) * (hot || hover === null ? 1 : 0.55)}
              onMouseDown={
                onValuesChange
                  ? (e) => {
                      setDragging(true);
                      setHover(i);
                      startValueDrag(e, {
                        axis: 'x',
                        value: values[i],
                        valuePerUnit: (2 * max) / MAX_W,
                        min: 0,
                        commit: (next) => setOne(i, next),
                        onEnd: () => setDragging(false),
                      });
                    }
                  : undefined
              }
            />
            {(showValues || hot) && bandH >= 14 && (
              <text
                className={hot ? undefined : 'el-fade'}
                // Difference inverts whatever it sits on, so the value
                // reads on every ramp shade with no theme knowledge.
                style={{
                  ...(hot ? null : after(250 + i * 70)),
                  mixBlendMode: 'difference' as const,
                }}
                x={cxx}
                y={y + bandH / 2 + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight={600}
                fill="#FFFFFF"
                fillOpacity="0.95"
                pointerEvents="none"
              >
                {formatValue(v[i], format)}
              </text>
            )}
          </g>
        );
      })}
      {hover !== null && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={labels?.[hover] ?? `Step ${hover + 1}`}
          value={formatValue(values[hover], format)}
          dotColor={accent}
          dotOpacity={rampOpacity(hover, v.length)}
        />
      )}
    </ChartSvg>
  );
}

export function WaterfallChart({
  values = [40, 25, -15, 30, -10],
  labels,
  accent = ELEMENT_ACCENT,
  width = 300,
  format,
  showValues,
  legend,
  grid = true,
  showAxis = true,
  showCategoryAxis = true,
  showAxisLabel,
  axisLabel,
  axisLabelsMode = 'auto',
  axisMax,
  plotSize,
  onAxisLabelChange,
  onValuesChange,
  onLabelsChange,
}: ChartProps) {
  // `values` are deltas; the chart closes with the running total.
  const [dragging, setDragging] = useState(false);
  const v = useAnimatedNumbers(values, dragging ? 80 : undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const build = (deltas: number[]) => {
    const bars: Array<{ from: number; to: number; final?: boolean }> = [];
    let run = 0;
    for (const d of deltas) {
      bars.push({ from: run, to: run + d });
      run += d;
    }
    bars.push({ from: 0, to: run, final: true });
    return bars;
  };
  const bars = build(v);
  const targetBars = build(values);
  const peak = Math.max(...targetBars.map((b) => Math.max(b.from, b.to)), 1);
  const showPill = Boolean(showValues && showAxisLabel && axisLabel);
  const SZ = plotSize ?? { w: 300, h: 180 };
  const p = plotRect(!!showValues, !!legend, showPill, SZ);
  const capMax = axisMax && axisMax > 0 ? axisMax : peak;
  const { max: niceMax, ticks } = niceScale(capMax);
  const scaleMax = showValues ? niceMax : capMax;
  const step = (p.x1 - p.x0) / bars.length;
  const xAt = (i: number) => p.x0 + i * step + step / 2;
  const barW = Math.min(SZ.w / 10, step * 0.66);
  const axisLabels = labels ? [...labels.slice(0, values.length), 'Total'] : undefined;
  const barColor = (bar: { from: number; to: number; final?: boolean }, i: number) =>
    bar.final || i === 0 ? 'currentColor' : bar.to >= bar.from ? WF_UP : WF_DOWN;
  const yOf = (value: number) => p.y1 - (value / scaleMax) * (p.y1 - p.y0);
  const setOne = (i: number, next: number) =>
    onValuesChange?.(values.map((val, j) => (j === i ? next : val)));
  return (
    <ChartSvg testId="waterfall-chart" width={width} viewBox={`0 0 ${SZ.w} ${SZ.h}`} onLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onCursor={(x, y) => setCursor([x, y])}
    >
      {/* The reference legend: three semantic pills, not a series name. */}
      {legend && (
        <g data-chart-legend="true">
          {[
            { label: 'Start/end', color: 'currentColor' },
            { label: 'Increase', color: WF_UP },
            { label: 'Decrease', color: WF_DOWN },
          ].map((item, i) => {
            const w = 21 + item.label.length * 3.9;
            const x = i === 0 ? 0 : [0, 1, 2].slice(0, i).reduce(
              (acc, j) => acc + 21 + ['Start/end', 'Increase', 'Decrease'][j].length * 3.9 + 4,
              0,
            );
            return (
              <g key={item.label}>
                <rect
                  x={x}
                  y={0}
                  width={w}
                  height={14}
                  rx={5}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.22"
                  strokeWidth="0.75"
                />
                <circle cx={x + 8.5} cy={7} r={2.5} fill={item.color} aria-hidden />
                <text x={x + 14.5} y={9} fontSize="7.5" fill="currentColor" fillOpacity="0.75">
                  {item.label}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {showValues ? (
        <CartesianAxis
          p={p}
          ticks={ticks}
          niceMax={niceMax}
          labels={showCategoryAxis ? axisLabels : undefined}
          xAt={xAt}
          format={format}
          grid={grid}
          showAxis={showAxis}
          labelsMode={axisLabelsMode}
          baseline={false}
          onLabelChange={
            onLabelsChange && labels
              ? (i, next) => {
                  // The closing Total is derived — its name is not a label.
                  if (i < values.length)
                    onLabelsChange(labels.map((l, j) => (j === i ? next : l)));
                }
              : undefined
          }
        />
      ) : (
        <Grid p={p} grid={grid} />
      )}
      {showPill && <AxisNamePill x={(p.x0 + p.x1) / 2} y={SZ.h - 8} label={axisLabel!} onRename={onAxisLabelChange} />}
      {/* Dashed connectors carry each running level to the next bar. */}
      {bars.slice(0, -1).map((bar, i) => (
        <line
          key={i}
          x1={xAt(i) + barW / 2}
          y1={yOf(bar.to)}
          x2={xAt(i + 1) - barW / 2}
          y2={yOf(bar.to)}
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
          aria-hidden
        />
      ))}
      {bars.map((bar, i) => {
        const topValue = Math.max(bar.from, bar.to);
        const topPx = (topValue / scaleMax) * (p.y1 - p.y0);
        const h = Math.max(3, (Math.abs(bar.to - bar.from) / scaleMax) * (p.y1 - p.y0));
        const hot = hover === i;
        const delta = bar.final ? bar.to : bar.to - bar.from;
        const text = bar.final
          ? formatValue(delta, format)
          : `${delta >= 0 ? '+' : ''}${formatValue(delta, format)}`;
        const labelY = Math.max(p.y0 + 4, p.y1 - topPx - 8);
        const editable = onValuesChange && !bar.final;
        return (
          <g key={i}>
            <rect
              x={p.x0 + i * step}
              y={p.y0}
              width={step}
              height={p.y1 - p.y0}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {/* The reference's hover: a quiet ink veil EXACTLY the bar's
                width, running from the plot top down to the baseline. */}
            {hot && (
              <rect
                data-chart-highlight="true"
                x={xAt(i) - barW / 2}
                y={p.y0}
                width={barW}
                height={p.y1 - p.y0}
                fill="currentColor"
                fillOpacity="0.08"
                pointerEvents="none"
              />
            )}
            {/* A bar standing ON the zero line is CUT flat by it — no
                rounded start (owner request 2026-08-22); floating moves
                keep all four corners. */}
            {(() => {
              const grounded = Math.min(bar.from, bar.to) <= 0;
              const shapeProps = {
                className: 'el-grow-y',
                style: {
                  ...delay(i),
                  cursor: editable ? 'ns-resize' : undefined,
                } as React.CSSProperties,
                fill: barColor(bar, i),
                fillOpacity: 1,
                onMouseEnter: () => setHover(i),
                onMouseDown: editable
                  ? (e: React.MouseEvent<SVGGraphicsElement>) => {
                      setDragging(true);
                      setHover(i);
                      startValueDrag(e, {
                        axis: 'y',
                        value: values[i],
                        valuePerUnit: scaleMax / (p.y1 - p.y0),
                        commit: (next) => setOne(i, next),
                        onEnd: () => setDragging(false),
                      });
                    }
                  : undefined,
              };
              return grounded ? (
                <path
                  {...shapeProps}
                  d={topRoundedRect(xAt(i) - barW / 2, p.y1 - topPx, barW, h, 2)}
                />
              ) : (
                <rect
                  {...shapeProps}
                  x={xAt(i) - barW / 2}
                  y={p.y1 - topPx}
                  width={barW}
                  height={h}
                  rx={2}
                />
              );
            })()}
            {(showValues || hot) && (
              <Value
                x={xAt(i)}
                y={labelY}
                text={text}
                hot={hot || bar.final}
                accent={accent}
                entranceMs={hot ? undefined : 200 + i * 70}
              />
            )}
          </g>
        );
      })}
      {/* The baseline sits just BELOW the plot, heavy and solid — the
          bars end flush against it and can never show under it. */}
      {showValues && (
        <line
          x1={showAxis ? p.x0 - AXIS_W : p.x0}
          y1={p.y1 + AXIS_W / 2}
          x2={p.x1}
          y2={p.y1 + AXIS_W / 2}
          stroke="currentColor"
          strokeOpacity={AXIS_OPACITY}
          strokeWidth={AXIS_W}
          pointerEvents="none"
        />
      )}
      {hover !== null && bars[hover] && (
        <ChartTip
          x={cursor?.[0] ?? 0}
          y={cursor?.[1] ?? 0}
          vbW={SZ.w}
          vbH={SZ.h}
          label={bars[hover].final ? 'Total' : (labels?.[hover] ?? `Step ${hover + 1}`)}
          value={
            bars[hover].final
              ? formatValue(targetBars[hover].to, format)
              : `${targetBars[hover].to - targetBars[hover].from >= 0 ? '+' : ''}${formatValue(
                  targetBars[hover].to - targetBars[hover].from,
                  format,
                )}`
          }
          dotColor={
            bars[hover].final || hover === 0
              ? 'currentColor'
              : targetBars[hover].to >= targetBars[hover].from
                ? WF_UP
                : WF_DOWN
          }
        />
      )}
    </ChartSvg>
  );
}
