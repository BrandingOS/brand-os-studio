import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Edit3, Plus } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  brand: Brand;
  kind: 'updated' | 'created';
  ts: number;
}

export function ActivityFeed({ brands }: { brands: Brand[] }) {
  const navigate = useNavigate();
  const items = React.useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];
    for (const b of brands) {
      const updated = new Date(b.updatedAt).getTime();
      const created = new Date(b.createdAt).getTime();
      out.push({ id: `${b.id}:u`, brand: b, kind: 'updated', ts: updated || 0 });
      if (created && created !== updated) {
        out.push({ id: `${b.id}:c`, brand: b, kind: 'created', ts: created });
      }
    }
    return out.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [brands]);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">Activity</h2>
          <p className="text-sm text-muted-foreground">What changed recently</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((item, i) => {
          const Icon = item.kind === 'updated' ? Edit3 : Plus;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => navigate(`/b/${item.brand.slug}`)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/30 ${
                i !== items.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 leading-tight">
                <div className="text-sm text-foreground">
                  <span className="font-semibold">{item.brand.name}</span>{' '}
                  <span className="text-muted-foreground">{item.kind === 'updated' ? 'was updated' : 'was created'}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {item.ts ? formatDistanceToNow(new Date(item.ts), { addSuffix: true }) : 'recently'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
