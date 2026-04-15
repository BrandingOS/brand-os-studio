/**
 * Grouped checkbox grid of every output type the engine can render.
 * Grouped by category so users see the breadth of "one brand → many surfaces".
 */
import { OUTPUT_SPEC_LIST, CATEGORY_LABEL, type OutputCategory, type OutputTypeId } from '../registry/outputSpecs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  selected: Set<OutputTypeId>;
  onToggle: (id: OutputTypeId) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const ORDER: OutputCategory[] = ['social', 'web', 'guideline', 'mockup', 'presentation', 'ad'];

export function OutputTypePicker({ selected, onToggle, onSelectAll, onClearAll }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold">What should we generate?</div>
          <div className="text-xs text-muted-foreground mt-0.5">All outputs render inside the same brand system.</div>
        </div>
        <div className="flex gap-1.5 text-xs">
          <button onClick={onSelectAll} className="text-primary hover:underline">All</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={onClearAll} className="text-muted-foreground hover:text-foreground">None</button>
        </div>
      </div>

      <div className="space-y-5">
        {ORDER.map((cat) => {
          const items = OUTPUT_SPEC_LIST.filter((s) => s.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{CATEGORY_LABEL[cat]}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((spec) => {
                  const active = selected.has(spec.id);
                  const Icon = spec.icon;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => onToggle(spec.id)}
                      className={cn(
                        'group flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                        active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/30 hover:bg-muted/50',
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-foreground/10',
                      )}>
                        {active ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-tight">{spec.label}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-snug">{spec.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
