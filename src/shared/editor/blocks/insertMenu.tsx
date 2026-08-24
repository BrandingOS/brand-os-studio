/**
 * The editor's widget vocabulary for CanvasToolbar — one tree drives the
 * menu, the flyouts, the keycaps and the hover previews (never two sources
 * of truth). Item ids are `family:variant` over the BlockTypes families, so
 * a host maps a pick straight onto its insert action.
 *
 * The preview ARTWORK lives in `shared/editor/elements/` — real components
 * (12 animated charts + the widget shapes, browsable at /_dev/elements) —
 * so the hover preview and the inserted widget are the same thing. Only the
 * typography samples are menu-local: they are menu artwork, not widgets.
 */
import {
  BarChart3,
  CreditCard,
  Image as ImageIcon,
  Link2,
  Smartphone,
  StickyNote as StickyNoteIcon,
  Table2,
  Type,
} from 'lucide-react';
import type { InsertMenuItem, InsertMenuSection } from './CanvasToolbar';
// Import cycle alert: CardBlocks → CardToolbar → THIS file. Safe because
// the toolbars read WIDGET_MENU_SECTION at render time, never at module
// eval — keep it that way on both sides.
import { CardStage } from './CardBlocks';
import cardPreviewImage from '@/assets/illus-guidelines.webp';
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
} from '../elements';

const INK = '#E9E9EB';
const MUTED = '#8E8E95';

function TextSample({ kind }: { kind: 'display' | 'heading' | 'subheading' | 'paragraph' | 'small' }) {
  if (kind === 'display')
    return <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', color: INK }}>Display</div>;
  if (kind === 'heading')
    return <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: INK }}>Heading</div>;
  if (kind === 'subheading')
    return <div style={{ fontSize: 18, fontWeight: 500, color: 'rgba(233,233,235,0.8)' }}>Subheading</div>;
  if (kind === 'paragraph')
    return (
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(233,233,235,0.7)', maxWidth: 250 }}>
        Paragraph text sits at reading size, with a comfortable measure and relaxed leading for
        body copy on slides.
      </div>
    );
  return (
    <div style={{ fontSize: 11, lineHeight: 1.55, color: MUTED, maxWidth: 220 }}>
      Small paragraph — captions, footnotes and quiet supporting details.
    </div>
  );
}

const leaf = (
  id: string,
  label: string,
  preview: () => React.ReactNode,
  extra?: Partial<InsertMenuItem>,
): InsertMenuItem => ({ id, label, preview, ...extra });

/** A REAL CardBlocks card framed for the hover preview — the preview and
 *  the inserted card are the same component. The preview layer is
 *  pointer-events-none, so the card's own interactivity stays dormant.
 *
 *  `key={kind}`: CardStage builds its cards in a useState INITIALIZER, so
 *  React reusing one instance across hovers would freeze the first kind
 *  on screen — the key forces a fresh stage per kind. The frame is sized
 *  to the stage (card + its 12px margins) and the wide card scales to the
 *  preview panel's inner width. */
function CardPreview({ kind }: { kind: 'vertical' | 'horizontal' | 'metric' | 'image' }) {
  const wide = kind === 'horizontal';
  const stageW = wide ? 472 : 238; // card w (448 / 214) + 12px margins
  const stageH = wide ? 84 : 344; // card h (60 / 320) + 12px margins
  const scale = Math.min(1, 340 / stageW);
  return (
    <div style={{ width: stageW * scale, height: stageH * scale, overflow: 'hidden' }}>
      <div style={{ width: stageW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CardStage key={kind} imageSrc={cardPreviewImage} kinds={[kind]} height={stageH} />
      </div>
    </div>
  );
}

export const WIDGET_MENU_SECTION: InsertMenuSection = {
  id: 'widgets',
  label: 'Insert widget',
  items: [
    {
      id: 'text',
      label: 'Text',
      icon: Type,
      children: [
        leaf('text:display', 'Display', () => <TextSample kind="display" />, { kbd: 'D' }),
        leaf('text:heading', 'Heading', () => <TextSample kind="heading" />, { kbd: 'H' }),
        leaf('text:subheading', 'Subheading', () => <TextSample kind="subheading" />, { kbd: '⇧H' }),
        leaf('text:paragraph', 'Paragraph', () => <TextSample kind="paragraph" />, { kbd: 'T' }),
        leaf('text:small', 'Small paragraph', () => <TextSample kind="small" />, { kbd: '⇧T' }),
      ],
    },
    {
      id: 'media',
      label: 'Media',
      icon: ImageIcon,
      children: [
        leaf('media:image', 'Image', () => <ImageFrame />, { kbd: 'I' }),
        leaf('media:video', 'Video', () => <VideoFrame />, { kbd: 'V' }),
        leaf('media:logo', 'Logo', () => <LogoFrame />, { kbd: 'L' }),
      ],
    },
    {
      id: 'card',
      label: 'Card',
      icon: CreditCard,
      children: [
        // The REAL interactive cards (CardBlocks), scaled into the preview
        // card — not the retired wireframes (owner request 2026-08-23).
        leaf('card:vertical', 'Vertical card', () => <CardPreview kind="vertical" />, { kbd: 'C' }),
        leaf('card:horizontal', 'Horizontal card', () => <CardPreview kind="horizontal" />),
        leaf('card:metric', 'Metric card', () => <CardPreview kind="metric" />),
        leaf('card:image', 'Image card', () => <CardPreview kind="image" />),
      ],
    },
    {
      id: 'chart',
      label: 'Chart',
      icon: BarChart3,
      badge: 'Beta',
      children: [
        leaf('chart:column', 'Column chart', () => <ColumnChart />),
        leaf('chart:stacked-column', 'Stacked column chart', () => <StackedColumnChart />),
        leaf('chart:bar', 'Bar chart', () => <BarChart />),
        leaf('chart:stacked-bar', 'Stacked bar chart', () => <StackedBarChart />),
        leaf('chart:line', 'Line chart', () => <LineChart />),
        leaf('chart:pie', 'Pie chart', () => <PieChart />),
        leaf('chart:donut', 'Donut chart', () => <DonutChart />),
        leaf('chart:radar', 'Radar chart', () => <RadarChart />),
        leaf('chart:funnel', 'Funnel chart', () => <FunnelChart />),
        leaf('chart:half-donut', 'Half donut chart', () => <HalfDonutChart />),
        leaf('chart:waterfall', 'Waterfall chart', () => <WaterfallChart />),
      ],
    },
    leaf('table', 'Table', () => <TableSample />, { icon: Table2, badge: 'Beta' }),
    {
      id: 'mockup',
      label: 'Mockup',
      icon: Smartphone,
      children: [
        leaf('mockup:iphone', 'iPhone', () => <PhoneMockup />),
        leaf('mockup:ipad', 'iPad', () => <TabletMockup />),
        leaf('mockup:laptop', 'Laptop', () => <LaptopMockup />),
        leaf('mockup:browser', 'Browser', () => <BrowserMockup />),
      ],
    },
    {
      id: 'embed',
      label: 'Embed or link',
      icon: Link2,
      children: [
        leaf('embed:youtube', 'YouTube', () => <EmbedFrame />, { swatch: '#FF0000' }),
        leaf('embed:loom', 'Loom', () => <EmbedFrame />, { swatch: '#625DF5' }),
        leaf('embed:figma', 'Figma', () => <EmbedFrame />, { swatch: '#333333' }),
        leaf('embed:sheets', 'Google Sheets', () => <EmbedFrame />, { swatch: '#1EA362' }),
        { id: 'embed:div', label: '', divider: true },
        leaf('embed:link', 'Link card', () => <LinkCard />),
        leaf('embed:iframe', 'Embed (iFrame)', () => <EmbedFrame />),
        leaf('embed:qr', 'QR code', () => <QrCode />),
      ],
    },
    leaf('sticky', 'Sticky note', () => <StickyNote />, { icon: StickyNoteIcon, kbd: 'S' }),
  ],
};

function TableSample() {
  const rows = [
    ['Jan', '220', '$1,760', '$160'],
    ['Feb', '160', '$1,280', '$200'],
    ['Mar', '340', '$2,720', '$870'],
    ['Apr', '140', '$1,120', '$100'],
  ];
  return (
    <table style={{ width: 290, borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ color: MUTED, textAlign: 'left' }}>
          {['Month', 'Units', 'Amount', 'Profit'].map((h) => (
            <th key={h} style={{ padding: '6px', fontWeight: 500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {r.map((c, i) => (
              <td key={i} style={{ padding: '6px', color: i === 0 ? INK : 'rgba(233,233,235,0.6)' }}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
