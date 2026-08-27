/**
 * The smart parser is the "type anything" contract — every input shape it
 * promises to read is pinned here, because a regression means someone's
 * pasted spreadsheet silently becomes a wrong chart.
 */
import { describe, expect, it } from 'vitest';
import {
  displayLabel,
  formatValue,
  niceScale,
  normalizeDigits,
  parseChartText,
  parseNumberToken,
} from './chartData';

describe('displayLabel', () => {
  it('abbreviates month names however they were typed', () => {
    expect(displayLabel('January')).toBe('Jan');
    expect(displayLabel('february')).toBe('Feb');
    expect(displayLabel('SEPT')).toBe('Sep');
    expect(displayLabel('Sep.')).toBe('Sep');
    expect(displayLabel('May')).toBe('May');
  });

  it('leaves everything else untouched', () => {
    expect(displayLabel('Q1')).toBe('Q1');
    expect(displayLabel('Week 1')).toBe('Week 1');
    expect(displayLabel('March 2024')).toBe('March 2024');
    expect(displayLabel('يناير')).toBe('يناير');
  });
});

describe('parseNumberToken', () => {
  it('reads plain, signed and wrapped negatives', () => {
    expect(parseNumberToken('42')!.value).toBe(42);
    expect(parseNumberToken('-15')!.value).toBe(-15);
    expect(parseNumberToken('+8')!.value).toBe(8);
    expect(parseNumberToken('(15)')!.value).toBe(-15);
  });

  it('reads currency, percent and compact suffixes', () => {
    expect(parseNumberToken('$1,200')).toEqual({ value: 1200, prefix: '$', percent: false });
    expect(parseNumberToken('45%')!.percent).toBe(true);
    expect(parseNumberToken('1.2k')!.value).toBe(1200);
    expect(parseNumberToken('3M')!.value).toBe(3_000_000);
    expect(parseNumberToken('-$15')!.value).toBe(-15);
    expect(parseNumberToken('-$15')!.prefix).toBe('$');
  });

  it('reads Arabic-Indic digits and the Arabic percent sign', () => {
    expect(parseNumberToken('٤٠')!.value).toBe(40);
    expect(parseNumberToken('٤٥٪')!.percent).toBe(true);
    expect(parseNumberToken('٤٥٪')!.value).toBe(45);
  });

  it('refuses words', () => {
    expect(parseNumberToken('Jan')).toBeNull();
    expect(parseNumberToken('')).toBeNull();
  });
});

describe('parseChartText', () => {
  it('reads label-value lines', () => {
    const parsed = parseChartText('Jan 40\nFeb 55')!;
    expect(parsed.data.labels).toEqual(['Jan', 'Feb']);
    expect(parsed.data.series[0].values).toEqual([40, 55]);
  });

  it('reads a comma-separated one-liner as rows', () => {
    const parsed = parseChartText('Jan 40, Feb 55, Mar 62')!;
    expect(parsed.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(parsed.data.series[0].values).toEqual([40, 55, 62]);
  });

  it('reads bare numbers and invents labels', () => {
    const parsed = parseChartText('40 55 62')!;
    expect(parsed.data.labels).toEqual(['1']);
    expect(parsed.data.series).toHaveLength(3);
  });

  it('reads a CSV block with a header row into named series', () => {
    const parsed = parseChartText('Month,Sales,Profit\nJan,40,25\nFeb,55,30')!;
    expect(parsed.data.labels).toEqual(['Jan', 'Feb']);
    expect(parsed.data.series.map((s) => s.name)).toEqual(['Sales', 'Profit']);
    expect(parsed.data.series[1].values).toEqual([25, 30]);
  });

  it('reads a tab-separated spreadsheet paste', () => {
    const parsed = parseChartText('Q1\t120\t80\nQ2\t90\t60')!;
    expect(parsed.data.labels).toEqual(['Q1', 'Q2']);
    expect(parsed.data.series[0].values).toEqual([120, 90]);
    expect(parsed.data.series[1].values).toEqual([80, 60]);
  });

  it('strips a trailing colon from labels', () => {
    const parsed = parseChartText('Q1: 120\nQ2: 90')!;
    expect(parsed.data.labels).toEqual(['Q1', 'Q2']);
  });

  it('detects a currency prefix and a percent suffix', () => {
    expect(parseChartText('Jan $1,200\nFeb $900')!.format).toEqual({ prefix: '$' });
    expect(parseChartText('Jan 45%\nFeb 30%')!.format).toEqual({ suffix: '%' });
  });

  it('reads Arabic digits and the Arabic comma', () => {
    const parsed = parseChartText('يناير ٤٠، فبراير ٥٥')!;
    expect(parsed.data.labels).toEqual(['يناير', 'فبراير']);
    expect(parsed.data.series[0].values).toEqual([40, 55]);
  });

  it('pads a short row with zeros instead of misaligning columns', () => {
    const parsed = parseChartText('Jan 40 25\nFeb 55')!;
    expect(parsed.data.series[1].values).toEqual([25, 0]);
  });

  it('answers null for prose with no numbers', () => {
    expect(parseChartText('hello there')).toBeNull();
    expect(parseChartText('')).toBeNull();
  });
});

describe('formatValue', () => {
  it('compacts thousands, millions and billions', () => {
    expect(formatValue(1200)).toBe('1.2k');
    expect(formatValue(3_400_000)).toBe('3.4M');
    expect(formatValue(2_000_000_000)).toBe('2B');
    expect(formatValue(-1500)).toBe('-1.5k');
    expect(formatValue(42)).toBe('42');
    expect(formatValue(7.25)).toBe('7.3');
  });

  it('applies the detected format symbols', () => {
    expect(formatValue(1200, { prefix: '$' })).toBe('$1.2k');
    expect(formatValue(45, { suffix: '%' })).toBe('45%');
  });
});

describe('niceScale', () => {
  it('lands on human steps and covers the max', () => {
    const s = niceScale(95);
    expect(s.max).toBeGreaterThanOrEqual(95);
    expect(s.ticks[s.ticks.length - 1]).toBe(s.max);
    expect(s.ticks.length).toBeLessThanOrEqual(5);
    expect(niceScale(7).ticks).toContain(2);
  });

  it('survives zero and negative maxima', () => {
    expect(niceScale(0).max).toBe(1);
    expect(niceScale(-5).ticks).toEqual([]);
  });
});

describe('normalizeDigits', () => {
  it('maps both Arabic digit ranges to ASCII', () => {
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(normalizeDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });
});
