/**
 * DesignDropzone — drag-drop + file picker for the user's design.
 *
 * Produces an object-URL we hand to the engine. Caller is responsible
 * for revoking the URL on unmount if needed.
 */

import { Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

interface DesignDropzoneProps {
  onPick: (url: string, file: File) => void;
  accept?: string;
  compact?: boolean;
}

export function DesignDropzone({
  onPick,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
  compact = false,
}: DesignDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      onPick(url, file);
    },
    [onPick],
  );

  return (
    <label
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border/70 hover:border-primary/60 hover:bg-muted/40',
        compact ? 'p-3 text-xs' : 'p-6 text-sm',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <Upload
        className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-6 w-6')}
      />
      <div>
        <p className="font-medium">Upload your design</p>
        <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
          PNG, JPG, WEBP or SVG up to 10 MB
        </p>
      </div>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}
