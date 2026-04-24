/**
 * ExportButton — dropdown with PNG 1x/2x export for the current mockup.
 */

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import { downloadBlob, exportMockup } from '../engine/export';
import { useMockupStore } from '../state/mockupStore';

export function ExportButton() {
  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const [busy, setBusy] = useState(false);

  const run = async (scale: 1 | 2 | 4, format: 'png' | 'jpeg') => {
    if (!template || !mockup) return;
    setBusy(true);
    try {
      const blob = await exportMockup(template, mockup, { scale, format });
      const ext = format === 'png' ? 'png' : 'jpg';
      const filename = `${template.id}-${scale}x.${ext}`;
      downloadBlob(blob, filename);
      toast.success('Export ready', { description: filename });
    } catch (err) {
      console.error(err);
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={!template || !mockup || busy}>
          {busy ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => run(1, 'png')}>
          <span className="flex-1">PNG · 1x</span>
          <span className="text-[10px] text-muted-foreground">web</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(2, 'png')}>
          <span className="flex-1">PNG · 2x</span>
          <span className="text-[10px] text-muted-foreground">retina</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(4, 'png')}>
          <span className="flex-1">PNG · 4x</span>
          <span className="text-[10px] text-muted-foreground">print</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(1, 'jpeg')}>JPG · 1x</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(2, 'jpeg')}>JPG · 2x</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
