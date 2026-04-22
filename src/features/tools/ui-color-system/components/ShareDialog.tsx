/**
 * ShareDialog — one-tap sharing for the current palette.
 *
 * Encodes the palette into a URL fragment and surfaces three paths:
 * copy link, open in new tab, and save for later. The encoded payload
 * is small enough (under 4KB) to fit in clipboard-friendly URLs.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useShareUrl } from '../hooks/usePaletteShareUrl';
import type { PaletteSystem } from '@/lib/color-engine';
import type { Theme } from '@/lib/color-engine';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  palette: PaletteSystem;
  theme: Theme;
  canSave?: boolean;
  onSave?: () => void;
}

export function ShareDialog({ open, onOpenChange, palette, theme, canSave, onSave }: ShareDialogProps) {
  const url = useShareUrl(palette, theme);
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* blocked */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this palette</DialogTitle>
          <DialogDescription>
            Anyone with the link will see the exact palette you've built.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button onClick={doCopy} size="icon" variant="outline" aria-label="Copy link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div
              className="h-8 w-8 rounded"
              style={{ background: palette.roles.primary.shades[500].hex }}
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{palette.name}</p>
              <p className="font-mono text-[11px]">{palette.roles.primary.inputHex}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center gap-2 sm:justify-between">
          {canSave && (
            <Button variant="outline" onClick={onSave} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save to my palettes
            </Button>
          )}
          <Button asChild className="gap-1.5">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open link
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
