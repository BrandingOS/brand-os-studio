/**
 * The render sweep — "the artwork stays inside its frame, and no two
 * words are printed on top of each other."
 *
 * The literal scan reads source and the contrast sweep reads colour. Both
 * are blind to the third way a design fails: it LAYS OUT wrong. A name
 * that runs out of the pill it was drawn in, a footer that hangs below
 * the card's own edge, a headline printed over the address block — none
 * of those change a string and none of them change a colour, so the two
 * guards that came before this one pass on every one of them.
 *
 * `.audit/OURS.md` D52 is the worked example: wave-2 invoice #50 pushed
 * its client name out of the rounded rectangle behind it, on every brand
 * whose name was longer than the placeholder the design was drawn with.
 * It shipped, it was exported, and nothing said a word.
 *
 * ## Browser only, and geometry rather than pixels
 *
 * This measures `getBoundingClientRect()` in a real Chromium with the
 * real stylesheets loaded. jsdom cannot answer it at all — every box
 * there is 0×0, so every design passes vacuously.
 *
 * Geometry rather than a pixel diff is deliberate. A rasterised
 * comparison needs a blessed image per design per brand, which is a
 * second artefact to keep true; overlap and overflow are FACTS about the
 * layout, they are the same on every brand, and a failure names the two
 * elements rather than pointing at a picture.
 *
 * ## What it will not judge
 *
 * A design is allowed to draw a decoration outside the reading area
 * (a bleed band, a rule that runs to the edge) — so only boxes that
 * carry TEXT are held to the frame, and an ancestor that clips is
 * respected: `overflow: hidden` is the artwork saying "on purpose".
 */

/** How far outside its frame a text box may sit before it is a bleed. */
const BLEED_TOLERANCE_PX = 1;

/**
 * How much of the smaller box two texts may share before it is a
 * collision.
 *
 * Not zero: inline boxes routinely touch by a fraction of a pixel, and a
 * label deliberately set INSIDE a larger text block (a drop cap, a
 * superscript) overlaps its parent's line box by design. A third of the
 * smaller box is the point at which one word is genuinely printed over
 * another.
 */
const COLLISION_AREA_FRACTION = 0.34;

export type LayoutViolation = {
  kind: 'bleed' | 'collision' | 'clipped';
  /** What the reader sees, trimmed. */
  text: string;
  /** `div.bk-card > span` — enough to find it in the source. */
  where: string;
  detail: string;
};

export type LayoutReport = {
  violations: LayoutViolation[];
  /** Text-bearing boxes measured. */
  measured: number;
};

type Box = { left: number; top: number; right: number; bottom: number };

function rectOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

function area(b: Box): number {
  return Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
}

function intersection(a: Box, b: Box): Box {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

/** `div.bk-card > span.name` — the same shape the contrast sweep reports. */
function describe(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  for (let i = 0; node && i < 3; i += 1) {
    const cls =
      node.className && typeof node.className === 'string'
        ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    parts.unshift(`${node.tagName.toLowerCase()}${cls}`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function isInvisible(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  if (Number(style.opacity) === 0) return true;
  const r = el.getBoundingClientRect();
  return r.width === 0 || r.height === 0;
}

/** A run of separator punctuation is a divider, not reading text. */
function isDecorative(text: string): boolean {
  return /^[\s·•|—–\-_/\\*~.,:;]+$/.test(text);
}

/**
 * The box that actually clips `el` — the nearest ancestor (up to and
 * including `frame`) that hides its overflow, or the frame itself.
 *
 * A design that draws a band wider than the sheet and clips it at the
 * sheet's edge is doing the right thing; measuring the band's own rect
 * would call that a bleed.
 */
function clipBoxFor(el: Element, frame: Element): Box {
  let node: Element | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const clips =
      style.overflow === 'hidden' ||
      style.overflow === 'clip' ||
      style.overflowX === 'hidden' ||
      style.overflowY === 'hidden' ||
      style.clipPath !== 'none';
    if (clips) return rectOf(node);
    if (node === frame) break;
    node = node.parentElement;
  }
  return rectOf(frame);
}

/** Every element that directly contains reading text. */
function textBoxes(root: HTMLElement): Element[] {
  const seen = new Set<Element>();
  const out: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').trim();
    if (!text || isDecorative(text)) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    if (isInvisible(el)) continue;
    seen.add(el);
    out.push(el);
  }
  return out;
}

function textOf(el: Element): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function contains(a: Element, b: Element): boolean {
  return a !== b && a.contains(b);
}

/**
 * Measure one rendered deliverable.
 *
 * `frame` defaults to the artwork's own outermost element, which is what
 * the tile, the export and the print all cut at.
 */
export function measureLayout(
  container: HTMLElement,
  frame: HTMLElement = (container.firstElementChild as HTMLElement) ?? container,
): LayoutReport {
  const report: LayoutReport = { violations: [], measured: 0 };
  const boxes = textBoxes(container);
  report.measured = boxes.length;

  /* ── Bleed: reading text outside whatever clips it ───────────────── */
  for (const el of boxes) {
    const box = rectOf(el);
    const clip = clipBoxFor(el, frame);
    const over = [
      box.left < clip.left - BLEED_TOLERANCE_PX ? `left by ${(clip.left - box.left).toFixed(1)}px` : '',
      box.top < clip.top - BLEED_TOLERANCE_PX ? `top by ${(clip.top - box.top).toFixed(1)}px` : '',
      box.right > clip.right + BLEED_TOLERANCE_PX ? `right by ${(box.right - clip.right).toFixed(1)}px` : '',
      box.bottom > clip.bottom + BLEED_TOLERANCE_PX ? `bottom by ${(box.bottom - clip.bottom).toFixed(1)}px` : '',
    ].filter(Boolean);
    if (over.length > 0) {
      report.violations.push({
        kind: 'bleed',
        text: textOf(el),
        where: describe(el),
        detail: `escapes its frame ${over.join(', ')}`,
      });
    }
  }

  /* ── Clipped: text cut off by a box that hides its overflow ──────── */
  for (const el of boxes) {
    const style = getComputedStyle(el);
    const hides = style.overflow === 'hidden' || style.overflowX === 'hidden';
    if (!hides) continue;
    // `truncate` is a decision: the ellipsis tells the reader there is
    // more. A hard cut mid-word does not.
    if (style.textOverflow === 'ellipsis') continue;
    const cut = (el as HTMLElement).scrollWidth - (el as HTMLElement).clientWidth;
    if (cut > 2) {
      report.violations.push({
        kind: 'clipped',
        text: textOf(el),
        where: describe(el),
        detail: `cut off by ${cut}px with no ellipsis`,
      });
    }
  }

  /* ── Collision: two texts printed over each other ────────────────── */
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (contains(a, b) || contains(b, a)) continue;
      const ra = rectOf(a);
      const rb = rectOf(b);
      const shared = area(intersection(ra, rb));
      if (shared <= 0) continue;
      const smaller = Math.min(area(ra), area(rb));
      if (smaller <= 0) continue;
      if (shared / smaller < COLLISION_AREA_FRACTION) continue;
      report.violations.push({
        kind: 'collision',
        text: `${textOf(a)} ⟂ ${textOf(b)}`,
        where: `${describe(a)}  ×  ${describe(b)}`,
        detail: `${Math.round((shared / smaller) * 100)}% of the smaller box is shared`,
      });
    }
  }

  return report;
}

/** One line per violation, bleeds first. */
export function formatLayoutViolations(violations: ReadonlyArray<LayoutViolation>): string {
  const order = { bleed: 0, clipped: 1, collision: 2 } as const;
  return [...violations]
    .sort((a, b) => order[a.kind] - order[b.kind])
    .map((v) => `  [${v.kind}] "${v.text}" — ${v.detail} — ${v.where}`)
    .join('\n');
}

/**
 * Assert a rendered deliverable lays out.
 *
 * Zero is the bar and there is no budget parameter on purpose: unlike
 * contrast, this guard landed on artwork that already passed it, so a
 * budget here would only ever be a place to hide a new defect.
 */
export function assertLaysOut(
  container: HTMLElement,
  options: { label?: string; frame?: HTMLElement } = {},
): LayoutReport {
  const { label = 'this deliverable', frame } = options;
  const report = measureLayout(container, frame);
  if (report.violations.length > 0) {
    throw new Error(
      `${label}: ${report.violations.length} layout violation(s) across ` +
        `${report.measured} text box(es).\n${formatLayoutViolations(report.violations)}\n`,
    );
  }
  return report;
}
