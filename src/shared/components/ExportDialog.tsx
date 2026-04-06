/**
 * ExportDialog — Reusable export dialog for all features.
 *
 * Shows available formats as a grid, lets users choose resolution/quality,
 * and handles export with progress tracking.
 */
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Image, FileText, Film, Play, PenTool, Presentation,
  Download, Loader2, Check, X, ChevronDown, FileEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ExportFormat, ExportSource, ExportOptions, FrameGenerator } from '@/shared/services/export/types';
import { FORMAT_INFO } from '@/shared/services/export/types';
import { exportDesign, downloadResult } from '@/shared/services/export/engine';
import type jsPDF from 'jspdf';

// ─── Props ───────────────────────────────────────────────────────────

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** What to export */
  source: ExportSource;
  /** Which formats to show */
  availableFormats: ExportFormat[];
  /** Base filename (without extension) */
  defaultFilename: string;
  /** For multi-page exports: selector or elements */
  pages?: HTMLElement[] | (() => HTMLElement[]);
  /** For editable PDF: builder function that draws real text/shapes */
  editablePdfBuilder?: (doc: jsPDF) => Promise<void>;
  /** For vector SVG: builder function that returns SVG XML string */
  svgBuilder?: () => string;
  /** For vector PPTX: builder that returns ExportResult directly */
  pptxBuilder?: (filename: string, onProgress?: (pct: number) => void) => Promise<any>;
  /** For video/GIF: frame generator or factory */
  frameGenerator?: FrameGenerator | (() => FrameGenerator);
  /** Title override */
  title?: string;
  /**
   * Per-format custom export handlers. When a format key is present, the
   * dialog calls the handler instead of dispatching to the export engine.
   * Used for formats that need slide-by-slide stepping (e.g. editable PDF
   * when slides are virtualized in the host editor).
   */
  onCustomExport?: Partial<Record<ExportFormat, () => Promise<void> | void>>;
}

// ─── Icons ───────────────────────────────────────────────────────────

const formatIcons: Record<string, typeof Image> = {
  Image, PenTool, FileText, Film, Play, Presentation, FileEdit,
};

function getFormatIcon(format: ExportFormat) {
  const info = FORMAT_INFO[format];
  switch (info.icon) {
    case 'PenTool': return PenTool;
    case 'FileText': return FileText;
    case 'FileEdit': return FileEdit;
    case 'Film': return Film;
    case 'Play': return Play;
    case 'Presentation': return Presentation;
    default: return Image;
  }
}

// ─── Scale Options ───────────────────────────────────────────────────

const rasterScales = [
  { value: 1, label: '1x', desc: 'Standard' },
  { value: 2, label: '2x', desc: 'High Quality' },
  { value: 4, label: '4x', desc: 'Ultra HD' },
];

const videoResolutions = [
  { value: 512, label: '512px', desc: 'Quick' },
  { value: 720, label: '720px', desc: 'HD' },
  { value: 1080, label: '1080px', desc: 'Full HD' },
];

// ─── Component ───────────────────────────────────────────────────────

export function ExportDialog({
  open,
  onClose,
  source,
  availableFormats,
  defaultFilename,
  pages,
  editablePdfBuilder,
  svgBuilder,
  pptxBuilder,
  frameGenerator,
  title = 'Export',
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [scale, setScale] = useState(2);
  const [resolution, setResolution] = useState<512 | 720 | 1080>(720);
  const [jpgQuality, setJpgQuality] = useState(92);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);

  const isVideoFormat = selectedFormat === 'mp4' || selectedFormat === 'gif';
  const isRasterFormat = selectedFormat === 'png' || selectedFormat === 'jpg';
  const showScaleOptions = isRasterFormat || selectedFormat === 'svg' || selectedFormat === 'pdf-flat' || selectedFormat === 'pptx';
  const showResolutionOptions = isVideoFormat;
  const showQualitySlider = selectedFormat === 'jpg';

  // Group formats by category
  const imageFormats = availableFormats.filter(f => FORMAT_INFO[f].category === 'image');
  const documentFormats = availableFormats.filter(f => FORMAT_INFO[f].category === 'document');
  const videoFormats = availableFormats.filter(f => FORMAT_INFO[f].category === 'video');

  const handleExport = useCallback(async () => {
    if (!selectedFormat) return;

    setIsExporting(true);
    setProgress(0);
    setExportDone(false);

    // Per-format custom override (e.g. editor-driven slide stepping)
    const customHandler = onCustomExport?.[selectedFormat];
    if (customHandler) {
      try {
        await customHandler();
        setExportDone(true);
        setTimeout(() => {
          setExportDone(false);
          setSelectedFormat(null);
        }, 1500);
      } catch (err) {
        console.error('Custom export failed:', err);
        toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    try {
      // Build the export source with optional overrides
      const exportSource: ExportSource = { ...source };

      // For multi-page exports — pdf-flat / pptx / pdf-editable all stitch
      // every slide into a single multi-page document
      if (pages && (selectedFormat === 'pdf-flat' || selectedFormat === 'pptx' || selectedFormat === 'pdf-editable')) {
        const resolvedPages = typeof pages === 'function' ? pages() : pages;
        exportSource.element = resolvedPages;
        exportSource.type = 'html-element';
      }

      // For editable PDF — if a programmatic builder was supplied (business
      // cards, invoices, etc.) use it; otherwise the engine falls through to
      // the DOM-to-vector pipeline which walks every page in `element`.
      if (selectedFormat === 'pdf-editable' && editablePdfBuilder) {
        exportSource.pdfBuilder = editablePdfBuilder;
        exportSource.type = 'jspdf-programmatic';
      }

      // For vector SVG — uses real <text>/<rect> SVG elements
      if (selectedFormat === 'svg' && svgBuilder) {
        exportSource.svgBuilder = svgBuilder;
      }

      // For vector PPTX — uses real editable text/shapes
      if (selectedFormat === 'pptx' && pptxBuilder) {
        exportSource.pptxBuilder = pptxBuilder;
      }

      // For video/GIF
      if (isVideoFormat && frameGenerator) {
        exportSource.frameGenerator = typeof frameGenerator === 'function' ? frameGenerator() : frameGenerator;
        exportSource.type = 'canvas-frames';
      }

      const options: ExportOptions = {
        filename: defaultFilename,
        scale,
        quality: jpgQuality / 100,
        resolution,
        backgroundColor: null,
      };

      const result = await exportDesign({
        source: exportSource,
        format: selectedFormat,
        options,
        onProgress: setProgress,
      });

      downloadResult(result);
      setExportDone(true);
      toast.success(`Exported ${FORMAT_INFO[selectedFormat].label} successfully`);

      // Reset after delay
      setTimeout(() => {
        setExportDone(false);
        setSelectedFormat(null);
      }, 2000);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, source, pages, editablePdfBuilder, frameGenerator, defaultFilename, scale, jpgQuality, resolution, onCustomExport]);

  const reset = () => {
    setSelectedFormat(null);
    setProgress(0);
    setExportDone(false);
    setIsExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Format Selection */}
          {!selectedFormat && (
            <div className="space-y-4">
              {imageFormats.length > 0 && (
                <FormatSection title="Images" formats={imageFormats} onSelect={setSelectedFormat} />
              )}
              {documentFormats.length > 0 && (
                <FormatSection title="Documents" formats={documentFormats} onSelect={setSelectedFormat} />
              )}
              {videoFormats.length > 0 && (
                <FormatSection title="Video & Animation" formats={videoFormats} onSelect={setSelectedFormat} />
              )}
            </div>
          )}

          {/* Format Configuration */}
          {selectedFormat && !isExporting && !exportDone && (
            <div className="space-y-4">
              {/* Selected format header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {(() => { const Icon = getFormatIcon(selectedFormat); return <Icon className="h-5 w-5 text-primary" />; })()}
                  </div>
                  <div>
                    <p className="font-semibold">{FORMAT_INFO[selectedFormat].label}</p>
                    <p className="text-xs text-muted-foreground">{FORMAT_INFO[selectedFormat].description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scale options (raster) */}
              {showScaleOptions && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Quality</p>
                  <div className="flex gap-2">
                    {rasterScales.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScale(s.value)}
                        className={cn(
                          'flex-1 p-2.5 rounded-lg border text-center transition-all',
                          scale === s.value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        <p className="text-sm font-semibold">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution options (video/gif) */}
              {showResolutionOptions && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Resolution</p>
                  <div className="flex gap-2">
                    {videoResolutions.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setResolution(r.value as 512 | 720 | 1080)}
                        className={cn(
                          'flex-1 p-2.5 rounded-lg border text-center transition-all',
                          resolution === r.value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        <p className="text-sm font-semibold">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* JPG quality slider */}
              {showQualitySlider && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">Quality</p>
                    <p className="text-sm text-muted-foreground">{jpgQuality}%</p>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}

              {/* Export button */}
              <Button onClick={handleExport} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Export {FORMAT_INFO[selectedFormat].label}
              </Button>
            </div>
          )}

          {/* Exporting progress */}
          {isExporting && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm font-medium">Exporting {FORMAT_INFO[selectedFormat!].label}...</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {/* Export done */}
          {exportDone && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-semibold">Export Complete!</p>
              <p className="text-sm text-muted-foreground">Your file has been downloaded.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── FormatSection ───────────────────────────────────────────────────

function FormatSection({ title, formats, onSelect }: { title: string; formats: ExportFormat[]; onSelect: (f: ExportFormat) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {formats.map((format) => {
          const info = FORMAT_INFO[format];
          const Icon = getFormatIcon(format);
          return (
            <button
              key={format}
              onClick={() => onSelect(format)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border border-border',
                'hover:border-primary/40 hover:bg-muted/50 transition-all text-left group',
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{info.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{info.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
