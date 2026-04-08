import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { useBrandAssistant } from './BrandAssistantProvider';
import { cn } from '@/lib/utils';

export function AssistantTrigger() {
  const { open, setOpen } = useBrandAssistant();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'fixed bottom-6 right-6 z-40 group flex items-center gap-2 rounded-full',
        'border border-border bg-card/90 px-4 py-3 shadow-2xl backdrop-blur-xl',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.6)]',
        'animate-fade-in',
      )}
      aria-label="Open Brand Assistant"
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ripple-slow" />
      </span>
      <span className="hidden text-sm font-medium text-foreground sm:inline">Brand Assistant</span>
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
        ⌘J
      </kbd>
    </button>
  );
}
