/**
 * CanvasOverlay — HTML layer rendered above the PixiJS canvas.
 *
 * Handles three jobs the raw canvas doesn't:
 *   1. Live-editable text (contenteditable) so users see instant updates
 *      without the engine needing to reload text textures.
 *   2. Click-to-select hit testing for zones / text / element layers.
 *   3. Selection outline + drag handles for whichever layer is selected.
 *
 * Coordinates are template-space (1:1 with MockupState). The overlay is
 * CSS-scaled to match the displayed canvas size.
 */

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import type {
  ElementLayer,
  MockupState,
  TemplateMeta,
  TextLayer,
} from '../engine/types';
import { useMockupStore } from '../state/mockupStore';

interface CanvasOverlayProps {
  template: TemplateMeta;
  mockup: MockupState;
  displayWidth: number;
  displayHeight: number;
}

export function CanvasOverlay({
  template,
  mockup,
  displayWidth,
  displayHeight,
}: CanvasOverlayProps) {
  const selection = useMockupStore((s) => s.selection);
  const setSelection = useMockupStore((s) => s.setSelection);

  // Scale factor between template space and displayed pixels.
  const sx = displayWidth / template.canvas.width;
  const sy = displayHeight / template.canvas.height;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      onClickCapture={(e) => {
        // Clicking the overlay background (not a child) deselects.
        if (e.target === e.currentTarget) setSelection(null);
      }}
    >
      {/* Zone bounds — invisible but clickable. */}
      {template.zones.map((zone) => {
        const z = mockup.zones[zone.id];
        if (!z) return null;
        const selected = selection?.kind === 'zone' && selection.id === zone.id;
        return (
          <ZoneFrame
            key={zone.id}
            zone={zone}
            zoneState={z}
            sx={sx}
            sy={sy}
            selected={selected}
            onSelect={() => setSelection({ kind: 'zone', id: zone.id })}
          />
        );
      })}

      {/* Element layers — render visual preview so they're selectable. */}
      {mockup.elementLayers.map((layer) => {
        const selected = selection?.kind === 'element' && selection.id === layer.id;
        return (
          <ElementFrame
            key={layer.id}
            layer={layer}
            sx={sx}
            sy={sy}
            selected={selected}
            onSelect={() => setSelection({ kind: 'element', id: layer.id })}
          />
        );
      })}

      {/* Text layers — contenteditable HTML over the canvas for crispness. */}
      {mockup.textLayers.map((layer) => {
        const selected = selection?.kind === 'text' && selection.id === layer.id;
        return (
          <TextLayerHtml
            key={layer.id}
            layer={layer}
            sx={sx}
            sy={sy}
            selected={selected}
            onSelect={() => setSelection({ kind: 'text', id: layer.id })}
          />
        );
      })}
    </div>
  );
}

// ─── zone frame ──────────────────────────────────────────────────

function ZoneFrame({
  zone,
  zoneState,
  sx,
  sy,
  selected,
  onSelect,
}: {
  zone: TemplateMeta['zones'][number];
  zoneState: MockupState['zones'][string];
  sx: number;
  sy: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const w = zone.defaultTransform.width * zoneState.transform.scale * sx;
  const h = zone.defaultTransform.height * zoneState.transform.scale * sy;
  const x = zoneState.transform.x * sx - w / 2;
  const y = zoneState.transform.y * sy - h / 2;
  return (
    <div
      className={cn(
        'group pointer-events-auto absolute cursor-pointer rounded-sm transition-colors',
        selected
          ? 'ring-2 ring-primary/90 bg-primary/5'
          : 'hover:ring-2 hover:ring-primary/40',
      )}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `rotate(${zoneState.transform.rotation}deg)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <span
        className={cn(
          'pointer-events-none absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-80',
        )}
      >
        {zone.label}
      </span>
    </div>
  );
}

// ─── text layer ──────────────────────────────────────────────────

function TextLayerHtml({
  layer,
  sx,
  sy,
  selected,
  onSelect,
}: {
  layer: TextLayer;
  sx: number;
  sy: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const updateTextLayer = useMockupStore((s) => s.updateTextLayer);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    onMove: (ev: MouseEvent) => void;
    onUp: () => void;
  } | null>(null);

  // Mid-drag unmount cleanup — if the component disappears with listeners
  // still attached (fast navigate, undo nuking the layer), detach them.
  useEffect(() => {
    return () => {
      const s = dragState.current;
      if (s) {
        window.removeEventListener('mousemove', s.onMove);
        window.removeEventListener('mouseup', s.onUp);
        dragState.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      // Select all on focus.
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const transformStr = `translate(-50%, -50%) rotate(${layer.rotation}deg)`;

  const onMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    onSelect();
    const onMove = (ev: MouseEvent) => {
      const s = dragState.current;
      if (!s) return;
      const dx = (ev.clientX - s.startX) / sx;
      const dy = (ev.clientY - s.startY) / sy;
      updateTextLayer(layer.id, { x: s.origX + dx, y: s.origY + dy });
    };
    const onUp = () => {
      const s = dragState.current;
      if (s) {
        window.removeEventListener('mousemove', s.onMove);
        window.removeEventListener('mouseup', s.onUp);
      }
      dragState.current = null;
    };
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
      onMove,
      onUp,
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      className={cn(
        'pointer-events-auto absolute whitespace-pre select-text outline-none',
        selected && !editing
          ? 'ring-2 ring-primary/90'
          : 'hover:ring-1 hover:ring-primary/40',
        editing ? 'cursor-text' : 'cursor-move',
      )}
      style={{
        left: layer.x * sx,
        top: layer.y * sy,
        transform: transformStr,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize * sx,
        fontWeight: layer.fontWeight,
        color: layer.color,
        letterSpacing: layer.letterSpacing,
        textAlign: layer.align,
        padding: `${4 * sx}px ${8 * sx}px`,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onSelect();
        setEditing(true);
      }}
      onMouseDown={onMouseDown}
      onBlur={(e) => {
        if (editing) {
          const text = e.currentTarget.textContent ?? '';
          updateTextLayer(layer.id, { text });
          setEditing(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.currentTarget.blur();
        }
      }}
    >
      {layer.text}
    </div>
  );
}

// ─── element layer ───────────────────────────────────────────────

function ElementFrame({
  layer,
  sx,
  sy,
  selected,
  onSelect,
}: {
  layer: ElementLayer;
  sx: number;
  sy: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const bbox = elementBbox(layer);
  const x = bbox.x * sx;
  const y = bbox.y * sy;
  const w = bbox.w * sx;
  const h = bbox.h * sy;
  return (
    <div
      className={cn(
        'pointer-events-auto absolute cursor-pointer rounded-sm transition-colors',
        selected
          ? 'ring-2 ring-primary/90'
          : 'hover:ring-1 hover:ring-primary/40',
      )}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transform: layer.type === 'rect' || layer.type === 'image'
          ? `rotate(${layer.rotation}deg)`
          : undefined,
        transformOrigin: 'center',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    />
  );
}

function elementBbox(layer: ElementLayer): { x: number; y: number; w: number; h: number } {
  if (layer.type === 'rect' || layer.type === 'image') {
    return {
      x: layer.x - layer.width / 2,
      y: layer.y - layer.height / 2,
      w: layer.width,
      h: layer.height,
    };
  }
  if (layer.type === 'circle') {
    return {
      x: layer.x - layer.radius,
      y: layer.y - layer.radius,
      w: layer.radius * 2,
      h: layer.radius * 2,
    };
  }
  // line
  const minX = Math.min(layer.x1, layer.x2);
  const minY = Math.min(layer.y1, layer.y2);
  return {
    x: minX - 4,
    y: minY - 4,
    w: Math.abs(layer.x2 - layer.x1) + 8,
    h: Math.abs(layer.y2 - layer.y1) + 8,
  };
}
