/**
 * One generated output card — preview, hover actions, status overlay.
 * Minimal chrome so the brand-rendered template does the talking.
 */
import { useRef } from 'react';
import { OutputRenderer } from '../renderers/OutputRenderer';
import { resolveBrandTokens } from '../engine/brandTokens';
import { exportTemplateToPng } from '../lib/exportPng';
import { getOutputSpec } from '../registry/outputSpecs';
import type { GeneratedOutput } from '../services/types';
import type { Brand } from '@/shared/types/brand';
import { Loader2, Download, RotateCcw, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  output: GeneratedOutput;
  brand: Brand;
  onRegenerate: (output: GeneratedOutput) => void;
  onDelete: (output: GeneratedOutput) => void;
}

export function OutputCard({ output, brand, onRegenerate, onDelete }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const tokens = resolveBrandTokens(brand);
  const spec = getOutputSpec(output.outputType);

  const handleDownload = async () => {
    if (!frameRef.current) return;
    try {
      await exportTemplateToPng(frameRef.current, `${brand.slug}-${spec.id}`);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const isLoading = output.status === 'generating' || output.status === 'queued';
  const isFailed = output.status === 'failed';

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative bg-muted/30">
        <div ref={frameRef}>
          <OutputRenderer outputType={output.outputType} tokens={tokens} content={output.content} />
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div className="text-xs font-medium">Generation failed</div>
            <div className="line-clamp-2 text-[11px] text-muted-foreground">{output.error}</div>
            <button
              onClick={() => onRegenerate(output)}
              className="mt-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {/* Hover action toolbar */}
        {!isFailed && (
          <div className={cn(
            'absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-background/80 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity',
            'group-hover:opacity-100',
            isLoading && 'pointer-events-none',
          )}>
            <IconBtn label="Regenerate" onClick={() => onRegenerate(output)}><RotateCcw className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Download PNG" onClick={handleDownload}><Download className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Delete" onClick={() => onDelete(output)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
        )}
      </div>

      {/* Footer — minimal label */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-medium text-foreground/80">{spec.label}</span>
        {output.isAI && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-2.5 w-2.5" /> AI
          </span>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
    >
      {children}
    </button>
  );
}
