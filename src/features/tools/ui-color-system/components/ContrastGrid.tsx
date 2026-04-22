/**
 * ContrastGrid — role-aware contrast testing.
 *
 * Instead of rendering every swatch-vs-swatch combo (which is noisy and
 * meaningless), we test the contrasts that actually appear in a UI:
 * text-on-surface, button pairs, on-color pairs, border-on-surface,
 * focus-on-surface, and every chart color against both surface and
 * canvas. Users can toggle WCAG vs APCA and filter pass/fail.
 */
import { useMemo, useState } from 'react';
import { Check, X, Filter } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  apcaContrast,
  wcagContrast,
  type ContrastStandard,
  type PaletteSystem,
} from '@/lib/color-engine';

export interface ContrastGridProps {
  palette: PaletteSystem;
  standard: ContrastStandard;
  onStandardChange: (std: ContrastStandard) => void;
  apcaAvailable: boolean;
}

interface Pair {
  id: string;
  group: string;
  label: string;
  fg: string;
  bg: string;
  /** 'body' = 4.5 / APCA 75; 'large' = 3.0 / APCA 60 */
  target: 'body' | 'large';
}

export function ContrastGrid({
  palette,
  standard,
  onStandardChange,
  apcaAvailable,
}: ContrastGridProps) {
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');

  const pairs = useMemo<Pair[]>(() => {
    const t = palette.semanticTokens;
    const r = palette.roles;
    const out: Pair[] = [
      { id: 't-primary-surface', group: 'Text', label: 'Primary text on surface', fg: t.textPrimary, bg: t.surface, target: 'body' },
      { id: 't-secondary-surface', group: 'Text', label: 'Secondary text on surface', fg: t.textSecondary, bg: t.surface, target: 'body' },
      { id: 't-muted-surface', group: 'Text', label: 'Muted text on surface', fg: t.textMuted, bg: t.surface, target: 'large' },
      { id: 't-primary-canvas', group: 'Text', label: 'Primary text on canvas', fg: t.textPrimary, bg: t.canvas, target: 'body' },
      { id: 'btn-primary', group: 'Buttons', label: 'Primary button', fg: t.buttonPrimaryFg, bg: t.buttonPrimaryBg, target: 'body' },
      { id: 'btn-primary-hover', group: 'Buttons', label: 'Primary button — hover', fg: t.buttonPrimaryFg, bg: t.buttonPrimaryHover, target: 'body' },
      { id: 'btn-secondary', group: 'Buttons', label: 'Secondary button', fg: t.buttonSecondaryFg, bg: t.buttonSecondaryBg, target: 'body' },
      { id: 'border-surface', group: 'Surface', label: 'Border against surface', fg: t.border, bg: t.surface, target: 'large' },
      { id: 'focus-surface', group: 'Surface', label: 'Focus ring against surface', fg: t.focusRing, bg: t.surface, target: 'large' },
    ];
    if (r.success) out.push({ id: 'on-success', group: 'Semantic', label: 'Text on success', fg: t.onSuccess, bg: r.success.shades[600].hex, target: 'body' });
    if (r.warning) out.push({ id: 'on-warning', group: 'Semantic', label: 'Text on warning', fg: t.onWarning, bg: r.warning.shades[500].hex, target: 'body' });
    if (r.error) out.push({ id: 'on-error', group: 'Semantic', label: 'Text on error', fg: t.onError, bg: r.error.shades[600].hex, target: 'body' });
    // Chart colors
    const charts = [t.chart1, t.chart2, t.chart3, t.chart4, t.chart5, t.chart6];
    charts.forEach((hex, i) => {
      out.push({ id: `chart-${i + 1}`, group: 'Chart', label: `Chart ${i + 1} on surface`, fg: hex, bg: t.surface, target: 'large' });
    });
    return out;
  }, [palette]);

  const scored = pairs.map((p) => {
    const ratio = wcagContrast(p.fg, p.bg);
    const lc = apcaContrast(p.fg, p.bg);
    const pass =
      standard === 'WCAG'
        ? p.target === 'body'
          ? ratio >= 4.5
          : ratio >= 3
        : p.target === 'body'
          ? Math.abs(lc) >= 75
          : Math.abs(lc) >= 60;
    return { ...p, ratio, lc, pass };
  });

  const filtered = scored.filter((p) =>
    filter === 'all' ? true : filter === 'pass' ? p.pass : !p.pass,
  );

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof scored>();
    for (const p of filtered) {
      const arr = byGroup.get(p.group) ?? [];
      arr.push(p);
      byGroup.set(p.group, arr);
    }
    return Array.from(byGroup.entries());
  }, [filtered]);

  const passCount = scored.filter((p) => p.pass).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Filter</span>
          </div>
          <div className="flex items-center rounded-md border bg-background p-0.5 text-xs">
            {(['all', 'pass', 'fail'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded px-2 py-1 capitalize',
                  filter === f && 'bg-muted',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="ml-2 text-xs text-muted-foreground">
            {passCount}/{scored.length} passing
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Standard</span>
          <Select
            value={standard}
            onValueChange={(v) => onStandardChange(v as ContrastStandard)}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WCAG">WCAG 2</SelectItem>
              <SelectItem value="APCA" disabled={!apcaAvailable}>
                APCA {apcaAvailable ? '' : '(Pro)'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(([group, items]) => (
          <div key={group} className="rounded-xl border bg-card p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h4>
            <ul className="flex flex-col gap-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <div
                    className="flex h-10 w-16 shrink-0 items-center justify-center rounded"
                    style={{ background: p.bg, color: p.fg }}
                  >
                    <span className="text-xs font-semibold">Aa</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{p.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {standard === 'WCAG'
                        ? `${p.ratio.toFixed(2)}:1`
                        : `Lc ${p.lc.toFixed(1)}`}
                      {' · '}
                      target {p.target}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                      p.pass
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    )}
                  >
                    {p.pass ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
