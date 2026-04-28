import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { useBrandAssistant } from './BrandAssistantProvider';
import { cn } from '@/lib/utils';

// Step 5/7 fix 7 — default to a 48×48 icon-only FAB so the
// assistant doesn't eat workspace real estate. Hovering expands it
// to a full pill (icon + "Brand Assistant" label + ⌘J kbd) so the
// affordance stays discoverable. Click on either form opens the
// drawer. The user's optional "keep expanded" preference persists
// via localStorage; the default is collapsed.

const PIN_KEY = 'brandos.assistant.pinExpanded';

function readInitialPin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function AssistantTrigger() {
  const { open, setOpen } = useBrandAssistant();
  const [pinExpanded] = React.useState<boolean>(readInitialPin);
  const [hovering, setHovering] = React.useState(false);
  if (open) return null;
  const expanded = pinExpanded || hovering;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      data-assistant-trigger
      data-assistant-expanded={expanded ? 'true' : 'false'}
      className={cn(
        'fixed bottom-6 right-6 z-40 group flex items-center gap-2 rounded-full',
        'border border-border bg-card/90 backdrop-blur-xl shadow-lg',
        'transition-all duration-300 hover:-translate-y-0.5',
        'animate-fade-in',
        expanded ? 'px-4 py-3' : 'h-12 w-12 p-0 justify-center',
      )}
      aria-label="Open Brand Assistant"
      title="Brand Assistant (⌘J)"
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ripple-slow" />
      </span>
      {expanded ? (
        <>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            Brand Assistant
          </span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘J
          </kbd>
        </>
      ) : null}
    </button>
  );
}
