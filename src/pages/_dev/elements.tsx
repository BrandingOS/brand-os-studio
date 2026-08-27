/**
 * Elements — /_dev/elements
 *
 * The element library, LIVE: every visual the Insert menu offers — the 12
 * animated charts and the widget shapes — one card per element, rendered on
 * the same neutral dark ground the insert previews use. These are the REAL
 * components from `src/shared/editor/elements/` (charts.tsx / widgets.tsx),
 * not copies: edit the file and this page updates through HMR.
 *
 * Every element animates in; **Replay** remounts it so the entrance can be
 * watched again (reduced-motion users simply see the finished element).
 *
 * Same lab conventions as /_dev/guideline-editor: left sidebar lists every
 * element, "All" shows the whole set, a pick is remembered per browser.
 * Adding an element = one entry in GROUPS. Self-gated: DEV or `?dev=1`.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Frame as FrameIcon, Image as MediaIcon, Palette as PaletteIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { CanvasToolbar } from '@/shared/editor/blocks/CanvasToolbar';
import { CardStage } from '@/shared/editor/blocks/CardBlocks';
import cardImage from '@/assets/illus-guidelines.webp';
import { WIDGET_MENU_SECTION } from '@/shared/editor/blocks/insertMenu';
import { FloatingToolbar } from '@/shared/editor/blocks/FloatingToolbar';
import { TableBlock, TableToolbar, defaultTableConfig, type TableBlockApi, type TableConfig } from '@/shared/editor/blocks/TableBlock';
import {
  ChartToolbar,
  defaultChartToolbarConfig,
  type ChartToolbarConfig,
} from '@/shared/editor/blocks/ChartToolbar';
import {
  ChartDataEditor as ChartDataModal,
  type ChartData as GridChartData,
} from '@/shared/editor/blocks/ChartDataEditor';
import { parseNumberToken } from '@/shared/editor/elements';
import {
  BarChart,
  BrowserMockup,
  ColumnChart,
  DonutChart,
  EmbedFrame,
  FunnelChart,
  HalfDonutChart,
  ImageFrame,
  LaptopMockup,
  LineChart,
  LinkCard,
  LogoFrame,
  PhoneMockup,
  PieChart,
  QrCode,
  RadarChart,
  StackedBarChart,
  StackedColumnChart,
  StickyNote,
  TabletMockup,
  VideoFrame,
  WaterfallChart,
  type ChartData,
  type ValueFormat,
} from '@/shared/editor/elements';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';

const VIEW_KEY = 'brandos:elements-lab:view';

interface ElementEntry {
  id: string;
  label: string;
  file: 'charts.tsx' | 'widgets.tsx' | 'blocks/CardBlocks.tsx';
  render: () => ReactNode;
}

const GROUPS: Array<{ group: string; items: ElementEntry[] }> = [
  {
    group: 'Charts',
    items: [
      { id: 'column', label: 'Column chart', file: 'charts.tsx', render: () => <ColumnChart /> },
      { id: 'stacked-column', label: 'Stacked column chart', file: 'charts.tsx', render: () => <StackedColumnChart /> },
      { id: 'bar', label: 'Bar chart', file: 'charts.tsx', render: () => <BarChart /> },
      { id: 'stacked-bar', label: 'Stacked bar chart', file: 'charts.tsx', render: () => <StackedBarChart /> },
      { id: 'line', label: 'Line chart', file: 'charts.tsx', render: () => <LineChart /> },
      { id: 'pie', label: 'Pie chart', file: 'charts.tsx', render: () => <PieChart /> },
      { id: 'donut', label: 'Donut chart', file: 'charts.tsx', render: () => <DonutChart /> },
      { id: 'half-donut', label: 'Half donut chart', file: 'charts.tsx', render: () => <HalfDonutChart /> },
      { id: 'radar', label: 'Radar chart', file: 'charts.tsx', render: () => <RadarChart /> },
      { id: 'funnel', label: 'Funnel chart', file: 'charts.tsx', render: () => <FunnelChart /> },
      { id: 'waterfall', label: 'Waterfall chart', file: 'charts.tsx', render: () => <WaterfallChart /> },
    ],
  },
  {
    group: 'Cards',
    items: [
      // The REAL interactive cards (selection · resize · toolbar), not
      // the wireframe previews (owner request 2026-08-23).
      { id: 'card-vertical', label: 'Vertical card', file: 'blocks/CardBlocks.tsx', render: () => <CardStage imageSrc={cardImage} kinds={['vertical']} height={368} /> },
      { id: 'card-horizontal', label: 'Horizontal card', file: 'blocks/CardBlocks.tsx', render: () => <CardStage imageSrc={cardImage} kinds={['horizontal']} height={108} /> },
      { id: 'card-metric', label: 'Metric card', file: 'blocks/CardBlocks.tsx', render: () => <CardStage imageSrc={cardImage} kinds={['metric']} height={368} /> },
      { id: 'card-image', label: 'Image card', file: 'blocks/CardBlocks.tsx', render: () => <CardStage imageSrc={cardImage} kinds={['image']} height={368} /> },
    ],
  },
  {
    group: 'Media',
    items: [
      { id: 'media-image', label: 'Image', file: 'widgets.tsx', render: () => <ImageFrame /> },
      { id: 'media-video', label: 'Video', file: 'widgets.tsx', render: () => <VideoFrame /> },
      { id: 'media-logo', label: 'Logo', file: 'widgets.tsx', render: () => <LogoFrame /> },
    ],
  },
  {
    group: 'Mockups',
    items: [
      { id: 'mockup-iphone', label: 'iPhone', file: 'widgets.tsx', render: () => <PhoneMockup /> },
      { id: 'mockup-ipad', label: 'iPad', file: 'widgets.tsx', render: () => <TabletMockup /> },
      { id: 'mockup-laptop', label: 'Laptop', file: 'widgets.tsx', render: () => <LaptopMockup /> },
      { id: 'mockup-browser', label: 'Browser', file: 'widgets.tsx', render: () => <BrowserMockup /> },
    ],
  },
  {
    group: 'Notes & links',
    items: [
      { id: 'sticky', label: 'Sticky note', file: 'widgets.tsx', render: () => <StickyNote /> },
      { id: 'link-card', label: 'Link card', file: 'widgets.tsx', render: () => <LinkCard /> },
      { id: 'embed', label: 'Embed (iFrame)', file: 'widgets.tsx', render: () => <EmbedFrame /> },
      { id: 'qr', label: 'QR code', file: 'widgets.tsx', render: () => <QrCode /> },
    ],
  },
];

/* ── Interactive playground ─────────────────────────────────────────── */

const PLAYGROUND_DATA: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Sales', values: [40, 55, 42, 88, 24, 70] },
    { name: 'Profit', values: [16, 24, 18, 36, 10, 28] },
  ],
};

const PLAYGROUND_TYPES = [
  { id: 'column', label: 'Column' },
  { id: 'stacked-column', label: 'Stacked column' },
  { id: 'bar', label: 'Bar' },
  { id: 'stacked-bar', label: 'Stacked bar' },
  { id: 'line', label: 'Line' },
  { id: 'pie', label: 'Pie' },
  { id: 'donut', label: 'Donut' },
  { id: 'half-donut', label: 'Half donut' },
  { id: 'radar', label: 'Radar' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'waterfall', label: 'Waterfall' },
] as const;
type PlaygroundType = (typeof PLAYGROUND_TYPES)[number]['id'];

/** Stacked charts want per-column segment arrays — transpose the series. */
function toColumns(data: ChartData): number[][] {
  return data.labels.map((_, i) => data.series.map((s) => s.values[i] ?? 0));
}

function PlaygroundChart({
  type,
  data,
  format,
  accent,
  showValues,
  legend,
  grid,
  config,
  onValues,
  onLabels,
  onColumns,
  onName,
  onNames,
  onAxisName,
  chartWidth = 420,
  plotSize,
}: {
  type: PlaygroundType;
  data: ChartData;
  format: ValueFormat;
  accent?: string;
  showValues: boolean;
  legend: boolean;
  grid: boolean;
  config: ChartToolbarConfig;
  onValues: (seriesIndex: number, values: number[]) => void;
  onLabels: (labels: string[]) => void;
  onColumns: (columns: number[][]) => void;
  onName: (name: string) => void;
  onNames: (names: string[]) => void;
  onAxisName: (name: string) => void;
  /** Render size — the fullscreen view passes a viewport-sized width. */
  chartWidth?: number;
  /** Focus-mode stage — the plot re-lays-out to the viewport. */
  plotSize?: { w: number; h: number };
}) {
  const first = data.series[0]?.values ?? [];
  const axisEnd = Number(config.vAxisEndAt);
  const common = {
    labels: data.labels,
    format: {
      ...format,
      // Data → Currency: None shows plain numbers, a symbol stamps
      // every value with it.
      ...(config.currency === 'none'
        ? { prefix: undefined }
        : { prefix: config.currency }),
      ...(config.abbreviation === 'none' ? { full: true } : null),
    },
    accent,
    // Style → per-series colors, index-aligned with the series.
    seriesColors: data.series.map((s) => config.seriesColors[s.name]),
    showValues,
    seriesName: data.series[0]?.name,
    legend,
    grid,
    showAxis: config.vAxisVisible,
    showCategoryAxis: config.hAxisVisible,
    showAxisLabel: config.hAxisLabel,
    axisLabel: data.labelName ?? 'Labels',
    axisLabelsMode: config.vAxisLabels,
    axisMax: Number.isFinite(axisEnd) && axisEnd > 0 ? axisEnd : undefined,
    plotSize,
    width: chartWidth,
    onValuesChange: (values: number[]) => onValues(0, values),
    onLabelsChange: onLabels,
    onSeriesNameChange: onName,
    onAxisLabelChange: onAxisName,
  };
  switch (type) {
    case 'column':
      return <ColumnChart {...common} values={first} />;
    case 'stacked-column':
      return <StackedColumnChart {...common} series={toColumns(data)} seriesNames={data.series.map((s) => s.name)} onSeriesNamesChange={onNames} onSeriesChange={onColumns} />;
    case 'bar':
      return <BarChart {...common} values={first} />;
    case 'stacked-bar':
      return <StackedBarChart {...common} series={toColumns(data)} seriesNames={data.series.map((s) => s.name)} onSeriesNamesChange={onNames} onSeriesChange={onColumns} />;
    case 'line':
      return <LineChart {...common} values={first} />;
    case 'pie':
      return <PieChart {...common} values={first} />;
    case 'donut':
      return <DonutChart {...common} values={first} />;
    case 'half-donut':
      return <HalfDonutChart {...common} values={first} />;
    case 'radar':
      return <RadarChart {...common} values={first} width={Math.round(chartWidth * 0.72)} />;
    case 'funnel':
      return <FunnelChart {...common} values={first} />;
    case 'waterfall':
      return <WaterfallChart {...common} values={first} />;
  }
}

/** Each chart renders at its authored width; the block scales it. */
const BASE_W: Record<PlaygroundType, number> = {
  column: 420,
  'stacked-column': 420,
  bar: 420,
  'stacked-bar': 420,
  line: 420,
  pie: 420,
  donut: 420,
  'half-donut': 420,
  radar: 300,
  funnel: 420,
  waterfall: 420,
};

/** The editor's ONE selection colour (EditableSlide's rule — canvas
 *  selection stays readable over any artwork, so it is deliberately not
 *  a DS token). */
const SELECTION_COLOR = '#3B82F6';

/**
 * The chart as a selectable BLOCK — the guideline-slide behaviour, live:
 * click it and the selection frame appears; drag anywhere on it to move
 * it around the canvas; pull a corner to resize, proportions kept.
 * Chart-internal gestures (bar drags, label typing) stopPropagation, so
 * they never move the block. Pressing empty canvas deselects.
 */
function SelectableChartBlock({
  light,
  baseWidth,
  renderToolbar,
  children,
}: {
  light: boolean;
  baseWidth: number;
  /** The floating toolbar for the SELECTED block — anchored to the
   *  block's viewport rect exactly like FloatingToolbar over text. */
  renderToolbar?: (position: {
    top: number;
    left: number;
    width: number;
    height: number;
  }) => ReactNode;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(true);
  const [box, setBox] = useState({ x: 40, y: 30, w: 470 });
  const blockRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerH, setInnerH] = useState(0);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setInnerH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The frame stands 30px OFF the chart on every side (owner request
  // 2026-08-22) — it must never touch the legend pills.
  const PAD = 30;
  const scale = Math.max(0.1, (box.w - PAD * 2) / baseWidth);
  const blockH = innerH * scale + PAD * 2;

  // The toolbar anchors to the block's LIVE viewport rect — remeasured on
  // every move/resize of the block and on scroll, so it travels with it
  // the way the text toolbar travels with its selection.
  useEffect(() => {
    if (!selected) {
      setAnchor(null);
      return;
    }
    const measure = () => {
      const el = blockRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [selected, box, innerH]);

  const startMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(true);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = box;
    const move = (ev: MouseEvent) =>
      setBox({ ...start, x: start.x + (ev.clientX - sx), y: start.y + (ev.clientY - sy) });
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const startResize = (e: React.MouseEvent, cx: 1 | -1, cy: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const start = { ...box, h: blockH };
    const move = (ev: MouseEvent) => {
      const w = Math.min(760, Math.max(200, start.w + (ev.clientX - sx) * cx));
      const h = start.h * (w / start.w);
      setBox({
        w,
        x: cx === -1 ? start.x + (start.w - w) : start.x,
        y: cy === -1 ? start.y + (start.h - h) : start.y,
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // Corner zones are INVISIBLE — the cursor is the affordance, exactly
  // like EditableSlide's scale zones (owner request 2026-08-22: no squares
  // on the selection frame). The hit area stays generous.
  const handle = (cx: 1 | -1, cy: 1 | -1, corner: string) => (
    <div
      key={corner}
      data-resize={corner}
      onMouseDown={(e) => startResize(e, cx, cy)}
      style={{
        position: 'absolute',
        left: cx === -1 ? -7 : undefined,
        right: cx === 1 ? -7 : undefined,
        top: cy === -1 ? -7 : undefined,
        bottom: cy === 1 ? -7 : undefined,
        width: 16,
        height: 16,
        background: 'transparent',
        cursor: cx * cy === 1 ? 'nwse-resize' : 'nesw-resize',
      }}
    />
  );

  return (
    <div
      onMouseDown={() => setSelected(false)}
      style={{
        flex: '1 1 480px',
        minHeight: 480,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        background: light ? '#F7F5F0' : '#141416',
        color: light ? '#1F1B16' : '#E9E9EB',
      }}
    >
      <div
        ref={blockRef}
        data-chart-block="true"
        data-selected={selected || undefined}
        onMouseDown={startMove}
        // Clicking INTO a text widget focuses its contentEditable (the
        // click never bubbles) — focus re-selects the block, so the
        // toolbar comes back even from inside the words.
        onFocusCapture={() => setSelected(true)}
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: innerH ? blockH : undefined,
          padding: PAD,
          border: `1.5px solid ${selected ? SELECTION_COLOR : 'transparent'}`,
          borderRadius: 4,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <div
          ref={innerRef}
          style={{ width: baseWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
        {selected && (
          <>
            {handle(-1, -1, 'nw')}
            {handle(1, -1, 'ne')}
            {handle(1, 1, 'se')}
            {handle(-1, 1, 'sw')}
          </>
        )}
      </div>
      {selected && anchor && renderToolbar?.(anchor)}
    </div>
  );
}

/* ── Canvas sandbox — the CanvasToolbar driving a REAL canvas ───────────
 *
 * The small framed stage the reference shows: the bar sits at the bottom,
 * Insert genuinely inserts — every pick lands on the canvas as a block you
 * can select, drag, resize from a corner and Delete. Text blocks are
 * contentEditable (click into the words and type; move the block by its
 * padding ring). Theme flips the ground's brightness, Background cycles
 * the ground itself — the widgets re-ink via currentColor.
 */

const SANDBOX_GROUNDS: Array<{ id: string; bg: string; dark: boolean }> = [
  { id: 'sky', bg: 'linear-gradient(180deg, #46679C 0%, #7C97C2 55%, #E9E6D8 100%)', dark: false },
  { id: 'dawn', bg: 'linear-gradient(180deg, #23202B 0%, #59455C 55%, #C08A66 100%)', dark: true },
  { id: 'paper', bg: '#F7F5F0', dark: false },
  { id: 'ink', bg: '#141416', dark: true },
];

interface SandboxItem {
  id: number;
  widget: string;
  x: number;
  y: number;
  w: number;
  /** Text blocks: inline styles the floating toolbar wrote. */
  style?: Record<string, string>;
  /** Chart blocks: THEIR OWN data — what bar drags and renames write.
   *  Without it a chart renders inert and a press on a bar falls
   *  through to the block move (owner report 2026-08-23). */
  chart?: ChartData;
}

/** A fresh dataset per inserted chart — never a shared object. */
const sampleChartData = (): ChartData => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Sales', values: [40, 55, 42, 88, 24, 70] },
    { name: 'Profit', values: [16, 24, 18, 36, 10, 28] },
  ],
});

/** {labels, series} ⇄ the data modal's strings-first grid — the same
 *  adapters the Interactive uses, shared so every sandbox chart gets a
 *  REAL Edit data. */
const chartToGrid = (d: ChartData): GridChartData => ({
  columns: [d.labelName ?? 'Labels', ...d.series.map((s) => s.name)],
  rows: d.labels.map((label, i) => [label, ...d.series.map((s) => String(s.values[i] ?? 0))]),
});
const gridToChart = (next: GridChartData): ChartData | null => {
  const [labelCol, ...names] = next.columns;
  const rows = next.rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (names.length === 0 || rows.length === 0) return null;
  return {
    labelName: labelCol?.trim() || 'Labels',
    labels: rows.map((r, i) => r[0]?.trim() || String(i + 1)),
    series: names.map((name, s) => ({
      name: name.trim() || `Series ${s + 1}`,
      values: rows.map((r) => parseNumberToken(r[s + 1] ?? '')?.value ?? 0),
    })),
  };
};

/** Focus mode, the Chronicle way (owner request 2026-08-22): cartesian
 *  charts RE-LAY-OUT to a centered stage, radial ones size to the
 *  screen's short side. */
function chartFocusProps(type: PlaygroundType) {
  const cartesian = ['column', 'stacked-column', 'bar', 'stacked-bar', 'line', 'waterfall'].includes(
    type,
  );
  const focusW = Math.min(Math.round(window.innerWidth * 0.72), 1240);
  const focusH = Math.min(Math.round(window.innerHeight * 0.68), 760);
  return cartesian
    ? { chartWidth: focusW, plotSize: { w: Math.round(focusW / 1.6), h: Math.round(focusH / 1.6) } }
    : { chartWidth: Math.min(560, Math.round(focusH * 0.95)) };
}

/** media:image as a REAL image, so Replace / fit / opacity from the
 *  image toolbar do what they say (owner request 2026-08-23). */
function SandboxImage({ style }: { style?: Record<string, string> }) {
  return (
    <img
      data-sandbox-image="true"
      src={style?.__src ?? cardImage}
      alt=""
      draggable={false}
      style={{
        width: 320,
        display: 'block',
        borderRadius: 12,
        height: style?.objectFit && style.objectFit !== 'fill' ? 220 : undefined,
        objectFit: (style?.objectFit as CSSProperties['objectFit']) ?? undefined,
        opacity: style?.opacity ? Number(style.opacity) : undefined,
      }}
    />
  );
}

function SandboxText({ kind, extra }: { kind: string; extra?: Record<string, string> }) {
  const style: CSSProperties =
    kind === 'display'
      ? { fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }
      : kind === 'heading'
        ? { fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em' }
        : kind === 'subheading'
          ? { fontSize: 19, fontWeight: 500, opacity: 0.85 }
          : kind === 'small'
            ? { fontSize: 11.5, lineHeight: 1.55, opacity: 0.6, maxWidth: 240 }
            : { fontSize: 14, lineHeight: 1.6, opacity: 0.75, maxWidth: 280 };
  const initial =
    kind === 'display'
      ? 'Display'
      : kind === 'heading'
        ? 'Heading'
        : kind === 'subheading'
          ? 'Subheading'
          : kind === 'small'
            ? 'Small paragraph — quiet supporting details.'
            : 'Paragraph text at reading size. Click into me and type.';
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      // Typing is the point: clicks land in the TEXT (caret) and stay
      // here — the block moves by the padding ring around the words.
      onMouseDown={(e) => e.stopPropagation()}
      style={{ ...style, outline: 'none', cursor: 'text', whiteSpace: 'pre-wrap', ...(extra as CSSProperties) }}
    >
      {initial}
    </div>
  );
}


/** Every Insert-menu leaf the sandbox can materialise: authored width +
 *  the element itself (the same components the previews render). */
function sandboxWidget(
  id: string,
  textStyle?: Record<string, string>,
  /** Card stages own their toolbar — the host's Turn into goes through. */
  onTurnInto?: (next: string) => void,
): { w: number; node: ReactNode } | null {
  if (id.startsWith('text:')) return { w: 300, node: <SandboxText kind={id.slice(5)} extra={textStyle} /> };
  if (id.startsWith('chart:')) {
    const kind = id.slice(6);
    const w = kind === 'radar' ? 300 : 420;
    const node = (() => {
      switch (kind) {
        case 'stacked-column': return <StackedColumnChart />;
        case 'bar': return <BarChart />;
        case 'stacked-bar': return <StackedBarChart />;
        case 'line': return <LineChart />;
        case 'pie': return <PieChart />;
        case 'donut': return <DonutChart />;
        case 'half-donut': return <HalfDonutChart />;
        case 'radar': return <RadarChart />;
        case 'funnel': return <FunnelChart />;
        case 'waterfall': return <WaterfallChart />;
        default: return <ColumnChart />;
      }
    })();
    return { w, node };
  }
  switch (id) {
    case 'media:image': return { w: 320, node: <ImageFrame /> };
    case 'media:video': return { w: 320, node: <VideoFrame /> };
    case 'media:logo': return { w: 260, node: <LogoFrame /> };
    // The REAL interactive cards (CardBlocks), not the wireframes — the
    // same swap the element library made (owner request 2026-08-23).
    // key: CardStage builds its cards in a useState initializer, so a
    // kind switch on the SAME mounted block must remount the stage.
    case 'card:vertical': return { w: 300, node: <CardStage key="card:vertical" imageSrc={cardImage} kinds={['vertical']} height={368} onTurnInto={onTurnInto} /> };
    case 'card:horizontal': return { w: 500, node: <CardStage key="card:horizontal" imageSrc={cardImage} kinds={['horizontal']} height={108} onTurnInto={onTurnInto} /> };
    case 'card:metric': return { w: 300, node: <CardStage key="card:metric" imageSrc={cardImage} kinds={['metric']} height={368} onTurnInto={onTurnInto} /> };
    case 'card:image': return { w: 300, node: <CardStage key="card:image" imageSrc={cardImage} kinds={['image']} height={368} onTurnInto={onTurnInto} /> };
    // The EDITABLE table (TableBlock) — hosts attach apiRef at their
    // render sites so the toolbar's Add row/column reach the grid.
    case 'table': return { w: 452, node: <TableBlock key="table" /> };
    case 'sticky': return { w: 230, node: <StickyNote /> };
    case 'embed:link': return { w: 300, node: <LinkCard /> };
    case 'embed:qr': return { w: 190, node: <QrCode /> };
    case 'mockup:iphone': return { w: 240, node: <PhoneMockup /> };
    case 'mockup:ipad': return { w: 300, node: <TabletMockup /> };
    case 'mockup:laptop': return { w: 360, node: <LaptopMockup /> };
    case 'mockup:browser': return { w: 380, node: <BrowserMockup /> };
    default:
      if (id.startsWith('embed:')) return { w: 330, node: <EmbedFrame /> };
      return null;
  }
}

const SBX_PAD = 14;

/** One block on the sandbox canvas — the SelectableChartBlock manners
 *  (drag anywhere to move, invisible corner zones to resize, scale keeps
 *  proportions) with selection owned by the canvas. */
function SandboxBlock({
  item,
  baseW,
  selected,
  onSelect,
  onChange,
  blockRef,
  children,
}: {
  item: SandboxItem;
  baseW: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<SandboxItem>) => void;
  /** The canvas keeps the selected block's DOM node to anchor toolbars. */
  blockRef?: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerH, setInnerH] = useState(0);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setInnerH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.max(0.15, (item.w - SBX_PAD * 2) / baseW);
  const blockH = innerH * scale + SBX_PAD * 2;

  const startMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { x: item.x, y: item.y };
    const move = (ev: MouseEvent) =>
      onChange({ x: start.x + (ev.clientX - sx), y: start.y + (ev.clientY - sy) });
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const startResize = (e: React.MouseEvent, cx: 1 | -1, cy: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const start = { x: item.x, y: item.y, w: item.w, h: blockH };
    const move = (ev: MouseEvent) => {
      const w = Math.min(900, Math.max(120, start.w + (ev.clientX - sx) * cx));
      const h = start.h * (w / start.w);
      onChange({
        w,
        x: cx === -1 ? start.x + (start.w - w) : start.x,
        y: cy === -1 ? start.y + (start.h - h) : start.y,
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handle = (cx: 1 | -1, cy: 1 | -1, corner: string) => (
    <div
      key={corner}
      onMouseDown={(e) => startResize(e, cx, cy)}
      style={{
        position: 'absolute',
        left: cx === -1 ? -7 : undefined,
        right: cx === 1 ? -7 : undefined,
        top: cy === -1 ? -7 : undefined,
        bottom: cy === 1 ? -7 : undefined,
        width: 16,
        height: 16,
        background: 'transparent',
        cursor: cx * cy === 1 ? 'nwse-resize' : 'nesw-resize',
      }}
    />
  );

  return (
    <div
      ref={blockRef}
      data-sandbox-block="true"
      data-selected={selected || undefined}
      onMouseDown={startMove}
      // Clicking INTO a text block focuses its contentEditable (the click
      // never bubbles) — focus is that block's "select me".
      onFocusCapture={onSelect}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.w,
        height: innerH ? blockH : undefined,
        padding: SBX_PAD,
        border: `1.5px solid ${selected ? SELECTION_COLOR : 'transparent'}`,
        borderRadius: 4,
        cursor: 'move',
        userSelect: 'none',
      }}
    >
      <div
        ref={innerRef}
        style={{ width: baseW, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
      {selected && (
        <>
          {handle(-1, -1, 'nw')}
          {handle(1, -1, 'ne')}
          {handle(1, 1, 'se')}
          {handle(-1, 1, 'sw')}
        </>
      )}
    </div>
  );
}

/** A sandbox chart is ALIVE: its own dataset, bar drags, renames — the
 *  same PlaygroundChart wiring the Interactive uses, fed per item. The
 *  shape drag stops propagation itself, so pulling a bar never selects
 *  or moves the block (owner request 2026-08-23). */
function SandboxChart({
  kind,
  data,
  config,
  onData,
  chartWidth,
  plotSize,
}: {
  kind: PlaygroundType;
  data: ChartData;
  config: ChartToolbarConfig;
  onData: (next: ChartData) => void;
  chartWidth?: number;
  plotSize?: { w: number; h: number };
}) {
  const chart = (
    <PlaygroundChart
      type={kind}
      data={data}
      format={{}}
      accent={config.seriesColors[data.series[0]?.name ?? '']}
      showValues={config.dataLabels}
      legend={config.legend}
      grid={config.gridLines}
      config={config}
      {...(chartWidth ? { chartWidth } : null)}
      {...(plotSize ? { plotSize } : null)}
      onValues={(index, values) =>
        onData({
          ...data,
          series: data.series.map((s, j) => (j === index ? { ...s, values } : s)),
        })
      }
      onLabels={(labels) => onData({ ...data, labels })}
      onColumns={(columns) =>
        onData({
          ...data,
          series: data.series.map((s, si) => ({
            ...s,
            values: columns.map((c) => c[si] ?? 0),
          })),
        })
      }
      onName={(name) =>
        onData({
          ...data,
          series: data.series.map((s, i) => (i === 0 ? { ...s, name } : s)),
        })
      }
      onNames={(names) =>
        onData({
          ...data,
          series: data.series.map((s, i) => ({ ...s, name: names[i] ?? s.name })),
        })
      }
      onAxisName={(labelName) => onData({ ...data, labelName })}
    />
  );
  // Style → Chart appearance: auto rides the canvas ground; light/dark
  // give the chart its OWN ground and the monochrome ink re-inks itself
  // through currentColor.
  if (config.appearance === 'auto') return chart;
  const light = config.appearance === 'light';
  return (
    <div
      style={{
        background: light ? '#F7F5F0' : '#141416',
        color: light ? '#1F1B16' : '#E9E9EB',
        borderRadius: 12,
        padding: 10,
      }}
    >
      {chart}
    </div>
  );
}

export interface SandboxSeed {
  widget: string;
  x: number;
  y: number;
}

/** Exported so /_dev/toolbar-editor can mount the SAME mini editor as a
 *  full page — one sandbox, two homes (owner request 2026-08-23). */
export function CanvasSandbox({
  height = 640,
  chrome = true,
  seed,
}: {
  height?: number;
  /** The lab's own heading row — the dedicated page brings its own. */
  chrome?: boolean;
  /** Blocks placed on the canvas at mount, so every toolbar is one
   *  click away without inserting first. */
  seed?: SandboxSeed[];
} = {}) {
  const [items, setItems] = useState<SandboxItem[]>(() =>
    (seed ?? []).flatMap((s, i) => {
      const base = sandboxWidget(s.widget);
      if (!base) return [];
      return [
        {
          id: i + 1,
          widget: s.widget,
          x: s.x,
          y: s.y,
          w: base.w + SBX_PAD * 2,
          ...(s.widget.startsWith('chart:') ? { chart: sampleChartData() } : null),
        },
      ];
    }),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [ground, setGround] = useState(0);
  const seqRef = useRef((seed?.length ?? 0) + 1);
  const g = SANDBOX_GROUNDS[ground];

  // ── The selected block's toolbar — the real editors, anchored to the
  // block's live rect exactly like they anchor over a slide selection.
  const blockEls = useRef(new Map<number, HTMLDivElement>());
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const selectedItem = items.find((i) => i.id === selected) ?? null;
  /** Per-item table APIs — the toolbar's Add row/column reach the grid. */
  const tableApis = useRef(new Map<number, TableBlockApi>());
  const [sbxTableCfg, setSbxTableCfg] = useState<TableConfig>(() => defaultTableConfig());
  useEffect(() => {
    if (selected == null) {
      setAnchor(null);
      return;
    }
    const measure = () => {
      const el = blockEls.current.get(selected);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // items in the deps: moving/resizing updates the rect every frame.
  }, [selected, items]);

  const [chartCfg, setChartCfg] = useState<ChartToolbarConfig>(() => defaultChartToolbarConfig());
  /** The chart item whose Edit data modal / fullscreen view is open. */
  const [dataFor, setDataFor] = useState<number | null>(null);
  const [expandId, setExpandId] = useState<number | null>(null);
  useEffect(() => {
    if (expandId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expandId]);
  const patchChart = (id: number, next: ChartData) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, chart: next } : i)));

  const removeSelected = () => {
    setItems((arr) => arr.filter((i) => i.id !== selected));
    setSelected(null);
  };
  const duplicateSelected = () => {
    if (!selectedItem) return;
    const id = seqRef.current++;
    setItems((arr) => [...arr, { ...selectedItem, id, x: selectedItem.x + 28, y: selectedItem.y + 24 }]);
    setSelected(id);
  };
  /** Turn into / kind switches REPLACE the widget in place. The by-id
   *  variant serves toolbars living INSIDE a widget (a card stage's own
   *  bar), which fire without the sandbox block being selected. */
  const replaceWidgetOf = (itemId: number | null, widget: string) => {
    const base = sandboxWidget(widget);
    if (!base) {
      toast(`No sandbox element for ${widget} yet`);
      return;
    }
    setItems((arr) =>
      arr.map((i) =>
        i.id === itemId
          ? {
              ...i,
              widget,
              w: base.w + SBX_PAD * 2,
              // A chart keeps the data it already had; a first switch to
              // a chart brings its own fresh sample.
              ...(widget.startsWith('chart:') && !i.chart ? { chart: sampleChartData() } : null),
            }
          : i,
      ),
    );
  };
  const replaceWidget = (widget: string) => replaceWidgetOf(selected, widget);
  /** Every toolbar style write lands on the selected ITEM. The image
   *  toolbar's Replace speaks `__replaceImageSrc` — stored as the
   *  block's `__src`, which SandboxImage renders. */
  const setTextStyle = (key: string, value: string) =>
    setItems((arr) =>
      arr.map((i) =>
        i.id === selected
          ? {
              ...i,
              style: { ...i.style, [key === '__replaceImageSrc' ? '__src' : key]: value },
            }
          : i,
      ),
    );

  const insert = (widget: string) => {
    const base = sandboxWidget(widget);
    if (!base) {
      toast(`No sandbox element for ${widget} yet`);
      return;
    }
    const id = seqRef.current++;
    setItems((arr) => [
      ...arr,
      {
        id,
        widget,
        x: 48 + (arr.length % 6) * 36,
        y: 36 + (arr.length % 6) * 28,
        w: base.w + SBX_PAD * 2,
        ...(widget.startsWith('chart:') ? { chart: sampleChartData() } : null),
      },
    ]);
    setSelected(id);
  };

  // Delete removes the selected block — never while typing in one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected == null) return;
      // e.target can be document itself (or a text node) — only Elements
      // have closest().
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('[contenteditable="true"], input, textarea')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setItems((arr) => arr.filter((i) => i.id !== selected));
        setSelected(null);
      }
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  return (
    <div data-canvas-sandbox="true" style={{ marginTop: chrome ? 40 : 0 }}>
      {chrome && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--ds-text)' }}>
            Canvas sandbox — the toolbar working for real
          </h2>
          <span
            style={{ fontFamily: 'var(--ds-font-mono, monospace)', fontSize: 10, color: 'var(--ds-text-muted)' }}
          >
            src/shared/editor/blocks/CanvasToolbar.tsx · insertMenu.tsx · elements/*
          </span>
        </div>
      )}
      <div
        onMouseDown={() => setSelected(null)}
        style={{
          position: 'relative',
          height,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--ds-border)',
          background: g.bg,
          color: g.dark ? '#E9E9EB' : '#1F1B16',
        }}
      >
        {items.map((item) => {
          const base = sandboxWidget(item.widget, item.style, (next) => replaceWidgetOf(item.id, next));
          if (!base) return null;
          // The interactive cards are ALREADY a full block — their own
          // selection, toolbar, move and resize live inside CardStage.
          // No SandboxBlock frame around them (owner request 2026-08-23:
          // no borders around the cards, no second toolbar).
          if (item.widget.startsWith('card:')) {
            return (
              <div
                key={item.id}
                style={{ position: 'absolute', left: item.x, top: item.y }}
                // Capture phase: the card stops propagation in bubble, so
                // this is how touching a card still clears the sandbox's
                // own block selection (no two toolbars at once).
                onMouseDownCapture={() => setSelected(null)}
              >
                {base.node}
              </div>
            );
          }
          return (
            <SandboxBlock
              key={item.id}
              item={item}
              baseW={base.w}
              selected={selected === item.id}
              onSelect={() => setSelected(item.id)}
              onChange={(patch) =>
                setItems((arr) => arr.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
              }
              blockRef={(el) => {
                if (el) blockEls.current.set(item.id, el);
                else blockEls.current.delete(item.id);
              }}
            >
              {item.widget.startsWith('chart:') ? (
                <SandboxChart
                  kind={item.widget.slice(6) as PlaygroundType}
                  data={item.chart ?? sampleChartData()}
                  config={chartCfg}
                  onData={(next) =>
                    setItems((arr) =>
                      arr.map((i) => (i.id === item.id ? { ...i, chart: next } : i)),
                    )
                  }
                />
              ) : item.widget === 'table' ? (
                <TableBlock
                  key={`table-${item.id}`}
                  config={sbxTableCfg}
                  apiRef={(a) => {
                    if (a) tableApis.current.set(item.id, a);
                    else tableApis.current.delete(item.id);
                  }}
                />
              ) : item.widget === 'media:image' ? (
                <SandboxImage style={item.style} />
              ) : (
                // Opacity from the image toolbar's ⋯ menu applies to any
                // media/mockup/note block.
                <div style={{ opacity: item.style?.opacity ? Number(item.style.opacity) : undefined }}>
                  {base.node}
                </div>
              )}
            </SandboxBlock>
          );
        })}

        {/* The SELECTED block's own toolbar — chart, card, text or media,
            each the REAL editor surface anchored above the block. */}
        {selectedItem && anchor && (() => {
          const wid = selectedItem.widget;
          if (wid === 'table') {
            return (
              <TableToolbar
                position={anchor}
                config={sbxTableCfg}
                onChange={(patch) => setSbxTableCfg((c) => ({ ...c, ...patch }))}
                onTurnInto={replaceWidget}
                onAddRow={() => tableApis.current.get(selectedItem.id)?.addRow()}
                onAddColumn={() => tableApis.current.get(selectedItem.id)?.addColumn()}
                onDuplicate={duplicateSelected}
                onDelete={removeSelected}
              />
            );
          }
          if (wid.startsWith('chart:')) {
            const chartData = selectedItem.chart ?? sampleChartData();
            return (
              <ChartToolbar
                label="Chart"
                position={anchor}
                config={{ ...chartCfg, kind: wid.slice(6) as ChartToolbarConfig['kind'] }}
                series={chartData.series.map((s) => s.name)}
                axes={{
                  horizontal: chartData.labelName ?? 'Labels',
                  vertical: chartData.series[0]?.name,
                }}
                onAxesChange={(patch) => {
                  if (patch.horizontal !== undefined)
                    patchChart(selectedItem.id, { ...chartData, labelName: patch.horizontal });
                  if (patch.vertical !== undefined)
                    patchChart(selectedItem.id, {
                      ...chartData,
                      series: chartData.series.map((s, i) =>
                        i === 0 ? { ...s, name: patch.vertical! } : s,
                      ),
                    });
                }}
                onChange={(patch) => {
                  setChartCfg((c) => ({ ...c, ...patch }));
                  if (patch.kind) replaceWidget(`chart:${patch.kind}`);
                }}
                onTurnInto={replaceWidget}
                onEditData={() => setDataFor(selectedItem.id)}
                onExpand={() => setExpandId(selectedItem.id)}
                onDuplicate={duplicateSelected}
                onDelete={removeSelected}
              />
            );
          }
          if (wid.startsWith('text:')) {
            return (
              <FloatingToolbar
                blockType={wid === 'text:display' || wid === 'text:heading' ? 'heading' : 'text'}
                style={selectedItem.style ?? {}}
                position={anchor}
                onChangeType={(t) =>
                  replaceWidget(t === 'heading' ? 'text:heading' : 'text:paragraph')
                }
                onTurnIntoWidget={replaceWidget}
                variant={selectedItem.widget}
                onChangeStyle={setTextStyle}
                onDelete={removeSelected}
                onDuplicate={duplicateSelected}
              />
            );
          }
          return (
            <FloatingToolbar
              blockType="image"
              style={selectedItem.style ?? {}}
              position={anchor}
              onChangeType={() => toast('Turn into — pick from Insert instead')}
              onTurnIntoWidget={replaceWidget}
              variant={selectedItem.widget}
              // Replace / fit / opacity write the ITEM's style for real —
              // SandboxImage and the block wrapper render them.
              onChangeStyle={setTextStyle}
              onDelete={removeSelected}
              onDuplicate={duplicateSelected}
            />
          );
        })()}
        <CanvasToolbar
          sections={[WIDGET_MENU_SECTION]}
          onPick={insert}
          actions={[
            { id: 'media', label: 'Media', icon: MediaIcon, onClick: () => insert('media:image') },
            {
              id: 'theme',
              label: 'Theme',
              icon: PaletteIcon,
              onClick: () =>
                setGround((i) => {
                  const current = SANDBOX_GROUNDS[i];
                  const next = SANDBOX_GROUNDS.findIndex((x) => x.dark !== current.dark);
                  return next === -1 ? i : next;
                }),
            },
            {
              id: 'background',
              label: 'Background',
              icon: FrameIcon,
              onClick: () => setGround((i) => (i + 1) % SANDBOX_GROUNDS.length),
            },
          ]}
        />
      </div>

      {/* Edit data — the REAL spreadsheet modal, per chart item. */}
      {(() => {
        const item = items.find((i) => i.id === dataFor);
        return (
          <ChartDataModal
            open={item != null}
            data={chartToGrid(item?.chart ?? sampleChartData())}
            onSave={(next) => {
              const parsed = gridToChart(next);
              if (item && parsed) patchChart(item.id, parsed);
              setDataFor(null);
            }}
            onCancel={() => setDataFor(null)}
          />
        );
      })()}

      {/* Expand ⤢ — the chart fullscreen on the working ground, the
          Chronicle focus re-layout. Escape closes. */}
      {(() => {
        const item = items.find((i) => i.id === expandId);
        if (!item || !item.widget.startsWith('chart:')) return null;
        const kind = item.widget.slice(6) as PlaygroundType;
        return (
          <div
            data-chart-fullscreen="true"
            className="animate-in fade-in zoom-in-95 duration-200"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: g.bg,
              color: g.dark ? '#E9E9EB' : '#1F1B16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              aria-label="Close fullscreen"
              onClick={() => setExpandId(null)}
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                padding: 8,
                background: 'none',
                border: 'none',
                color: 'inherit',
                opacity: 0.6,
                cursor: 'pointer',
              }}
            >
              <X size={22} strokeWidth={1.8} aria-hidden />
            </button>
            <SandboxChart
              kind={kind}
              data={item.chart ?? sampleChartData()}
              config={chartCfg}
              onData={(next) => patchChart(item.id, next)}
              {...chartFocusProps(kind)}
            />
          </div>
        );
      })()}
    </div>
  );
}

function InteractivePlayground() {
  const [type, setType] = useState<PlaygroundType>('column');
  const [data, setData] = useState<ChartData>(PLAYGROUND_DATA);
  const [format, setFormat] = useState<ValueFormat>({});
  const setSeriesValues = (index: number, values: number[]) =>
    setData((d) => ({
      ...d,
      series: d.series.map((s, j) => (j === index ? { ...s, values } : s)),
    }));
  const setLabels = (labels: string[]) => setData((d) => ({ ...d, labels }));
  const setSeriesName = (name: string) =>
    setData((d) => ({
      ...d,
      series: d.series.map((s, i) => (i === 0 ? { ...s, name } : s)),
    }));
  const setLabelName = (labelName: string) => setData((d) => ({ ...d, labelName }));
  const setSeriesNames = (names: string[]) =>
    setData((d) => ({
      ...d,
      series: d.series.map((s, i) => ({ ...s, name: names[i] ?? s.name })),
    }));
  /** Stacked charts hand back per-column segments — fold them into series. */
  const setFromColumns = (columns: number[][]) =>
    setData((d) => ({
      ...d,
      series: d.series.map((s, si) => ({
        ...s,
        values: d.labels.map((_, i) => columns[i]?.[si] ?? 0),
      })),
    }));

  // ── The chart toolbar — the same surface the guideline editor mounts.
  // The kind picker drives the playground type; Style colors drive the
  // accent; Settings' data labels drive showValues; Appearance flips the
  // showcase ground (monochrome charts re-ink themselves via currentColor).
  const [config, setConfig] = useState<ChartToolbarConfig>(() => defaultChartToolbarConfig());
  const patchConfig = (patch: Partial<ChartToolbarConfig>) => {
    setConfig((c) => ({
      ...c,
      ...patch,
      seriesColors: patch.seriesColors
        ? { ...c.seriesColors, ...patch.seriesColors }
        : c.seriesColors,
    }));
    if (patch.kind) setType(patch.kind as PlaygroundType);
  };
  // ── The block is POLYMORPHIC — Turn into genuinely transforms it ────
  // 'chart' is the live playground chart; any other value is an Insert
  // widget id (text:heading, card:metric, media:image…) rendered through
  // the same map the canvas sandbox uses. Turning back into a chart
  // restores the full live-data experience untouched.
  const [blockWidget, setBlockWidget] = useState<string>('chart');
  const [blockTextStyle, setBlockTextStyle] = useState<Record<string, string>>({});
  /** The table block's grid API — the toolbar's Add row/column go here. */
  const tableApiRef = useRef<TableBlockApi | null>(null);
  const [tableCfg, setTableCfg] = useState<TableConfig>(() => defaultTableConfig());
  const turnInto = (id: string) => {
    if (id === 'chart' || id.startsWith('chart:')) {
      if (id.startsWith('chart:')) {
        const kind = id.slice(6) as PlaygroundType;
        setType(kind);
        setConfig((c) => ({ ...c, kind }));
      }
      setBlockWidget('chart');
      return;
    }
    if (!sandboxWidget(id)) {
      toast(`No element for ${id} yet`);
      return;
    }
    setBlockWidget(id);
  };
  /** FloatingToolbar's Turn into speaks BlockTypes — map to widget ids. */
  const BLOCK_TO_WIDGET: Record<string, string> = {
    text: 'text:paragraph',
    heading: 'text:heading',
    image: 'media:image',
    card: 'card:vertical',
    chart: 'chart',
    table: 'table',
    mockup: 'mockup:iphone',
    embed: 'embed:link',
    sticky: 'sticky',
  };
  const pickType = (next: PlaygroundType) => {
    setType(next);
    setConfig((c) => ({ ...c, kind: next }));
    setBlockWidget('chart');
  };
  const lightGround = config.appearance === 'light';
  const accent = config.seriesColors[data.series[0]?.name ?? ''];

  // ── Edit data — the SAME spreadsheet modal the guideline lab opens ──
  // (blocks/ChartDataEditor). Its grid is strings-first {columns, rows};
  // these two adapters carry our {labels, series} across the seam.
  const [dataOpen, setDataOpen] = useState(false);
  const grid: GridChartData = {
    columns: [data.labelName ?? 'Labels', ...data.series.map((s) => s.name)],
    rows: data.labels.map((label, i) => [
      label,
      ...data.series.map((s) => String(s.values[i] ?? 0)),
    ]),
  };
  const applyGrid = (next: GridChartData) => {
    const [labelCol, ...names] = next.columns;
    const rows = next.rows.filter((r) => r.some((c) => c.trim() !== ''));
    if (names.length > 0 && rows.length > 0) {
      setData({
        labelName: labelCol?.trim() || 'Labels',
        labels: rows.map((r, i) => r[0]?.trim() || String(i + 1)),
        series: names.map((name, s) => ({
          name: name.trim() || `Series ${s + 1}`,
          values: rows.map((r) => parseNumberToken(r[s + 1] ?? '')?.value ?? 0),
        })),
      });
    }
    setDataOpen(false);
  };

  // ── Fullscreen (the toolbar's Expand ⤢, Chronicle-style) ────────────
  // The overlay wears the ground the user is WORKING ON — here the
  // showcase ground; on a real slide it will be the brand's surface —
  // and the monochrome charts re-ink themselves on it via currentColor.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);
  const shuffle = () =>
    setData((d) => ({
      ...d,
      series: d.series.map((s) => ({
        ...s,
        values: s.values.map(() => Math.round(10 + Math.random() * 90)),
      })),
    }));
  return (
    <div data-playground="true" style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--ds-text)' }}>
          Interactive playground
        </h2>
        <span
          style={{ fontFamily: 'var(--ds-font-mono, monospace)', fontSize: 10, color: 'var(--ds-text-muted)' }}
        >
          src/shared/editor/elements/chartData.ts · useAnimatedNumbers.ts · ChartDataEditor.tsx
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {PLAYGROUND_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pickType(t.id)}
            style={{
              padding: '3px 10px',
              fontSize: 11.5,
              borderRadius: 'var(--ds-radius-control, 8px)',
              border: '1px solid var(--ds-border)',
              background: type === t.id ? 'var(--ds-surface-hover)' : 'var(--ds-surface)',
              color: 'var(--ds-text)',
              fontWeight: type === t.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={shuffle}
          style={{
            marginLeft: 'auto',
            padding: '3px 12px',
            fontSize: 11.5,
            borderRadius: 'var(--ds-radius-control, 8px)',
            border: '1px solid var(--ds-border)',
            background: 'var(--ds-surface)',
            color: 'var(--ds-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Shuffle
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {blockWidget.startsWith('card:') ? (
          // The interactive cards are ALREADY a full block — selection,
          // toolbar, move and resize live inside CardStage. No selectable
          // frame around them, no second toolbar (owner request
          // 2026-08-23: remove the borders around the cards). The stage's
          // own Turn into routes back here, so card-land has an exit.
          sandboxWidget(blockWidget, undefined, turnInto)?.node
        ) : (
        <SelectableChartBlock
          light={lightGround}
          baseWidth={blockWidget === 'chart' ? BASE_W[type] : sandboxWidget(blockWidget)?.w ?? 300}
          // The toolbar FOLLOWS the widget: the chart gets the chart bar,
          // a card the card bar, text the text bar — and Turn into moves
          // between them for real, in both directions.
          renderToolbar={(position) =>
            blockWidget === 'chart' ? (
              <ChartToolbar
                label="Chart"
                position={position}
                config={config}
                series={data.series.map((s) => s.name)}
                axes={{ horizontal: data.labelName ?? 'Labels', vertical: data.series[0]?.name }}
                onAxesChange={(patch) => {
                  if (patch.horizontal !== undefined) setLabelName(patch.horizontal);
                  if (patch.vertical !== undefined) setSeriesName(patch.vertical);
                }}
                onChange={patchConfig}
                onTurnInto={turnInto}
                onEditData={() => setDataOpen(true)}
                onExpand={() => setExpanded(true)}
                onDuplicate={() => toast('Duplicate pressed')}
                onDelete={() => toast('Delete pressed')}
              />
            ) : blockWidget === 'table' ? (
              <TableToolbar
                position={position}
                config={tableCfg}
                onChange={(patch) => setTableCfg((c) => ({ ...c, ...patch }))}
                onTurnInto={turnInto}
                onAddRow={() => tableApiRef.current?.addRow()}
                onAddColumn={() => tableApiRef.current?.addColumn()}
                onDuplicate={() => toast('Duplicate pressed')}
                onDelete={() => toast('Delete pressed')}
              />
            ) : blockWidget.startsWith('text:') ? (
              <FloatingToolbar
                blockType={
                  blockWidget === 'text:display' || blockWidget === 'text:heading'
                    ? 'heading'
                    : 'text'
                }
                style={blockTextStyle}
                position={position}
                onChangeType={(t) => turnInto(BLOCK_TO_WIDGET[t] ?? 'text:paragraph')}
                onTurnIntoWidget={turnInto}
                variant={blockWidget}
                onChangeStyle={(key, value) =>
                  setBlockTextStyle((s) => ({ ...s, [key]: value }))
                }
                onDelete={() => toast('Delete pressed')}
                onDuplicate={() => toast('Duplicate pressed')}
              />
            ) : (
              <FloatingToolbar
                blockType="image"
                style={{}}
                position={position}
                onChangeType={(t) => turnInto(BLOCK_TO_WIDGET[t] ?? 'chart')}
                onTurnIntoWidget={turnInto}
                variant={blockWidget}
                onChangeStyle={(key, value) => toast(`${key} → ${value}`)}
                onDelete={() => toast('Delete pressed')}
                onDuplicate={() => toast('Duplicate pressed')}
              />
            )
          }
        >
          {blockWidget === 'chart' ? (
            <PlaygroundChart
              type={type}
              data={data}
              format={format}
              accent={accent}
              showValues={config.dataLabels}
              legend={config.legend}
              grid={config.gridLines}
              config={config}
              onValues={setSeriesValues}
              onLabels={setLabels}
              onColumns={setFromColumns}
              onName={setSeriesName}
              onNames={setSeriesNames}
              onAxisName={setLabelName}
            />
          ) : blockWidget === 'table' ? (
            <TableBlock key="table" config={tableCfg} apiRef={(a) => (tableApiRef.current = a)} />
          ) : (
            sandboxWidget(blockWidget, blockTextStyle)?.node
          )}
        </SelectableChartBlock>
        )}
        {/* The side data panel was removed (owner request 2026-08-23) —
            data editing lives in the toolbar's Edit data modal. */}
      </div>

      <ChartDataModal
        open={dataOpen}
        data={grid}
        onSave={applyGrid}
        onCancel={() => setDataOpen(false)}
      />

      {expanded && (
        <div
          data-chart-fullscreen="true"
          className="animate-in fade-in zoom-in-95 duration-200"
          style={{
            position: 'fixed',
            inset: 0,
            // Above ALL app chrome — the top nav was peeking over it.
            zIndex: 200,
            background: lightGround ? '#F7F5F0' : '#141416',
            color: lightGround ? '#1F1B16' : '#E9E9EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Close fullscreen"
            onClick={() => setExpanded(false)}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              padding: 8,
              background: 'none',
              border: 'none',
              color: 'inherit',
              opacity: 0.6,
              cursor: 'pointer',
            }}
          >
            <X size={22} strokeWidth={1.8} aria-hidden />
          </button>
          <PlaygroundChart
            type={type}
            data={data}
            format={format}
            accent={accent}
            showValues={config.dataLabels}
            legend={config.legend}
            grid={config.gridLines}
            config={config}
            onValues={setSeriesValues}
            onLabels={setLabels}
            onColumns={setFromColumns}
            onName={setSeriesName}
            onNames={setSeriesNames}
            onAxisName={setLabelName}
            // Focus mode, the Chronicle way: NOT a zoom — the cartesian
            // stage re-lays-out (÷1.6 keeps type at reading size) but
            // deliberately SMALLER than the screen: the chart and its
            // chrome sit as one centered group with generous margins all
            // around, easy on the eye (owner request 2026-08-22).
            {...(() => {
              const cartesian = [
                'column',
                'stacked-column',
                'bar',
                'stacked-bar',
                'line',
                'waterfall',
              ].includes(type);
              const focusW = Math.min(Math.round(window.innerWidth * 0.72), 1240);
              const focusH = Math.min(Math.round(window.innerHeight * 0.68), 760);
              return cartesian
                ? {
                    chartWidth: focusW,
                    plotSize: { w: Math.round(focusW / 1.6), h: Math.round(focusH / 1.6) },
                  }
                : { chartWidth: Math.min(560, Math.round(focusH * 0.95)) };
            })()}
          />
        </div>
      )}
    </div>
  );
}

export default function DevElementsPage() {
  const allowed =
    import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');
  if (!allowed) {
    return (
      <div style={{ padding: 48, fontFamily: 'system-ui' }}>
        <h1>Elements</h1>
        <p>
          This page is only available in development. Append <code>?dev=1</code> to
          force-enable.
        </p>
      </div>
    );
  }
  return <Lab />;
}

function Lab() {
  const [view, setViewState] = useState<string>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || 'all';
    } catch {
      return 'all';
    }
  });
  const setView = (next: string) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* per-browser convenience only */
    }
    window.scrollTo({ top: 0 });
  };
  // Bumping an element's key remounts it — the entrance animation replays.
  const [replays, setReplays] = useState<Record<string, number>>({});
  const replay = (id: string) => setReplays((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));

  return (
    <WorkspaceShell>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 140px' }}>
        <header className="gl-doc-head">
          <div>
            <span className="gl-doc-eyebrow">Dev · Lab</span>
            <h1 className="gl-doc-title">Elements</h1>
          </div>
          <div className="gl-doc-meta">
            <span>the insert menu&apos;s element library · every entrance animated · Replay remounts</span>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '184px minmax(0, 1fr)',
            gap: 32,
            alignItems: 'start',
            marginTop: 20,
          }}
        >
          <Sidebar view={view} onPick={setView} />

          <main style={{ minWidth: 0 }}>
            {(view === 'all' || view === 'canvas') && <CanvasSandbox />}
            {(view === 'all' || view === 'playground') && <InteractivePlayground />}
            {GROUPS.map(({ group, items }) => {
              const visible = items.filter((i) => view === 'all' || view === i.id);
              if (visible.length === 0) return null;
              return (
                <div key={group} style={{ marginTop: view === 'all' ? 40 : 0 }}>
                  {view === 'all' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--ds-text-muted)',
                        }}
                      >
                        {group}
                      </span>
                      <span style={{ flex: 1, height: 1, background: 'var(--ds-border)' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
                    {visible.map((item) => (
                      <ElementCard
                        key={item.id}
                        item={item}
                        replayKey={replays[item.id] ?? 0}
                        inAll={view === 'all'}
                        onOpen={() => setView(item.id)}
                        onReplay={() => replay(item.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </WorkspaceShell>
  );
}

/* ── Lab chrome — the page's own scaffolding, deliberately local ──── */

function Sidebar({ view, onPick }: { view: string; onPick: (id: string) => void }) {
  const item = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      className={`panel-item${view === id ? ' is-active' : ''}`}
      onClick={() => onPick(id)}
      style={{ cursor: 'pointer', fontSize: 12.5 }}
    >
      {label}
    </button>
  );
  return (
    <nav aria-label="Lab elements" className="panel">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Lab</span>
          <span className="panel-heading-title">Elements</span>
        </div>
      </div>
      <div className="panel-list">
        {item('all', 'All')}
        <div>
          <div className="panel-group-label">Playground</div>
          {item('canvas', 'Canvas')}
          {item('playground', 'Interactive')}
        </div>
        {GROUPS.map((g) => (
          <div key={g.group}>
            <div className="panel-group-label">{g.group}</div>
            {g.items.map((i) => item(i.id, i.label))}
          </div>
        ))}
      </div>
    </nav>
  );
}

function ElementCard({
  item,
  replayKey,
  inAll,
  onOpen,
  onReplay,
}: {
  item: ElementEntry;
  replayKey: number;
  inAll: boolean;
  onOpen: () => void;
  onReplay: () => void;
}) {
  return (
    <section id={item.id} style={{ minWidth: 0, maxWidth: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {inAll ? (
          <button
            type="button"
            onClick={onOpen}
            title="Open this element alone"
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--ds-text)',
              fontFamily: 'inherit',
            }}
          >
            {item.label} <span style={{ color: 'var(--ds-text-muted)', fontWeight: 400 }}>↗</span>
          </button>
        ) : (
          <h2
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--ds-text)',
            }}
          >
            {item.label}
          </h2>
        )}
        <button
          type="button"
          onClick={onReplay}
          style={{
            padding: '2px 10px',
            fontSize: 11.5,
            borderRadius: 'var(--ds-radius-control, 8px)',
            border: '1px solid var(--ds-border)',
            background: 'var(--ds-surface)',
            color: 'var(--ds-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Replay
        </button>
      </div>
      <div
        style={{
          fontFamily: 'var(--ds-font-mono, monospace)',
          fontSize: 10,
          color: 'var(--ds-text-muted)',
          marginBottom: 8,
        }}
      >
        src/shared/editor/elements/{item.file}
      </div>
      {/* The showcase ground: the same neutral dark card the insert menu's
          hover preview uses — elements read via currentColor. */}
      <div
        key={replayKey}
        style={{
          minWidth: 340,
          minHeight: 230,
          borderRadius: 14,
          background: '#141416',
          color: '#E9E9EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {item.render()}
      </div>
    </section>
  );
}
