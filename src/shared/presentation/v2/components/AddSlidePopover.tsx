/**
 * AddSlidePopover — picker for inserting a new slide in the v2 deck.
 *
 * Renders a `+ Slide` trigger that, when clicked, opens a popover with
 * a 3×5 grid of layout cards. Each card shows a tiny schematic icon,
 * the layout name, and a one-line description sourced from
 * `LAYOUT_CATALOG`. Picking a card calls `onPick(layoutId)` and closes.
 *
 * Why a hand-rolled SVG glyph per layout (instead of a lucide icon):
 * lucide doesn't ship "two-column", "three-stat", or "process" glyphs
 * that match what the layout actually paints, and a 24px schematic
 * tile reads better at this size than a generic file icon.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LAYOUT_CATALOG } from '../layouts/catalog';
import type { LayoutId } from '../types';
import { LayoutGlyph } from './LayoutGlyph';

export interface AddSlidePopoverProps {
  onPick: (layout: LayoutId) => void;
  /** Trigger label — defaults to "+ Slide". */
  label?: string;
  /** Visual style of the trigger. */
  variant?: 'inline' | 'pill';
  /** Side the popover opens to. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Optional className on the trigger. */
  className?: string;
}

export function AddSlidePopover({
  onPick,
  label = 'Slide',
  variant = 'inline',
  side = 'right',
}: AddSlidePopoverProps) {
  const [open, setOpen] = useState(false);

  const triggerStyle: React.CSSProperties =
    variant === 'pill'
      ? {
          height: 32,
          padding: '0 14px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background 0.15s ease',
        }
      : {
          width: '100%',
          height: 32,
          borderRadius: 8,
          border: '1px dashed var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={triggerStyle} title="Add a slide">
          <Plus className="w-3.5 h-3.5" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        sideOffset={8}
        className="w-[640px] max-h-[560px] overflow-y-auto p-3"
      >
        <div className="mb-2 px-1">
          <h3 className="text-[13px] font-semibold text-foreground">Add a slide</h3>
          <p className="text-[11px] text-muted-foreground">
            Pick a layout — your new slide will be inserted right after the
            current one.
          </p>
        </div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {LAYOUT_CATALOG.map((meta) => (
            <button
              key={meta.id}
              type="button"
              onClick={() => {
                onPick(meta.id);
                setOpen(false);
              }}
              className="text-left rounded-md border border-border bg-card hover:bg-accent hover:border-foreground/20 transition-colors p-2 flex flex-col gap-1.5 group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            >
              <div
                className="rounded-sm border border-border/60 bg-muted/40 group-hover:bg-background/80 transition-colors"
                style={{ aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <LayoutGlyph layout={meta.id} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-semibold text-foreground leading-tight">
                  {meta.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                  {meta.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AddSlidePopover;
