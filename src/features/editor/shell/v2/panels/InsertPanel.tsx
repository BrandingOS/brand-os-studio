// InsertPanel — functional sub-panel that adds layers to the active page.
//
// Variant 4 layout: panel-top with eyebrow + serif title; panel-list
// of grouped panel-items. Each item builds a default layer and calls
// `adapter.addLayer(pageId, layer)` — the same pattern the legacy
// EditorToolbar used (replaced by this panel + the App Rail).

import {
  Bookmark,
  Circle as CircleIcon,
  Heading,
  Image as ImageIcon,
  Minus,
  PaintBucket,
  Pilcrow,
  Square,
  Type as TypeIcon,
} from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Layer } from '@/features/editor/schema';

interface Props {
  adapter: EditorAdapter;
  /** Page to receive new layers. Pulled from current selection /
   *  active page in the parent so a fresh page id flows in on
   *  every panel render. */
  pageId: string;
}

type InsertId =
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'heading'
  | 'body'
  | 'list'
  | 'image'
  | 'logo'
  | 'svg';

const GROUPS: ReadonlyArray<{
  title: string;
  items: ReadonlyArray<{
    id: InsertId;
    name: string;
    sub: string;
    Icon: typeof Square;
  }>;
}> = [
  {
    title: 'Shapes',
    items: [
      { id: 'rectangle', name: 'Rectangle', sub: 'Solid · stroke · fill', Icon: Square },
      { id: 'ellipse', name: 'Ellipse', sub: 'Circle · oval', Icon: CircleIcon },
      { id: 'line', name: 'Line', sub: 'Divider · arrow', Icon: Minus },
    ],
  },
  {
    title: 'Text',
    items: [
      { id: 'heading', name: 'Heading', sub: 'Large display text', Icon: Heading },
      { id: 'body', name: 'Body', sub: 'Paragraph block', Icon: Pilcrow },
      { id: 'list', name: 'List', sub: 'Bulleted · numbered', Icon: TypeIcon },
    ],
  },
  {
    title: 'Media',
    items: [
      { id: 'image', name: 'Image', sub: 'Upload or link', Icon: ImageIcon },
      { id: 'logo', name: 'Logo', sub: 'From brand kit', Icon: Bookmark },
      { id: 'svg', name: 'SVG', sub: 'Vector asset', Icon: PaintBucket },
    ],
  },
];

export function InsertPanel({ adapter, pageId }: Props) {
  const handleInsert = (id: InsertId) => {
    if (!pageId) return;
    const layer = makeLayer(id);
    if (layer) adapter.addLayer(pageId, layer);
  };

  return (
    <>
      <nav className="panel-list">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="panel-group-label">{g.title}</div>
            {g.items.map((it) => (
              <div key={it.id} className="panel-item">
                <button
                  type="button"
                  className="panel-item-body"
                  data-insert-id={it.id}
                  onClick={() => handleInsert(it.id)}
                >
                  <span className="panel-item-thumb" aria-hidden>
                    <it.Icon size={16} strokeWidth={1.6} />
                  </span>
                  <span className="panel-item-meta">
                    <span className="panel-item-name">{it.name}</span>
                    <span className="panel-item-sub">{it.sub}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

// ─── Layer factories ────────────────────────────────────────────────────

function makeLayer(id: InsertId): Layer | null {
  const lid = crypto.randomUUID();
  const baseTransform = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
  const baseLayer = {
    id: lid,
    transform: baseTransform,
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  } as const;

  switch (id) {
    case 'rectangle':
      return {
        ...baseLayer,
        kind: 'shape',
        name: 'Rectangle',
        shape: 'rectangle',
        fill: '#6366f1',
        stroke: null,
        strokeWidth: 0,
        cornerRadius: 8,
      };
    case 'ellipse':
      return {
        ...baseLayer,
        kind: 'shape',
        name: 'Ellipse',
        shape: 'ellipse',
        fill: '#10b981',
        stroke: null,
        strokeWidth: 0,
        cornerRadius: 0,
      };
    case 'line':
      return {
        ...baseLayer,
        kind: 'shape',
        name: 'Line',
        shape: 'line',
        fill: null,
        stroke: '#111111',
        strokeWidth: 2,
        cornerRadius: 0,
        transform: { ...baseTransform, height: 2 },
      };
    case 'heading':
      return {
        ...baseLayer,
        kind: 'text',
        name: 'Heading',
        text: 'Heading',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: -0.01,
        textAlign: 'left',
        direction: 'auto',
        color: '#111111',
        transform: { ...baseTransform, width: 400, height: 60 },
      };
    case 'body':
      return {
        ...baseLayer,
        kind: 'text',
        name: 'Body',
        text: 'Body text',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: '#444444',
        transform: { ...baseTransform, width: 320, height: 60 },
      };
    case 'list':
      return {
        ...baseLayer,
        kind: 'text',
        name: 'List',
        text: '• Item one\n• Item two\n• Item three',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: '#222222',
        transform: { ...baseTransform, width: 280, height: 90 },
      };
    case 'image':
      // Phase 5a stub URL — Phase 4 wires AssetSourcePopover.
      return {
        ...baseLayer,
        kind: 'image',
        name: 'Image',
        src: 'https://placehold.co/400x300/png',
        fit: 'cover',
        transform: { ...baseTransform, width: 400, height: 300 },
      };
    case 'logo':
      return {
        ...baseLayer,
        kind: 'logo',
        name: 'Logo',
        variant: 'auto',
        transform: { ...baseTransform, width: 160, height: 160 },
      };
    case 'svg':
      // Phase 5a stub URL — Phase 4 wires the SVG asset picker.
      return {
        ...baseLayer,
        kind: 'svg',
        name: 'SVG',
        src: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/SVG_Logo.svg',
        fillOverrides: {},
        transform: { ...baseTransform, width: 200, height: 200 },
      };
    default:
      return null;
  }
}
