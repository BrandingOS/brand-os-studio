/**
 * The contrast sweep — "every rendered text node reads."
 *
 * The audit found exactly ONE WCAG-aware check across 31 renderer files
 * (`BusinessCardsExtended2.tsx:76-82`, used by 1 of 100 designs), and real
 * casualties: white print on a cream tee, dark text on a black tote. A
 * literal scan cannot see those — the strings are fine, the pairing is not
 * — and neither can jsdom, which has no cascade and no computed colours.
 *
 * So this helper is for the BROWSER project only. It walks the rendered
 * text, resolves each node's EFFECTIVE background by climbing until it
 * finds an opaque one, and measures with the same `contrastRatio` every
 * other surface in the app uses.
 *
 * What it deliberately does NOT judge:
 *   • text over a gradient or an image — the background is not a colour,
 *     so there is no honest single ratio. Counted as `skipped`, never
 *     silently passed.
 *   • invisible text — `display:none`, `visibility:hidden`, zero opacity,
 *     zero-area boxes. Nobody reads it.
 * Both are reported, because a family that "passes" by painting all its
 * text on a gradient has not passed.
 */
import { contrastRatio } from '@/shared/brand/logoOnBackground';

/** WCAG AA. Large = ≥ 24px, or ≥ 18.66px at weight ≥ 700. */
const AA_NORMAL = 4.5;
const AA_LARGE = 3;

export type ContrastViolation = {
  /** The text as the reader sees it, trimmed and capped. */
  text: string;
  /** `div.bk-card > span` — enough to find it in the source. */
  where: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  fontSizePx: number;
  bold: boolean;
};

export type ContrastReport = {
  violations: ContrastViolation[];
  /** Text nodes measured against a real, opaque background. */
  measured: number;
  /** Text nodes whose background is a gradient or an image. */
  skippedNoSolidBackground: number;
  /** Text nodes nobody can read anyway. */
  skippedInvisible: number;
};

/* ── Colour plumbing ──────────────────────────────────────────────── */

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba | null {
  const m = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!m) return null;
  const parts = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  const [r, g, b] = parts;
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  const a = parts.length > 3 && Number.isFinite(parts[3]!) ? parts[3]! : 1;
  return { r: r!, g: g!, b: b!, a };
}

function toHex({ r, g, b }: Rgba): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Source over destination. Both opaque-ish; `over` carries the alpha. */
function composite(over: Rgba, under: Rgba): Rgba {
  const a = over.a;
  return {
    r: over.r * a + under.r * (1 - a),
    g: over.g * a + under.g * (1 - a),
    b: over.b * a + under.b * (1 - a),
    a: 1,
  };
}

/* ── Walking the DOM ──────────────────────────────────────────────── */

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/**
 * The colour actually behind `el`.
 *
 * Climbs until it finds a background with alpha 1, compositing every
 * translucent layer it passes on the way — a `rgba(0,0,0,.6)` scrim over a
 * white card is a dark grey, and measuring against the white would pass
 * text that is genuinely unreadable.
 *
 * `null` means "not a flat colour": a gradient or an image intervened.
 */
function effectiveBackground(el: Element): Rgba | null {
  const layers: Rgba[] = [];
  let node: Element | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage && style.backgroundImage !== 'none') return null;
    const bg = parseColor(style.backgroundColor);
    if (bg && bg.a > 0) {
      if (bg.a >= 1) {
        return layers.reduceRight((under, over) => composite(over, under), bg);
      }
      layers.push(bg);
    }
    node = node.parentElement;
  }
  // Nothing opaque anywhere: the page's own ground. White is the honest
  // assumption for a deliverable, which is printed or posted on white.
  return layers.reduceRight((under, over) => composite(over, under), WHITE);
}

function isInvisible(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  if (Number(style.opacity) === 0) return true;
  const rect = el.getBoundingClientRect();
  return rect.width === 0 || rect.height === 0;
}

/** `div.bk-card > span.name` — enough to find the node in a renderer. */
function describe(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  for (let i = 0; node && i < 3; i += 1) {
    const cls = node.className && typeof node.className === 'string'
      ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
    parts.unshift(`${node.tagName.toLowerCase()}${cls}`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

/* ── The sweep ────────────────────────────────────────────────────── */

/** Measure every readable text node under `container`. */
export function measureContrast(container: HTMLElement): ContrastReport {
  const report: ContrastReport = {
    violations: [],
    measured: 0,
    skippedNoSolidBackground: 0,
    skippedInvisible: 0,
  };

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el) continue;
    if (isInvisible(el)) {
      report.skippedInvisible += 1;
      continue;
    }

    const style = getComputedStyle(el);
    const fgRaw = parseColor(style.color);
    const bgRaw = effectiveBackground(el);
    if (!fgRaw || !bgRaw) {
      report.skippedNoSolidBackground += 1;
      continue;
    }

    const bg = bgRaw;
    // Translucent INK is composited too — `rgba(255,255,255,.5)` on a dark
    // ground is a mid grey, and measuring the pure white flatters it.
    const fg = fgRaw.a >= 1 ? fgRaw : composite(fgRaw, bg);

    const fontSizePx = Number.parseFloat(style.fontSize) || 16;
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    const bold = weight >= 700;
    const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold);
    const required = large ? AA_LARGE : AA_NORMAL;

    const fgHex = toHex(fg);
    const bgHex = toHex(bg);
    const ratio = contrastRatio(fgHex, bgHex);
    report.measured += 1;
    if (ratio < required) {
      report.violations.push({
        text: text.length > 40 ? `${text.slice(0, 40)}…` : text,
        where: describe(el),
        fg: fgHex,
        bg: bgHex,
        ratio: Math.round(ratio * 100) / 100,
        required,
        fontSizePx: Math.round(fontSizePx * 10) / 10,
        bold,
      });
    }
  }
  return report;
}

/** One line per violation, worst first. */
export function formatViolations(violations: ReadonlyArray<ContrastViolation>): string {
  return [...violations]
    .sort((a, b) => a.ratio - b.ratio)
    .map(
      (v) =>
        `  ${v.ratio.toFixed(2)}:1 (needs ${v.required}) ${v.fg} on ${v.bg}` +
        ` — ${v.fontSizePx}px${v.bold ? ' bold' : ''} — "${v.text}" — ${v.where}`,
    )
    .join('\n');
}

/**
 * Assert a rendered deliverable reads.
 *
 * `maxViolations` exists because this landed against 31 renderers that had
 * never been measured: a family agent pins TODAY's number, and the next
 * change may only lower it. Zero is the destination, not the starting
 * point — but a budget that is never lowered is a budget nobody notices,
 * so this also fails when the count comes in UNDER the budget, telling the
 * caller to tighten it.
 */
export function assertReadable(
  container: HTMLElement,
  options: { maxViolations?: number; label?: string } = {},
): ContrastReport {
  const { maxViolations = 0, label = 'this deliverable' } = options;
  const report = measureContrast(container);
  const count = report.violations.length;

  if (count > maxViolations) {
    throw new Error(
      `contrast: ${label} has ${count} unreadable text node(s), budget ${maxViolations}.\n` +
        `${formatViolations(report.violations)}\n` +
        `(measured ${report.measured}; skipped ${report.skippedNoSolidBackground} on a ` +
        `gradient/image and ${report.skippedInvisible} invisible)\n`,
    );
  }
  if (maxViolations > 0 && count < maxViolations) {
    throw new Error(
      `contrast: ${label} now has ${count} violation(s), below its budget of ` +
        `${maxViolations}. Lower the budget to ${count} — a budget that is never ` +
        `tightened stops meaning anything.`,
    );
  }
  return report;
}
