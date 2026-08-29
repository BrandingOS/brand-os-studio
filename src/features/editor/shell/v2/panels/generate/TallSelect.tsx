// TallSelect — the compact toolbar dropdown the Generate panel uses for
// Format and Model. Wraps the panel's existing shadcn Select (the one
// legacy import this panel already carried; not a new frozen-UI import).

import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';

export interface TallSelectItem {
  value: string;
  label: string;
  trailing?: string;
  renderIcon: (className: string) => React.ReactNode;
  /** false → dimmed + disabled, with `unavailableLabel` pill. */
  available?: boolean;
  /** Tooltip explaining why it's disabled (e.g. which key to add). */
  unavailableHint?: string;
  /** Renders a labelled divider ABOVE this item. */
  sectionLabel?: string;
}

export function TallSelect({
  caption, icon, value, valueLabel, valueHint, onChange, disabled, title, items, unavailableLabel = 'Soon',
}: {
  caption: string;
  icon: React.ReactNode;
  value: string;
  valueLabel: string;
  valueHint?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  title: string;
  items: TallSelectItem[];
  unavailableLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className="h-8 px-1.5 py-0 text-[11px] gap-1 [&>span]:line-clamp-none [&>svg]:opacity-50 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:shrink-0"
        title={`${title}${valueHint ? ` — ${valueHint}` : ''}`}
        aria-label={`${caption}: ${valueLabel}`}
        data-tall-select={caption.toLowerCase()}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <div className="shrink-0 flex items-center">{icon}</div>
          {/* The caption is rendered, not just announced. Two triggers both
              reading "Auto" and told apart by a 14px icon is not a label. */}
          <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{caption}:</span>
          <span className="font-medium truncate text-left" style={{ color: 'var(--text-primary)' }}>
            {valueLabel}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent data-workspace className="min-w-[250px]">
        {items.map((it) => {
          const off = it.available === false;
          return (
            <div key={`g-${it.value}`}>
            {it.sectionLabel ? (
              <div
                className="px-2 pt-2 pb-1 text-[9.5px] font-medium uppercase tracking-[0.09em]"
                style={{ color: 'var(--text-muted)' }}
              >
                {it.sectionLabel}
              </div>
            ) : null}
            <SelectItem
              key={it.value}
              value={it.value}
              disabled={off}
              title={off ? it.unavailableHint : undefined}
              className={`text-[12px] ${off ? 'opacity-45' : ''}`}
            >
              <div className="grid grid-cols-[16px_minmax(0,auto)_1fr] items-center gap-2 w-full py-0.5">
                <span className="inline-flex items-center justify-center">
                  {it.renderIcon('h-3.5 w-3.5 shrink-0')}
                </span>
                {it.trailing && !off ? (
                  <span className="font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {it.trailing}
                  </span>
                ) : <span />}
                <span
                  className="text-right truncate inline-flex items-center justify-end gap-1"
                  style={{ color: it.trailing && !off ? 'var(--text-muted)' : 'var(--text-primary)' }}
                >
                  {it.label}
                  {off ? (
                    <span
                      className="rounded-full px-1.5 py-[1px] text-[8.5px] font-medium uppercase tracking-wider"
                      style={{ background: 'color-mix(in oklab, var(--text-primary) 8%, transparent)', color: 'var(--text-muted)' }}
                    >
                      {unavailableLabel}
                    </span>
                  ) : null}
                </span>
              </div>
            </SelectItem>
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}
