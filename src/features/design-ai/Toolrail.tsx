import { MousePointer2, Type, Square, Circle, Minus, Frame, Image as ImageIcon } from 'lucide-react';
import { useDesignAiStore, type ToolId } from './store';
import { cn } from '@/lib/utils';

const TOOLS: { id: ToolId; label: string; icon: React.ElementType; hotkey: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, hotkey: 'V' },
  { id: 'text', label: 'Text', icon: Type, hotkey: 'T' },
  { id: 'rect', label: 'Rectangle', icon: Square, hotkey: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, hotkey: 'O' },
  { id: 'line', label: 'Line', icon: Minus, hotkey: 'L' },
  { id: 'frame', label: 'Frame', icon: Frame, hotkey: 'F' },
  { id: 'image', label: 'Image', icon: ImageIcon, hotkey: 'I' },
];

interface Props {
  onPickImage: () => void;
}

export function Toolrail({ onPickImage }: Props) {
  const tool = useDesignAiStore((s) => s.tool);
  const setTool = useDesignAiStore((s) => s.setTool);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-border rounded-2xl shadow-lg p-1.5 flex flex-col gap-0.5">
      {TOOLS.map((t) => {
        const active = tool === t.id;
        const onClick = () => {
          if (t.id === 'image') {
            onPickImage();
            return;
          }
          setTool(t.id);
        };
        return (
          <button
            key={t.id}
            onClick={onClick}
            title={`${t.label} (${t.hotkey})`}
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}
