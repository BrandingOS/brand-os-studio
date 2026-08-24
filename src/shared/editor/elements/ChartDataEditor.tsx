/**
 * ChartDataEditor — the data panel behind every interactive chart.
 *
 * Two ways in, one ChartData out:
 * - **The grid**: labels, series names and numbers, editable in place;
 *   add/remove rows and series. Every keystroke flows straight to
 *   `onChange`, and the chart morphs live.
 * - **The smart box**: type or paste anything — "Jan 40, Feb 55", a
 *   spreadsheet selection, "$1.2k", "45%", Arabic digits — Apply runs
 *   `parseChartText` and replaces the dataset (and the detected format).
 *
 * Editor chrome in the FloatingToolbar's dark material; controlled, owns
 * no state beyond the smart box draft.
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { parseChartText, type ChartData, type ValueFormat } from './chartData';

interface ChartDataEditorProps {
  data: ChartData;
  onChange: (data: ChartData, format?: ValueFormat) => void;
}

const INPUT_CLASS =
  'w-full min-w-0 rounded-md bg-white/[0.06] border border-transparent px-2 py-1 text-[12px] ' +
  'text-white/85 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.09]';

export function ChartDataEditor({ data, onChange }: ChartDataEditorProps) {
  const [draft, setDraft] = useState('');
  const { labels, series } = data;

  const setLabel = (i: number, value: string) =>
    onChange({ ...data, labels: labels.map((l, j) => (j === i ? value : l)) });
  const setName = (s: number, value: string) =>
    onChange({ ...data, series: series.map((sr, j) => (j === s ? { ...sr, name: value } : sr)) });
  const setValue = (s: number, i: number, raw: string) => {
    const num = raw === '' || raw === '-' ? 0 : Number(raw);
    if (!Number.isFinite(num)) return;
    onChange({
      ...data,
      series: series.map((sr, j) =>
        j === s ? { ...sr, values: sr.values.map((v, k) => (k === i ? num : v)) } : sr,
      ),
    });
  };
  const addRow = () =>
    onChange({
      ...data,
      labels: [...labels, String(labels.length + 1)],
      series: series.map((sr) => ({ ...sr, values: [...sr.values, 0] })),
    });
  const removeRow = (i: number) =>
    onChange({
      ...data,
      labels: labels.filter((_, j) => j !== i),
      series: series.map((sr) => ({ ...sr, values: sr.values.filter((_, j) => j !== i) })),
    });
  const addSeries = () =>
    onChange({
      ...data,
      series: [...series, { name: `Series ${series.length + 1}`, values: labels.map(() => 0) }],
    });
  const removeSeries = (s: number) =>
    onChange({ ...data, series: series.filter((_, j) => j !== s) });
  const applyDraft = () => {
    const parsed = parseChartText(draft);
    if (!parsed) return;
    onChange(parsed.data, parsed.format);
    setDraft('');
  };

  return (
    <div
      data-editor-chrome="true"
      className="w-[320px] rounded-[14px] bg-[#242427] border border-white/[0.08] p-3 shadow-2xl"
    >
      <div className="px-0.5 pb-2 text-[12px] text-white/35">Chart data</div>

      <div
        className="grid gap-1 items-center"
        style={{ gridTemplateColumns: `minmax(64px, 1.1fr) repeat(${series.length}, 1fr) 20px` }}
      >
        <span className="px-1 text-[10px] uppercase tracking-wide text-white/30">Label</span>
        {series.map((sr, s) => (
          <span key={s} className="relative">
            <input
              aria-label={`Series name ${s + 1}`}
              className={`${INPUT_CLASS} pr-5 font-medium`}
              value={sr.name}
              onChange={(e) => setName(s, e.target.value)}
            />
            {series.length > 1 && (
              <button
                type="button"
                aria-label={`Remove series ${sr.name}`}
                onClick={() => removeSeries(s)}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-white/25 hover:text-white"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </span>
        ))}
        <span />

        {labels.map((label, i) => (
          <FragmentRow key={i}>
            <input
              aria-label={`Label ${i + 1}`}
              className={INPUT_CLASS}
              value={label}
              onChange={(e) => setLabel(i, e.target.value)}
            />
            {series.map((sr, s) => (
              <input
                key={s}
                aria-label={`${sr.name} value ${i + 1}`}
                type="number"
                className={`${INPUT_CLASS} text-right [font-variant-numeric:tabular-nums]`}
                value={sr.values[i] ?? 0}
                onChange={(e) => setValue(s, i, e.target.value)}
              />
            ))}
            <button
              type="button"
              aria-label={`Remove row ${i + 1}`}
              onClick={() => removeRow(i)}
              disabled={labels.length <= 2}
              className="p-0.5 text-white/25 hover:text-white disabled:opacity-30 disabled:hover:text-white/25"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </FragmentRow>
        ))}
      </div>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white transition-colors"
        >
          <Plus className="h-3 w-3" aria-hidden /> Add row
        </button>
        <button
          type="button"
          onClick={addSeries}
          className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white transition-colors"
        >
          <Plus className="h-3 w-3" aria-hidden /> Add series
        </button>
      </div>

      <div className="mt-3 border-t border-white/[0.07] pt-3">
        <div className="pb-1.5 text-[12px] text-white/35">Type or paste anything</div>
        <textarea
          aria-label="Smart data"
          rows={3}
          placeholder={'Jan 40, Feb 55 …\nor paste straight from a spreadsheet'}
          className={`${INPUT_CLASS} resize-none leading-relaxed placeholder:text-white/25`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={applyDraft}
          disabled={!draft.trim()}
          className="mt-1.5 rounded-[8px] bg-white/10 px-3 py-1 text-[12px] text-white/85 transition-colors hover:bg-white/[0.16] hover:text-white disabled:opacity-35"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/** Grid rows are flat children of one CSS grid — this exists only to key them. */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
