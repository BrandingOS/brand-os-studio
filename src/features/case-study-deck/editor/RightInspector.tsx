/**
 * RightInspector — type-aware properties panel for the case-study editor.
 *
 * Reads the bridged selection from `useSelectionStore` (synced by the
 * editor page from EditableSlide click events). Mounts the right
 * inspector based on the selection type, plus a Position sub-panel
 * (X/Y/W/H/Rotation) and a Layers sub-panel (slide direct children).
 */
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, MoveDiagonal } from 'lucide-react';
import { useSelectionStore } from '@/shared/editor/selection/selectionStore';
import { TextInspector } from '@/shared/editor/inspectors/TextInspector';
import { ImageInspector } from '@/shared/editor/inspectors/ImageInspector';
import { ShapeInspector } from '@/shared/editor/inspectors/ShapeInspector';
import { SlideInspector } from '@/shared/editor/inspectors/SlideInspector';

export function RightInspector() {
  const selected = useSelectionStore((s) => s.selected);

  const heading = !selected || selected.type === 'slide'
    ? 'Slide'
    : selected.type === 'text'
      ? 'Text'
      : selected.type === 'image'
        ? 'Image'
        : 'Shape';

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: '#0d0d0d',
        borderLeft: '1px solid #1c1c1c',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid #161616',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: '#9aa0a6',
        }}
      >
        {heading}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }} className="bos-inspector-scroll">
        <div className="bos-inspector-body">
          {(!selected || selected.type === 'slide') && <SlideInspector />}
          {selected?.type === 'text' && <TextInspector />}
          {selected?.type === 'image' && <ImageInspector />}
          {selected?.type === 'shape' && <ShapeInspector />}

          {selected && selected.type !== 'slide' && <PositionPanel />}
        </div>
        <LayersPanel />
      </div>

      {/* Override the inspectors' light styles to match dark chrome. */}
      <style>{`
        .bos-inspector-body label { color: #9aa0a6 !important; }
        .bos-inspector-body select,
        .bos-inspector-body input[type="color"],
        .bos-inspector-body input[type="range"] { background:#141414; color:#fff; border-color:#232323 !important; }
        .bos-inspector-body button { background:#141414 !important; color:#fff !important; border-color:#232323 !important; }
        .bos-inspector-body button:hover { background:#1c1c1c !important; }
      `}</style>
    </aside>
  );
}

/* ─────────────────────────  POSITION  ───────────────────── */
function PositionPanel() {
  const selected = useSelectionStore((s) => s.selected);
  const el = selected?.el;
  const [, setTick] = useState(0);

  // Re-render when selection rect/element changes
  useEffect(() => {
    if (!el) return;
    const obs = new MutationObserver(() => setTick((t) => t + 1));
    obs.observe(el, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, [el]);

  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const parent = el.parentElement?.getBoundingClientRect();
  const x = parent ? Math.round(rect.left - parent.left) : Math.round(rect.left);
  const y = parent ? Math.round(rect.top - parent.top) : Math.round(rect.top);
  const w = Math.round(el.offsetWidth);
  const h = Math.round(el.offsetHeight);
  const rotMatch = (el.style.transform || '').match(/rotate\(([-\d.]+)deg\)/);
  const rotation = rotMatch ? Number(rotMatch[1]) : 0;

  const setStyle = (patch: Partial<CSSStyleDeclaration>) => {
    Object.assign(el.style, patch);
    setTick((t) => t + 1);
  };

  return (
    <div style={{ borderTop: '1px solid #161616', padding: 14 }}>
      <div style={{ fontSize: 10, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
        Position
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <NumField label="X" value={x} onChange={(v) => { el.style.position = 'relative'; setStyle({ left: `${v}px` }); }} />
        <NumField label="Y" value={y} onChange={(v) => { el.style.position = 'relative'; setStyle({ top: `${v}px` }); }} />
        <NumField label="W" value={w} onChange={(v) => setStyle({ width: `${v}px` })} />
        <NumField label="H" value={h} onChange={(v) => setStyle({ height: `${v}px` })} />
        <NumField
          label="Rotate"
          value={rotation}
          onChange={(v) => {
            const base = (el.style.transform || '').replace(/rotate\([^)]+\)/, '').trim();
            el.style.transform = `${base} rotate(${v}deg)`.trim();
            setTick((t) => t + 1);
          }}
        />
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: '#9aa0a6' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: '#141414',
          border: '1px solid #232323',
          color: '#fff',
          padding: '6px 8px',
          fontSize: 12,
          borderRadius: 4,
          width: '100%',
        }}
      />
    </label>
  );
}

/* ─────────────────────────  LAYERS  ─────────────────────── */
function LayersPanel() {
  const selected = useSelectionStore((s) => s.selected);
  const select = useSelectionStore((s) => s.select);
  const [, setTick] = useState(0);

  useEffect(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;
    const obs = new MutationObserver(() => setTick((t) => t + 1));
    obs.observe(canvas, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  const canvas = typeof document !== 'undefined' ? (document.querySelector('[data-slide-canvas]') as HTMLElement | null) : null;
  if (!canvas) return null;

  // Direct children of the slide root (skip the EditableSlide wrapper if present).
  const root = (canvas.firstElementChild as HTMLElement | null) ?? canvas;
  const children = Array.from(root.children) as HTMLElement[];

  const labelFor = (el: HTMLElement) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return 'Image';
    if (tag === 'svg') return 'Vector';
    const text = (el.textContent ?? '').trim();
    if (text.length > 0) return text.slice(0, 28).trim() + (text.length > 28 ? '…' : '');
    return tag.toUpperCase();
  };

  const detectType = (el: HTMLElement): 'text' | 'image' | 'shape' => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'svg' || tag === 'picture') return 'image';
    const text = (el.textContent ?? '').trim();
    if (text.length > 0) return 'text';
    return 'shape';
  };

  const bringForward = (el: HTMLElement) => {
    const next = el.nextElementSibling;
    if (next) el.parentElement?.insertBefore(next, el);
  };
  const sendBack = (el: HTMLElement) => {
    const prev = el.previousElementSibling;
    if (prev) el.parentElement?.insertBefore(el, prev);
  };

  return (
    <div style={{ borderTop: '1px solid #161616', padding: 14 }}>
      <div style={{ fontSize: 10, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
        Layers · {children.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children.length === 0 && <div style={{ fontSize: 11, color: '#666' }}>Empty slide.</div>}
        {children.map((el, i) => {
          const isSelected = selected?.el === el;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isSelected ? '#1f1f1f' : '#141414',
                border: isSelected ? '1px solid #3B82F6' : '1px solid #232323',
                borderRadius: 4,
                padding: 4,
              }}
            >
              <button
                onClick={() => {
                  select({ surface: 'case-study-editor', slideId: 'current', type: detectType(el), el });
                  el.scrollIntoView({ block: 'nearest' });
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  padding: '4px 6px',
                  fontSize: 11,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={labelFor(el)}
              >
                {labelFor(el)}
              </button>
              <button
                onClick={() => bringForward(el)}
                title="Bring forward"
                style={{ background: 'transparent', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: 4 }}
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={() => sendBack(el)}
                title="Send back"
                style={{ background: 'transparent', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: 4 }}
              >
                <ArrowDown size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 10, fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MoveDiagonal size={11} /> Drag in canvas to reorder visually.
      </p>
    </div>
  );
}
