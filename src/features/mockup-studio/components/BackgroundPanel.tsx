/**
 * BackgroundPanel — template / solid / image tabs for the canvas backdrop.
 */

import { Image, Palette, Undo2 } from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';
import type { MockupState } from '../engine/types';

interface BackgroundPanelProps {
  value: MockupState['background'];
  onChange: (next: MockupState['background']) => void;
}

export function BackgroundPanel({ value, onChange }: BackgroundPanelProps) {
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      onChange({ type: 'image', value: url });
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <TabButton
          active={value.type === 'template'}
          icon={<Undo2 className="h-3.5 w-3.5" />}
          label="Default"
          onClick={() => onChange({ type: 'template', value: 'template' })}
        />
        <TabButton
          active={value.type === 'solid'}
          icon={<Palette className="h-3.5 w-3.5" />}
          label="Solid"
          onClick={() =>
            onChange({
              type: 'solid',
              value: value.type === 'solid' ? value.value : '#f3ece2',
            })
          }
        />
        <TabButton
          active={value.type === 'image'}
          icon={<Image className="h-3.5 w-3.5" />}
          label="Image"
          onClick={() => {
            if (value.type !== 'image') {
              document.getElementById('bg-image-upload')?.click();
            }
          }}
        />
      </div>

      {value.type === 'solid' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value.value}
            onChange={(e) => onChange({ type: 'solid', value: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border/70 bg-transparent"
          />
          <input
            type="text"
            value={value.value}
            onChange={(e) => onChange({ type: 'solid', value: e.target.value })}
            className="flex-1 rounded border border-border/70 bg-background px-2 py-1 text-xs font-mono"
          />
        </div>
      )}

      <input
        id="bg-image-upload"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
