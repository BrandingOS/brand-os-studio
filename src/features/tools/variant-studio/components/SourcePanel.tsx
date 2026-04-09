/**
 * SourcePanel — left pane top: shows the current source logo and lets
 * the user swap it.
 *
 * In in-app mode, the source comes preloaded from the brand. The swap
 * action lets them upload a different file (which becomes the new
 * source for *this session* — it doesn't overwrite the brand's logo).
 *
 * In public mode there's no brand to fall back to, so the swap action
 * is the primary way to start over.
 */
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SourceLogo } from '../engine/types';

interface SourcePanelProps {
  source: SourceLogo | null;
  brandName?: string;
  onPickFile: (file: File) => void;
}

export function SourcePanel({ source, brandName, onPickFile }: SourcePanelProps) {
  return (
    <div className="border-b p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Source
      </div>
      <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {source?.original.svg ? (
            <div
              className="h-full w-full p-1"
              dangerouslySetInnerHTML={{ __html: source.original.svg }}
            />
          ) : source?.original.raster ? (
            <img src={source.original.raster} alt="" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{brandName ?? 'Source logo'}</div>
          <div className="text-[10px] text-muted-foreground">
            {source?.wordmark?.text ? `Wordmark: ${source.wordmark.text}` : 'No wordmark text'}
          </div>
        </div>
      </div>
      <label className="mt-2 block">
        <input
          type="file"
          className="sr-only"
          accept="image/svg+xml,image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
          }}
        />
        <Button asChild variant="ghost" size="sm" className="w-full">
          <span>Replace source</span>
        </Button>
      </label>
    </div>
  );
}
