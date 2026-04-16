import { Monitor, Sun, Moon, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PreviewBg = 'primary' | 'light' | 'dark' | 'favicon';

const CHIPS: Array<{ id: PreviewBg; label: string; icon: React.ReactNode }> = [
  { id: 'primary', label: 'Primary', icon: <Monitor className="w-3 h-3" /> },
  { id: 'light', label: 'Light BG', icon: <Sun className="w-3 h-3" /> },
  { id: 'dark', label: 'Dark BG', icon: <Moon className="w-3 h-3" /> },
  { id: 'favicon', label: 'Favicon', icon: <Bookmark className="w-3 h-3" /> },
];

interface PreviewChipsProps {
  value: PreviewBg;
  onChange: (next: PreviewBg) => void;
}

export function PreviewChips({ value, onChange }: PreviewChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="Preview mode"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 backdrop-blur p-1"
    >
      {CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={value === c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === c.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {c.icon}
          {c.label}
        </button>
      ))}
    </div>
  );
}
