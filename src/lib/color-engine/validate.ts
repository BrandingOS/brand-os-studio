/**
 * Palette validation engine.
 *
 * Collects problems the user should know about before exporting. Each
 * finding has a severity, a human-readable message, and (where possible)
 * a concrete suggestion the UI can apply as a one-click fix.
 */
import { apcaContrast, wcagContrast } from './contrast';
import type { PaletteSystem } from './types';

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  /** Which role/token this finding applies to, for UI targeting. */
  target?: string;
}

export function validatePalette(palette: PaletteSystem): Finding[] {
  const findings: Finding[] = [];
  const t = palette.semanticTokens;

  // --- Text on background ------------------------------------------------
  pushContrast(findings, 'text-primary/surface', t.textPrimary, t.surface, 'body');
  pushContrast(findings, 'text-secondary/surface', t.textSecondary, t.surface, 'body');
  pushContrast(findings, 'text-muted/surface', t.textMuted, t.surface, 'large');

  // --- Button pairs ------------------------------------------------------
  pushContrast(findings, 'button-primary', t.buttonPrimaryFg, t.buttonPrimaryBg, 'body');
  pushContrast(findings, 'button-secondary', t.buttonSecondaryFg, t.buttonSecondaryBg, 'body');

  // --- On-color pairs ----------------------------------------------------
  const roles = palette.roles;
  if (roles.success) {
    pushContrast(findings, 'on-success', t.onSuccess, roles.success.shades[600].hex, 'body');
  }
  if (roles.warning) {
    pushContrast(findings, 'on-warning', t.onWarning, roles.warning.shades[600].hex, 'body');
  }
  if (roles.error) {
    pushContrast(findings, 'on-error', t.onError, roles.error.shades[600].hex, 'body');
  }

  // --- Border visibility -------------------------------------------------
  const borderRatio = wcagContrast(t.border, t.surface);
  if (borderRatio < 1.2) {
    findings.push({
      severity: 'warning',
      code: 'border-low-contrast',
      message: 'Border is barely visible against surface. Consider darkening neutral/200.',
      target: 'border',
    });
  }

  // --- Chart color uniqueness -------------------------------------------
  const charts = [t.chart1, t.chart2, t.chart3, t.chart4, t.chart5, t.chart6];
  const unique = new Set(charts);
  if (unique.size < charts.length) {
    findings.push({
      severity: 'warning',
      code: 'chart-duplicate',
      message: 'Two or more chart colors are identical. Data series will be indistinguishable.',
      target: 'chart',
    });
  }

  // --- Chart color distinctness (APCA between neighbors) ----------------
  for (let i = 0; i < charts.length - 1; i++) {
    const delta = Math.abs(apcaContrast(charts[i], charts[i + 1]));
    if (delta < 15) {
      findings.push({
        severity: 'info',
        code: 'chart-similar',
        message: `Chart ${i + 1} and ${i + 2} may be hard to distinguish in grayscale or for colorblind viewers.`,
        target: `chart${i + 1}`,
      });
    }
  }

  return findings;
}

function pushContrast(
  findings: Finding[],
  code: string,
  fg: string,
  bg: string,
  size: 'body' | 'large',
): void {
  const ratio = wcagContrast(fg, bg);
  const lc = Math.abs(apcaContrast(fg, bg));
  const wcagPass = size === 'body' ? ratio >= 4.5 : ratio >= 3;
  const apcaPass = size === 'body' ? lc >= 75 : lc >= 60;

  if (!wcagPass && !apcaPass) {
    findings.push({
      severity: 'error',
      code: `contrast-fail:${code}`,
      message: `Contrast is too low (WCAG ${ratio.toFixed(2)}:1, APCA Lc ${lc.toFixed(1)}). Choose a darker or lighter foreground.`,
      target: code,
    });
  } else if (!wcagPass || !apcaPass) {
    findings.push({
      severity: 'warning',
      code: `contrast-borderline:${code}`,
      message: `Contrast passes one standard but not the other (WCAG ${ratio.toFixed(2)}:1, APCA ${lc.toFixed(1)}). Test on your target text size.`,
      target: code,
    });
  }
}
