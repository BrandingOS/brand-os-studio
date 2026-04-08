/**
 * BlockPicker — popover/modal that lets the user choose a block type to insert.
 */
import * as React from 'react';
import { X } from 'lucide-react';
import { BLOCK_REGISTRY, BLOCK_GROUPS } from './registry';
import type { BlockType } from './types';

interface BlockPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: BlockType) => void;
}

export function BlockPicker({ open, onClose, onPick }: BlockPickerProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-background/70 px-4 pt-[10vh] backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Add a block</h3>
            <p className="text-[11px] text-muted-foreground">Choose a content block to insert</p>
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

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {BLOCK_GROUPS.map((group) => {
            const items = Object.values(BLOCK_REGISTRY).filter((b) => b.group === group.id);
            return (
              <section key={group.id} className="mb-6 last:mb-0">
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </h4>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {items.map((meta) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={meta.type}
                        type="button"
                        onClick={() => {
                          onPick(meta.type);
                          onClose();
                        }}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                          <Icon className="h-4 w-4 text-foreground" />
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block text-sm font-semibold text-foreground">{meta.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{meta.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
