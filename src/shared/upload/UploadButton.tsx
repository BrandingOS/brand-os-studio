/**
 * UploadButton — drop-in upload control with optional drag-and-drop overlay.
 *
 * Replaces the inline upload handlers in LogoUploader, BrandEditor, AssetManager,
 * LogoTool, AIAssistantBox, etc.
 *
 * Two modes:
 *   - Button mode (default): renders a clickable button + hidden file input
 *   - Drop-zone mode: renders the children inside a drop-target container
 *
 * Both mode call `onUploaded(result)` when an upload completes.
 */

import { useRef, useId } from 'react';
import { Upload } from 'lucide-react';
import { useUpload } from './useUpload';
import { useDropZone } from '@/shared/editor/dnd/useDropZone';
import type { UploadOptions, UploadResult } from './types';

export interface UploadButtonProps extends UploadOptions {
  onUploaded?: (result: UploadResult) => void;
  onUploadedMany?: (results: UploadResult[]) => void;
  multiple?: boolean;
  /** Renders children inside a drop-target instead of a button. */
  asDropZone?: boolean;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  label?: string;
}

export function UploadButton({
  onUploaded,
  onUploadedMany,
  multiple = false,
  asDropZone = false,
  className,
  children,
  disabled,
  label = 'Upload',
  ...uploadOpts
}: UploadButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploadMany, uploading } = useUpload();

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (multiple) {
      const results = await uploadMany(files, uploadOpts);
      if (onUploadedMany) onUploadedMany(results);
      else if (onUploaded && results[0]) onUploaded(results[0]);
    } else {
      const result = await upload(files[0], uploadOpts);
      if (result && onUploaded) onUploaded(result);
    }
  };

  const { dropRef, isOver } = useDropZone<HTMLDivElement>({
    onFiles: handleFiles,
    accept: uploadOpts.acceptedTypes ?? ['image/*'],
    disabled: disabled || !asDropZone,
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    handleFiles(files);
    // Reset so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  if (asDropZone) {
    return (
      <div
        ref={dropRef}
        className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''} relative cursor-pointer transition-all`}
        onClick={() => inputRef.current?.click()}
        aria-busy={uploading}
      >
        {children}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={(uploadOpts.acceptedTypes ?? ['image/*']).join(',')}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className ?? 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-sm transition-colors'}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        aria-busy={uploading}
      >
        {children ?? <><Upload className="h-4 w-4" />{uploading ? 'Uploading…' : label}</>}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={(uploadOpts.acceptedTypes ?? ['image/*']).join(',')}
        multiple={multiple}
        onChange={onChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </>
  );
}
