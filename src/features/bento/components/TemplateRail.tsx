import { TEMPLATES } from '../templates';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Left rail — neutral wireframe thumbnails. No color blocks; the
 * previews communicate the *geometry* of each template, letting the
 * actual brand content speak through the artboard on the right.
 */
export function TemplateRail({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter((t) => t.name.toLowerCase().includes(q) || t.id.includes(q));
  }, [query]);

  return (
    <aside className="w-[220px] shrink-0 border-r bg-background flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Templates
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layouts"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5">
        {filtered.map((tpl) => {
          const active = tpl.id === selectedId;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={cn(
                'group w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
                active
                  ? 'bg-primary/8 text-foreground ring-1 ring-primary/30'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'shrink-0 w-11 h-11 rounded border bg-background p-[3px]',
                  active ? 'border-primary/40' : 'border-border group-hover:border-muted-foreground/40',
                )}
              >
                <div
                  className="w-full h-full grid"
                  style={{
                    gridTemplateColumns: `repeat(${tpl.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${tpl.rows}, 1fr)`,
                    gap: 1.5,
                  }}
                >
                  {tpl.tiles.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded-[1px]',
                        active ? 'bg-primary/50' : 'bg-muted-foreground/25 group-hover:bg-muted-foreground/45',
                      )}
                      style={{
                        gridRow: `${t.row} / span ${t.rowSpan}`,
                        gridColumn: `${t.col} / span ${t.colSpan}`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs font-medium truncate', active && 'text-foreground')}>
                  {tpl.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {tpl.cols}×{tpl.rows} · {tpl.tiles.length} tiles
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
