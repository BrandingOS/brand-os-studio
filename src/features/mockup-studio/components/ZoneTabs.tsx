/**
 * ZoneTabs — multi-zone selector that shows under the toolbar when a
 * template has more than one design zone. Click a tab to focus it;
 * the selection flows through to the properties sidebar and the
 * canvas overlay highlight.
 */

import { cn } from '@/lib/utils';

import { useMockupStore } from '../state/mockupStore';

export function ZoneTabs() {
  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const selection = useMockupStore((s) => s.selection);
  const setSelection = useMockupStore((s) => s.setSelection);

  if (!template || !mockup) return null;
  if (template.zones.length <= 1) return null;

  const activeId =
    selection?.kind === 'zone' ? selection.id : template.zones[0]?.id;

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-border/60 bg-background/95 p-1 shadow-sm backdrop-blur">
      <span className="px-2 pb-1 pt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        Zones
      </span>
      {template.zones.map((zone) => {
        const active = zone.id === activeId;
        const state = mockup.zones[zone.id];
        const hasDesign = !!state?.designUrl;
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => setSelection({ kind: 'zone', id: zone.id })}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1 text-left text-[11px] transition-colors',
              active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                hasDesign ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
            {zone.label}
          </button>
        );
      })}
    </div>
  );
}
