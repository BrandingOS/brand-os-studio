/**
 * SavedPalettesDrawer — right-side drawer of locally-saved palettes.
 *
 * Until the palettes table is wired in Supabase this reads/writes
 * localStorage via useSavedPalettes. When the hook is swapped out the
 * drawer remains unchanged.
 */
import { Folder, Trash2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useSavedPalettes } from '../hooks/useSavedPalettes';
import type { PaletteSystem } from '@/lib/color-engine';

export interface SavedPalettesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (palette: PaletteSystem) => void;
}

export function SavedPalettesDrawer({ open, onOpenChange, onLoad }: SavedPalettesDrawerProps) {
  const { palettes, remove, load } = useSavedPalettes();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            My palettes
          </SheetTitle>
          <SheetDescription>
            Locally saved on this device. Sign up to sync across devices.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-2">
          {palettes.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No palettes saved yet. Build one and click "Save".
            </p>
          )}
          {palettes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const full = load(p.id);
                if (full) onLoad(full);
              }}
              className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/60"
            >
              <div
                className="h-10 w-10 rounded-md border"
                style={{ background: p.primary }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.seed} ·{' '}
                  {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(p.id);
                }}
                aria-label={`Remove ${p.name}`}
                className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
