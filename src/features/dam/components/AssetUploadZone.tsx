import * as React from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetUploadZoneProps {
  onUpload: (files: File[]) => void | Promise<void>;
  accept?: string;
}

export function AssetUploadZone({ onUpload, accept = 'image/*,application/pdf' }: AssetUploadZoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onUpload(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/40 px-6 py-10 text-center transition',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-card/70',
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
        <Upload className="h-5 w-5 text-foreground" />
      </div>
      <div className="relative">
        <p className="text-sm font-semibold text-foreground">
          {dragging ? 'Drop to upload' : 'Drag & drop assets, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG · JPG · SVG · PDF · up to 10 MB · multi-upload supported
        </p>
      </div>
      <div className="relative mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
        <Sparkles className="h-3 w-3 text-primary" />
        Auto-tagging coming soon
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onUpload(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
