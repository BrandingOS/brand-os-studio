/**
 * Lovart-style floating toolbar pinned to the bottom-center of the canvas.
 * Purely visual for now — wiring to drawing modes comes in a follow-up.
 */
import { MousePointer2, Image as ImageIcon, Play, Mic, Maximize, Pencil, Type, Square, Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onAction?: (id: string) => void;
}

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'image', icon: ImageIcon, label: 'Image' },
  { id: 'video', icon: Play, label: 'Video' },
  { id: 'audio', icon: Mic, label: 'Audio' },
  { id: 'frame', icon: Maximize, label: 'Frame' },
  { id: 'draw', icon: Pencil, label: 'Draw' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'more', icon: Plus, label: 'More' },
] as const;

export function BottomToolbar({ onAction }: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-neutral-900 text-white rounded-full shadow-xl px-2 py-1.5">
      {TOOLS.map((t, i) => {
        const Icon = t.icon;
        const isPrimary = i === 0;
        return (
          <button
            key={t.id}
            title={t.label}
            onClick={() => onAction?.(t.id)}
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
              isPrimary
                ? 'bg-white text-neutral-900'
                : 'hover:bg-white/10 text-white/90',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
