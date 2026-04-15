import { TEMPLATES } from '../templates';
import { cn } from '@/lib/utils';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Left rail showing thumbnails of each template. */
export function TemplateRail({ selectedId, onSelect }: Props) {
  return (
    <aside className="w-[180px] shrink-0 border-r bg-muted/20 overflow-y-auto">
      <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Templates
      </div>
      <div className="px-3 pb-6 space-y-2">
        {TEMPLATES.map((tpl) => {
          const active = tpl.id === selectedId;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={cn(
                'w-full text-left rounded-lg border-2 transition-all overflow-hidden',
                active ? 'border-primary shadow-sm' : 'border-transparent hover:border-muted-foreground/30',
              )}
            >
              <div className="aspect-square bg-white p-1.5">
                <div
                  className="w-full h-full grid bg-slate-100"
                  style={{
                    gridTemplateColumns: `repeat(${tpl.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${tpl.rows}, 1fr)`,
                    gap: 2,
                    padding: 2,
                  }}
                >
                  {tpl.tiles.map((t, i) => (
                    <div
                      key={t.id}
                      style={{
                        gridRow: `${t.row} / span ${t.rowSpan}`,
                        gridColumn: `${t.col} / span ${t.colSpan}`,
                        background: paletteFor(i),
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="px-2 py-1.5 text-[11px] font-medium truncate">{tpl.name}</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

const THUMB_COLORS = ['#6366F1', '#EC4899', '#F97316', '#10B981', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6'];
function paletteFor(i: number) {
  return THUMB_COLORS[i % THUMB_COLORS.length];
}
