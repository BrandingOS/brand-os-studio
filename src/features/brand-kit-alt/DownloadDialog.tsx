/**
 * DownloadDialog — universal per-asset download modal for Brand Kit v2.
 *
 * Used by every "Download" button on the unified Brand Kit page. Caller
 * passes the supported formats and an `onExport(format, sizePx?)` callback;
 * the dialog handles the chip UI, loading state, error toasts.
 */
import * as React from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type DownloadFormat = 'png' | 'jpg' | 'svg' | 'pdf';

export interface DownloadDialogSize {
  label: string;
  px: number;
  hint?: string;
}

interface DownloadDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  formats: DownloadFormat[];
  /** Sizes shown when a raster format is selected. Default: 500/1000/2000 */
  sizes?: DownloadDialogSize[];
  onExport: (format: DownloadFormat, sizePx?: number) => Promise<void>;
}

const DEFAULT_SIZES: DownloadDialogSize[] = [
  { label: '500 px', px: 500, hint: 'Web & social' },
  { label: '1000 px', px: 1000, hint: 'Print ready' },
  { label: '2000 px', px: 2000, hint: 'High resolution' },
];

const FORMAT_INFO: Record<DownloadFormat, { label: string; hint: string }> = {
  png: { label: 'PNG', hint: 'Transparent raster · web & social' },
  jpg: { label: 'JPG', hint: 'Solid background raster' },
  svg: { label: 'SVG', hint: 'Vector · infinite resolution' },
  pdf: { label: 'PDF', hint: 'Print-ready document' },
};

export function DownloadDialog({
  open,
  onClose,
  title,
  subtitle,
  formats,
  sizes = DEFAULT_SIZES,
  onExport,
}: DownloadDialogProps) {
  const [format, setFormat] = React.useState<DownloadFormat>(formats[0] ?? 'png');
  const [sizePx, setSizePx] = React.useState<number>(sizes[1]?.px ?? 1000);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setFormat(formats[0] ?? 'png');
      setSizePx(sizes[1]?.px ?? 1000);
    }
  }, [open, formats, sizes]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isRaster = format === 'png' || format === 'jpg';

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading(`Exporting ${FORMAT_INFO[format].label}…`);
    try {
      await onExport(format, isRaster ? sizePx : undefined);
      toast.success(`Downloaded · ${FORMAT_INFO[format].label}`, { id: toastId });
      onClose();
    } catch (err) {
      console.error('[DownloadDialog]', err);
      toast.error(`Export failed · ${err instanceof Error ? err.message : 'unknown'}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          {/* Format chips */}
          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Format
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {formats.map((f) => {
                const info = FORMAT_INFO[f];
                const active = f === format;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition',
                      active
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                    )}
                  >
                    <span className="text-sm font-bold">{info.label}</span>
                    <span className="text-[10px] leading-tight">{info.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Size chips (raster only) */}
          {isRaster && (
            <section>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Size
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {sizes.map((s) => {
                  const active = s.px === sizePx;
                  return (
                    <button
                      key={s.px}
                      type="button"
                      onClick={() => setSizePx(s.px)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition',
                        active
                          ? 'border-primary/60 bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className="text-xs font-semibold">{s.label}</span>
                      {s.hint && <span className="text-[9px] leading-tight">{s.hint}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isExporting ? 'Exporting…' : 'Download'}
          </button>
        </footer>
      </div>
    </div>
  );
}
