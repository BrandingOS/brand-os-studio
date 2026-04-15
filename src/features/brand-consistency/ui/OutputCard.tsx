/**
 * One generated output, rendered live. Includes the in-brand template,
 * status pill, regenerate, download, delete actions.
 */
import { useRef } from 'react';
import { OutputRenderer } from '../renderers/OutputRenderer';
import { resolveBrandTokens } from '../engine/brandTokens';
import { exportTemplateToPng } from '../lib/exportPng';
import { getOutputSpec } from '../registry/outputSpecs';
import type { GeneratedOutput } from '../services/types';
import type { Brand } from '@/shared/types/brand';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RotateCcw, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  output: GeneratedOutput;
  brand: Brand;
  onRegenerate: (output: GeneratedOutput) => void;
  onDelete: (output: GeneratedOutput) => void;
}

export function OutputCard({ output, brand, onRegenerate, onDelete }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Always use the LIVE brand for re-rendering (so token edits propagate),
  // but the snapshot is what the orchestrator persisted.
  const tokens = resolveBrandTokens(brand);
  const spec = getOutputSpec(output.outputType);
  const Icon = spec.icon;

  const handleDownload = async () => {
    if (!frameRef.current) return;
    try {
      await exportTemplateToPng(frameRef.current, `${brand.slug}-${spec.id}`);
      toast.success('Downloaded');
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Download failed');
    }
  };

  const isLoading = output.status === 'generating' || output.status === 'queued';
  const isFailed = output.status === 'failed';

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative bg-muted/40">
        <div ref={frameRef}>
          <OutputRenderer outputType={output.outputType} tokens={tokens} content={output.content} />
        </div>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-sm font-semibold">Generation failed</div>
            <div className="text-xs text-muted-foreground line-clamp-3">{output.error}</div>
            <Button size="sm" variant="outline" onClick={() => onRegenerate(output)} className="mt-2">Try again</Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 border-t">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{spec.label}</span>
          {output.isAI && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5" /> AI
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRegenerate(output)} disabled={isLoading} title="Regenerate">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} disabled={isLoading || isFailed} title="Download PNG">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(output)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
