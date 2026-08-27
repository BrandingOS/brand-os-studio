/**
 * Chart data model + the smart parser.
 *
 * One shape feeds every chart: `ChartData` — labels down the side, one or
 * more named series of numbers. The parser is the "type anything" surface:
 * it reads lines ("Jan 40"), inline lists ("Jan 40, Feb 55"), spreadsheet
 * pastes (tab-separated, with a header row), currency and percent tokens
 * ("$1,200", "45%"), compact suffixes ("1.2k", "3M"), negatives ("-15",
 * "(15)") and Arabic-Indic digits/separators (٤٠، ٤٥٪) — and answers with
 * data plus the value format it detected. Pure logic, unit-tested.
 */

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
  /** What the label column is CALLED ("Month") — the axis-name pill. */
  labelName?: string;
}

/** What detected symbols mean for rendering: "$" prefix, "%" suffix.
 *  `full` prints the whole number (1,200) instead of compacting (1.2k). */
export interface ValueFormat {
  prefix?: string;
  suffix?: string;
  full?: boolean;
}

/* ── Normalization ──────────────────────────────────────────────────── */

/** Arabic-Indic (٠-٩) and Extended (۰-۹) digits → ASCII. */
export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (ch) => {
    const c = ch.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

/* ── Number tokens ──────────────────────────────────────────────────── */

const MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** "$1,200" · "45%" · "1.2k" · "-15" · "(15)" · "٤٥٪" → value + hints. */
export function parseNumberToken(
  raw: string,
): { value: number; prefix?: string; percent?: boolean } | null {
  let s = normalizeDigits(raw.trim());
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  let prefix: string | undefined;
  const takeCurrency = () => {
    const m = s.match(/^([$€£¥])/);
    if (m) {
      prefix = m[1];
      s = s.slice(1);
    }
  };
  takeCurrency();
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  takeCurrency(); // "-$15"
  let percent = false;
  if (/[%٪]$/.test(s)) {
    percent = true;
    s = s.slice(0, -1);
  }
  let mult = 1;
  const suffix = s.match(/[kKmMbB]$/);
  if (suffix) {
    mult = MULTIPLIERS[suffix[0].toLowerCase()];
    s = s.slice(0, -1);
  }
  // Thousands separators out (incl. Arabic ٬), Arabic decimal ٫ → "."
  s = s.replace(/[,٬\s]/g, '').replace(/٫/g, '.');
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const value = parseFloat(s) * mult * (neg ? -1 : 1);
  return Number.isFinite(value) ? { value, prefix, percent } : null;
}

/* ── The smart parser ───────────────────────────────────────────────── */

export function parseChartText(
  text: string,
): { data: ChartData; format: ValueFormat } | null {
  const norm = normalizeDigits(text);
  let lines = norm
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  // "Jan 40, Feb 55" — a single line whose commas separate ROWS, told apart
  // because every chunk carries its own number.
  if (lines.length === 1 && /[,،]/.test(lines[0])) {
    const chunks = lines[0]
      .split(/[,،]/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (chunks.length > 1 && chunks.every((c) => /\d/.test(c))) lines = chunks;
  }

  interface Row {
    label?: string;
    values: number[];
  }
  const rows: Row[] = [];
  let headers: string[] | null = null;
  let prefix: string | undefined;
  let percentCount = 0;
  let numberCount = 0;

  lines.forEach((line, index) => {
    const separator = line.includes('\t')
      ? /\t/
      : /[,،]/.test(line)
        ? /[,،]/
        : /\s+/;
    const tokens = line
      .split(separator)
      .map((t) => t.trim())
      .filter(Boolean);
    const values: number[] = [];
    const words: string[] = [];
    for (const token of tokens) {
      const parsed = parseNumberToken(token.replace(/:$/, ''));
      if (parsed) {
        values.push(parsed.value);
        if (parsed.prefix && !prefix) prefix = parsed.prefix;
        if (parsed.percent) percentCount++;
        numberCount++;
      } else {
        words.push(token.replace(/:$/, ''));
      }
    }
    if (values.length === 0) {
      // A wordy first line over numeric rows is a header ("Month Sales Profit").
      if (index === 0 && tokens.length > 1) headers = tokens;
      return;
    }
    rows.push({ label: words.join(' ') || undefined, values });
  });

  if (rows.length === 0) return null;

  const seriesCount = Math.max(...rows.map((r) => r.values.length));
  const labels = rows.map((r, i) => r.label ?? String(i + 1));
  const headerList: string[] | null = headers;
  const names = headerList
    ? headerList.length > seriesCount
      ? headerList.slice(headerList.length - seriesCount)
      : headerList
    : [];
  const labelName =
    headerList && headerList.length > seriesCount ? headerList[0] : undefined;
  const series: ChartSeries[] = Array.from({ length: seriesCount }, (_, s) => ({
    name: names[s] ?? (seriesCount > 1 ? `Series ${s + 1}` : 'Values'),
    values: rows.map((r) => r.values[s] ?? 0),
  }));
  const format: ValueFormat = {};
  if (prefix) format.prefix = prefix;
  if (numberCount > 0 && percentCount >= numberCount / 2) format.suffix = '%';
  return { data: { labels, series, ...(labelName ? { labelName } : null) }, format };
}

/* ── Display ────────────────────────────────────────────────────────── */

/** Compact display: 1200 → "1.2k", 3400000 → "3.4M", with format symbols. */
export function formatValue(value: number, format?: ValueFormat): string {
  const abs = Math.abs(value);
  const trim = (n: number) =>
    String(Math.abs(n) < 10 ? Math.round(n * 10) / 10 : Math.round(n));
  let num: string;
  if (format?.full) {
    num = value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  } else if (abs >= 1e9) num = `${trim(value / 1e9)}B`;
  else if (abs >= 1e6) num = `${trim(value / 1e6)}M`;
  else if (abs >= 1e3) num = `${trim(value / 1e3)}k`;
  else num = trim(value);
  return `${format?.prefix ?? ''}${num}${format?.suffix ?? ''}`;
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * How a category label is PRINTED on a chart: month names always render
 * as their three-letter abbreviation ("January" → "Jan") whatever the
 * user stored (owner request 2026-08-22). Display-only — the data keeps
 * the full name; anything that isn't a month passes through untouched.
 */
export function displayLabel(label: string): string {
  const low = label.trim().toLowerCase().replace(/\.$/, '');
  if (low.length >= 3) {
    for (const m of MONTHS) {
      if (m === low || m.startsWith(low)) {
        return m.charAt(0).toUpperCase() + m.slice(1, 3);
      }
    }
  }
  return label;
}

/** Axis scale with human tick steps (1 / 2 / 2.5 / 5 × 10ⁿ). */
export function niceScale(
  max: number,
  tickCount = 4,
): { max: number; step: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, step: 1, ticks: [] };
  const rough = max / tickCount;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  let step = pow * 10;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (max / (pow * m) <= tickCount) {
      step = pow * m;
      break;
    }
  }
  const niceMax = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let t = step; t <= niceMax + 1e-9; t += step) {
    ticks.push(Math.round(t * 1000) / 1000);
  }
  return { max: niceMax, step, ticks };
}
