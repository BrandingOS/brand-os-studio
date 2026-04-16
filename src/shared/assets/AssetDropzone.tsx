/**
 * AssetDropzone — unified drag-and-drop + click-to-upload primitive.
 *
 * Use this in every brand asset UI. Pair with `useAssetUpload(brandId)`
 * to get a complete v3 upload flow in ~5 lines:
 *
 *   const { upload, uploading } = useAssetUpload(brandId);
 *   <AssetDropzone
 *     onFiles={(files) => upload(files[0], { role: 'primary' })}
 *     busy={uploading}
 *     accept="image/*"
 *   >
 *     <Upload className="h-4 w-4" /> Drop logo here
 *   </AssetDropzone>
 */
import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AssetDropzoneProps {
  onFiles: (files: File[]) => void | Promise<void>;
  /** Drop-zone UI (icon, label, etc.). */
  children: React.ReactNode;
  /** MIME / extension filter — forwarded to <input accept>. */
  accept?: string;
  /** Allow multiple files in one drop. */
  multiple?: boolean;
  /** Show spinner + disable interactions while busy. */
  busy?: boolean;
  className?: string;
  /** Inline variant — compact styling for squeezed surfaces. */
  compact?: boolean;
  disabled?: boolean;
}

export function AssetDropzone({
  onFiles,
  children,
  accept = 'image/*',
  multiple = false,
  busy = false,
  className,
  compact,
  disabled,
}: AssetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      void onFiles(multiple ? files : files.slice(0, 1));
    },
    [onFiles, multiple],
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none',
        compact ? 'gap-1.5 p-3 text-xs' : 'gap-2 p-6 text-sm',
        disabled || busy ? 'pointer-events-none opacity-60' : 'hover:bg-muted/40',
        hover ? 'border-primary bg-primary/5' : 'border-border',
        className,
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (disabled || busy) return;
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={disabled || busy ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {busy ? (
        <>
          <Loader2 className={cn('animate-spin', compact ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
          <span className="text-muted-foreground">Uploading…</span>
        </>
      ) : (
        children
      )}
    </div>
  );
}
