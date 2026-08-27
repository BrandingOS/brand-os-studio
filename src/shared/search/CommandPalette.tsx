/**
 * Universal Command Palette — ⌘K from anywhere.
 *
 * Part of BrandingOS v5. See docs/ux-redesign/BRANDOS-V5-PRD.md §3.2
 *
 * This is a self-contained palette built on cmdk. It pulls its index from
 * `useSearchIndex()` which composes brand list, templates, guidelines pages,
 * routes, and quick actions.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  Layout,
  Palette,
  FileText,
  Sparkles,
  Settings,
  PlusCircle,
  Compass,
  BookOpen,
  Image as ImageIcon,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchIndex, type SearchItem } from './searchIndex';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  brand: Palette,
  template: Layout,
  page: FileText,
  asset: ImageIcon,
  guideline: BookOpen,
  setting: Settings,
  action: Sparkles,
  ai: MessageSquare,
  route: Compass,
  create: PlusCircle,
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const items = useSearchIndex();

  // Group items by category for the palette
  const grouped = React.useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const it of items) {
      const k = it.group ?? 'Other';
      if (!groups[k]) groups[k] = [];
      groups[k].push(it);
    }
    return groups;
  }, [items]);

  const handleSelect = React.useCallback(
    (item: SearchItem) => {
      onOpenChange(false);
      setQuery('');
      // Track recently used in localStorage
      try {
        const recent: string[] = JSON.parse(localStorage.getItem('cmdk:recent') || '[]');
        const next = [item.id, ...recent.filter((id) => id !== item.id)].slice(0, 8);
        localStorage.setItem('cmdk:recent', JSON.stringify(next));
      } catch {
        /* noop */
      }
      if (item.action) {
        item.action();
      } else if (item.href) {
        navigate(item.href);
      }
    },
    [navigate, onOpenChange],
  );

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 px-4 pt-[12vh] backdrop-blur-md animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="BrandingOS command palette" className="w-full">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search brands, templates, assets, actions…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="px-5 py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>

            {Object.entries(grouped).map(([groupName, groupItems]) => (
              <Command.Group
                key={groupName}
                heading={groupName}
                className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
              >
                {groupItems.map((item) => {
                  const Icon = ICONS[item.icon ?? item.kind] ?? Compass;
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.title} ${item.subtitle ?? ''} ${item.keywords?.join(' ') ?? ''}`}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        'group mx-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground',
                        'aria-selected:bg-primary/10 aria-selected:text-foreground',
                        'data-[selected=true]:bg-primary/10',
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/30">
                        <Icon className="h-3.5 w-3.5 text-foreground/80" />
                      </span>
                      <span className="flex-1 truncate">
                        <span className="block truncate font-medium">{item.title}</span>
                        {item.subtitle && (
                          <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-aria-selected:opacity-100 group-data-[selected=true]:opacity-100" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5">↵</kbd> select
              </span>
            </div>
            <span className="font-medium tracking-wide">BrandingOS · ⌘K</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
