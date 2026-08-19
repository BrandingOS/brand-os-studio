/**
 * The numbers an invoice works out for itself.
 *
 * These are DERIVED and never stored. That is the whole point: in the
 * designs as authored, "Total · $8,715" was a string, so editing a price
 * left the total saying whatever it had always said. A total that cannot
 * disagree with its line items is the difference between structured
 * content and text that looks like structured content.
 */
import type { InvoiceContent, InvoiceLineItem } from './kinds';

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  /** Subtotal less discount — what tax is charged on. */
  taxable: number;
  tax: number;
  total: number;
};

export function lineItemTotal(item: InvoiceLineItem): number {
  const qty = Number.isFinite(item.qty) ? item.qty : 0;
  const price = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
  return round2(qty * price);
}

export function invoiceTotals(content: InvoiceContent): InvoiceTotals {
  const subtotal = round2(
    content.lineItems.reduce((sum, item) => sum + lineItemTotal(item), 0),
  );
  const discount = round2(subtotal * (pct(content.discountRate) / 100));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * (pct(content.taxRate) / 100));
  return { subtotal, discount, taxable, tax, total: round2(taxable + tax) };
}

/** Percentages are clamped rather than trusted — a panel is a text box. */
function pct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Two decimal places, without the float dust that makes totals wrong. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'SR ',
  AED: 'AED ',
  EGP: 'E£',
  JPY: '¥',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? `${currency || ''} `;
}

/**
 * Money for DISPLAY on the artifact.
 *
 * Whole amounts drop their decimals — the invoice designs were drawn
 * around "$2,400", and printing "$2,400.00" in a 3px cell is both uglier
 * and wider than the space it was given.
 */
export function formatMoney(amount: number, currency = 'USD'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const whole = Math.abs(safe % 1) < 0.005;
  const body = whole
    ? Math.round(safe).toLocaleString('en-US')
    : safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currencySymbol(currency)}${body}`;
}

/** "5%" / "7.5%" — trailing zeros dropped. */
export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${Number(safe.toFixed(2))}%`;
}
