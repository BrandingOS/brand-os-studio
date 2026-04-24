/**
 * CanvasToolbar — add-layer toolbar floating over the canvas.
 */

import {
  Circle,
  Image as ImageIcon,
  Minus,
  Square,
  Type,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ElementLayer, TextLayer } from '../engine/types';
import { useMockupStore } from '../state/mockupStore';

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CanvasToolbar() {
  const template = useMockupStore((s) => s.template);
  const addTextLayer = useMockupStore((s) => s.addTextLayer);
  const addElementLayer = useMockupStore((s) => s.addElementLayer);
  const setSelection = useMockupStore((s) => s.setSelection);

  if (!template) return null;

  const centerX = template.canvas.width / 2;
  const centerY = template.canvas.height / 2;

  const addText = () => {
    const id = makeId('text');
    const layer: TextLayer = {
      id,
      text: 'Edit me',
      x: centerX,
      y: centerY,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 72,
      fontWeight: 600,
      color: '#111827',
      align: 'center',
      letterSpacing: 0,
      rotation: 0,
    };
    addTextLayer(layer);
    setSelection({ kind: 'text', id });
  };

  const addShape = (type: 'rect' | 'circle' | 'line') => {
    const id = makeId(type);
    let layer: ElementLayer;
    if (type === 'rect') {
      layer = {
        id,
        type: 'rect',
        x: centerX,
        y: centerY,
        width: 300,
        height: 200,
        fill: '#111827',
        rotation: 0,
      };
    } else if (type === 'circle') {
      layer = {
        id,
        type: 'circle',
        x: centerX,
        y: centerY,
        radius: 120,
        fill: '#111827',
      };
    } else {
      layer = {
        id,
        type: 'line',
        x1: centerX - 200,
        y1: centerY,
        x2: centerX + 200,
        y2: centerY,
        stroke: '#111827',
        strokeWidth: 6,
      };
    }
    addElementLayer(layer);
    setSelection({ kind: 'element', id });
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = makeId('img');
      addElementLayer({
        id,
        type: 'image',
        x: centerX,
        y: centerY,
        width: 400,
        height: 400,
        url,
        rotation: 0,
      });
      setSelection({ kind: 'element', id });
    };
    input.click();
  };

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-background/95 p-1 shadow-lg backdrop-blur">
      <ToolButton label="Text" icon={<Type className="h-4 w-4" />} onClick={addText} />
      <ToolButton label="Rectangle" icon={<Square className="h-4 w-4" />} onClick={() => addShape('rect')} />
      <ToolButton label="Circle" icon={<Circle className="h-4 w-4" />} onClick={() => addShape('circle')} />
      <ToolButton label="Line" icon={<Minus className="h-4 w-4" />} onClick={() => addShape('line')} />
      <div className="mx-0.5 h-5 w-px bg-border" />
      <ToolButton label="Image" icon={<ImageIcon className="h-4 w-4" />} onClick={addImage} />
    </div>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
}
