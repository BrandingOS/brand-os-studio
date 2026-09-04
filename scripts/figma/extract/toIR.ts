/**
 * Raw browser snapshot -> IR. Pure, and therefore testable without a browser.
 *
 * This module holds the decisions that matter most in the whole pipeline:
 * sizing INTENT, layout inference, and token provenance. Keeping them out of
 * `page.evaluate` is what makes them verifiable.
 */
import type {
  IRNode, IRPaint, IRLayout, IRSizing, IREffect, IRLoss, Sizing, Direction,
} from '../ir/types';
import { childSid, assignOrdinals, variantSid } from '../ir/sid';
import type { RawNode } from './raw';

// ---------------------------------------------------------------- colour ----

/**
 * Normalise any CSS colour the browser hands back to `#rrggbb` or `rgba(...)`.
 *
 * Tolerates a missing value: a real browser always supplies `color`, but one
 * absent property must never take down an entire extraction run.
 */
export function normalizeColor(css: string | undefined): string {
  const s = (css ?? '').trim();
  if (!s) return 'transparent';
  if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return 'transparent';

  /**
   * `color(srgb r g b / a)` is a modern CSS colour function with 0..1 channels.
   * Chromium returns it verbatim from getComputedStyle wherever the author used
   * it, and every section border on Setup is written that way — so the walker
   * received a string it could not parse and fell back to opaque black, drawing
   * heavy black rules the product does not have.
   */
  const fn = s.match(/^color\(\s*srgb\s+([^)]+)\)$/i);
  if (fn) {
    const p = fn[1].split(/[\s/]+/).filter(Boolean).map(Number);
    const [r, g, b, alpha = 1] = p;
    if (![r, g, b].some((n) => Number.isNaN(n))) {
      const to255 = (n: number) => Math.round(Math.min(Math.max(n, 0), 1) * 255);
      return normalizeColor(
        alpha >= 1
          ? `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`
          : `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`,
      );
    }
  }

  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return s;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  const [r, g, b, a = 1] = parts;
  if ([r, g, b].some((n) => Number.isNaN(n))) return s;
  if (a >= 1) {
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * A paint that remembers which token produced it.
 *
 * The reverse map is built per theme from the live stylesheet, so this is a
 * lookup rather than a guess. A value with no token is not an error — it is a
 * reportable gap in the token system.
 */
export function toPaint(css: string | undefined, tokens: Record<string, string>): IRPaint {
  const value = normalizeColor(css);
  const token = tokens[value] ?? (css ? tokens[css.trim()] : undefined);
  return token ? { value, token } : { value };
}

// ---------------------------------------------------------------- sizing ----

const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
};

/**
 * Derive hug | fill | fixed from CSS, NOT from measured pixels.
 *
 * A converter that measures `width: 143px` and writes a fixed frame produces a
 * file that looks perfect and dies the moment anyone resizes it. The measured
 * value survives only as the fallback for `fixed`.
 */
export function deriveSizing(node: RawNode, parent: RawNode | null): IRSizing {
  const s = node.style;
  const parentIsFlex = parent
    ? parent.style.display === 'flex' || parent.style.display === 'inline-flex'
    : false;

  const axis = (
    dimension: 'width' | 'height',
    explicit: string | undefined,
    grows: boolean,
    stretches: boolean,
  ): Sizing => {
    // An explicit non-auto length is fixed, whatever the parent does.
    if (explicit && explicit !== 'auto' && !explicit.endsWith('%')) return 'fixed';
    if (explicit && explicit.endsWith('%')) return 'fill';
    if (parentIsFlex && (grows || stretches)) return 'fill';
    return 'hug';
  };

  const isRow = parent
    ? parent.style['flex-direction'] !== 'column'
    : true;
  const grow = px(s['flex-grow']) > 0;
  const stretch = s['align-self'] === 'stretch';

  const width = axis('width', rawLength(node, 'width'), isRow && grow, !isRow && stretch);
  const height = axis('height', rawLength(node, 'height'), !isRow && grow, isRow && stretch);

  const out: IRSizing = {
    width,
    height,
    w: Math.round(node.rect.w * 100) / 100,
    h: Math.round(node.rect.h * 100) / 100,
  };
  // Figma auto-layout supports min/max natively, so carry them rather than
  // baking the current measurement in. DsMenu's min-width: 200px is this case.
  const minW = px(s['min-width']);
  const maxW = s['max-width'] === 'none' ? 0 : px(s['max-width']);
  const minH = px(s['min-height']);
  const maxH = s['max-height'] === 'none' ? 0 : px(s['max-height']);
  if (minW > 0) out.minW = minW;
  if (maxW > 0) out.maxW = maxW;
  if (minH > 0) out.minH = minH;
  if (maxH > 0) out.maxH = maxH;
  return out;
}

/**
 * The author's own width/height declaration, when the collector captured one.
 * `getComputedStyle` resolves `width` to a used pixel value, which cannot be
 * told apart from an author's fixed width — so the collector records the
 * declared value separately under `declaredWidth`/`declaredHeight`.
 */
function rawLength(node: RawNode, dim: 'width' | 'height'): string | undefined {
  const declared = node.style[dim === 'width' ? 'declaredWidth' : 'declaredHeight'];
  return declared && declared !== '' ? declared : undefined;
}

// ---------------------------------------------------------------- layout ----

const ALIGN: Record<string, IRLayout extends { primaryAlign: infer A } ? A : never> = {
  'flex-start': 'min', start: 'min', normal: 'min',
  center: 'center',
  'flex-end': 'max', end: 'max',
  'space-between': 'space-between',
} as never;

const COUNTER: Record<string, 'min' | 'center' | 'max' | 'baseline'> = {
  'flex-start': 'min', start: 'min', stretch: 'min', normal: 'min',
  center: 'center',
  'flex-end': 'max', end: 'max',
  baseline: 'baseline',
};

/**
 * Flex maps onto Figma auto-layout almost one-to-one. Anything else becomes
 * `absolute` — an honest, visible fallback rather than a silent bad guess.
 */
/**
 * A uniform NEGATIVE margin between flex siblings is an overlapping stack.
 *
 * The product draws its palettes that way: the 32-step neutral ramp is 32
 * swatches 158px wide sharing a 1044px row, each pulled 130px back over the one
 * before it. CSS says that with `margin-left`; Figma says exactly the same thing
 * with a negative `itemSpacing`. Read as a plain gap of 0, the ramp laid out
 * 5,056px wide — so the row either overflowed or every swatch was crushed.
 *
 * Only a value EVERY sibling after the first agrees on counts. A single odd
 * margin among several is a one-off nudge, not a stacking rule, and folding it
 * into the container's spacing would move every other child to accommodate one.
 * With exactly two children there is nothing to disagree with — that one margin
 * IS the row's only gap — and the Core palette is that case.
 */
function overlapOf(node: RawNode, column: boolean): number {
  const prop = column ? 'margin-top' : 'margin-left';
  const rest = node.children.slice(1);
  if (!rest.length) return 0;
  const first = px(rest[0].style[prop]);
  if (first >= 0) return 0;
  return rest.every((c) => px(c.style[prop]) === first) ? first : 0;
}

export function deriveLayout(node: RawNode): IRLayout {
  const s = node.style;
  const display = s.display;
  if (display !== 'flex' && display !== 'inline-flex') return { mode: 'absolute' };

  const column = s['flex-direction'] === 'column' || s['flex-direction'] === 'column-reverse';
  const gap = px(s.gap || (column ? s['row-gap'] : s['column-gap']));

  return {
    mode: 'auto',
    direction: column ? 'column' : 'row',
    gap: gap + overlapOf(node, column),
    padding: [
      px(s['padding-top']), px(s['padding-right']),
      px(s['padding-bottom']), px(s['padding-left']),
    ],
    primaryAlign: (ALIGN[s['justify-content']] ?? 'min') as 'min',
    counterAlign: COUNTER[s['align-items']] ?? 'min',
    wrap: s['flex-wrap'] === 'wrap',
  };
}

// --------------------------------------------------------------- effects ----

/**
 * Parse `box-shadow`, which may carry several comma-separated layers.
 * `--ds-shadow-float` is two, and both must survive as one composite effect.
 */
export function parseShadows(css: string, tokens: Record<string, string>): IREffect[] {
  if (!css || css === 'none') return [];
  const layers: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { layers.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) layers.push(current);

  return layers.map((layer, index) => {
    const colorMatch = layer.match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/);
    const color = colorMatch ? colorMatch[1] : 'rgba(0, 0, 0, 1)';
    const numbers = layer.replace(color, '').match(/-?\d*\.?\d+px/g) ?? [];
    const [x = '0', y = '0', blur = '0', spread = '0'] = numbers;
    return {
      type: /inset/.test(layer) ? 'inner-shadow' : 'drop-shadow',
      x: px(x), y: px(y), blur: px(blur), spread: px(spread),
      color: toPaint(color, tokens),
      index,
    } as IREffect;
  });
}

// ------------------------------------------------------------------ node ----

const isVisible = (n: RawNode) =>
  n.style.visibility !== 'hidden' && n.style.display !== 'none' && n.rect.w > 0 && n.rect.h > 0;

export interface ToIROptions {
  sidRoot: string;
  variant: Record<string, string>;
  tokens: Record<string, string>;
  direction: Direction;
  /** Selector-to-role map from the manifest, already resolved to class names. */
  roles?: Record<string, string>;
}

/** Convert one cell's subject tree into an IR node. */
export function nodeToIR(
  raw: RawNode,
  opts: ToIROptions,
  parent: RawNode | null = null,
  sidOverride?: string,
): IRNode {
  const sid = sidOverride ?? variantSid(opts.sidRoot, opts.variant);
  const s = raw.style;
  const losses: IRLoss[] = [];

  // A transform is a motion affordance here, not geometry. Baking translateY
  // into a Figma offset would reproduce an ANIMATION as a static position.
  if (s.transform && s.transform !== 'none') {
    losses.push({
      sid, property: 'transform', cssValue: s.transform,
      reason: 'intentional-normalization',
      note: 'motion affordance; representing it as geometry would freeze an animation frame',
    });
  }

  const fills: IRPaint[] = [];
  const bg = normalizeColor(s['background-color'] ?? 'transparent');
  if (bg !== 'transparent') fills.push(toPaint(s['background-color'], opts.tokens));

  const strokes: IRPaint[] = [];
  const borderWidth = px(s['border-top-width']);
  // A width with a TRANSPARENT colour is how CSS reserves the space a border
  // will occupy in another state — `.panel-item` does exactly this, so its rows
  // came out ringed in opaque black once the walker read "transparent" as a
  // colour it could not parse and fell back to #000. Reserved space is not a
  // stroke; the layout keeps it through the border width alone.
  const strokeColor = borderWidth > 0
    ? normalizeColor(s['border-top-color'])
    : 'transparent';
  if (borderWidth > 0 && strokeColor !== 'transparent') {
    strokes.push(toPaint(s['border-top-color'], opts.tokens));
  }

  /**
   * PAINT order, not DOM order.
   *
   * Setup's Website section carries `order: 10` and every sibling `order: 0`, so
   * it paints last while sitting sixth in the DOM — and the Figma screen showed
   * it sixth, above Brand Strategy. A flex container's children are ordered by
   * `order` first and document position second; Figma has no such property, so
   * the ordering must be resolved here.
   */
  const visibleChildren = raw.children
    .filter(isVisible)
    .map((c, i) => ({ c, i, o: Number.parseInt(c.style.order ?? '0', 10) || 0 }))
    .sort((a, b) => (a.o - b.o) || (a.i - b.i))
    .map((e) => e.c);
  const roleNames = visibleChildren.map((c) => roleFor(c, opts.roles));
  const ordinals = assignOrdinals(roleNames);

  const node: IRNode = {
    sid,
    name: raw.fx.component ?? nameFor(raw),
    kind: raw.fx.ref ? 'instance'
      : raw.svg ? 'vector'
        : raw.text !== undefined ? 'text' : 'frame',
    layout: deriveLayout(raw),
    sizing: deriveSizing(raw, parent),
    style: {
      fills,
      strokes,
      ...(borderWidth > 0 ? { strokeWeight: borderWidth } : {}),
      radii: [
        px(s['border-top-left-radius']), px(s['border-top-right-radius']),
        px(s['border-bottom-right-radius']), px(s['border-bottom-left-radius']),
      ],
      effects: parseShadows(s['box-shadow'], opts.tokens),
      opacity: s.opacity ? Number.parseFloat(s.opacity) : 1,
      clip: s.overflow === 'hidden',
    },
    children: visibleChildren.map((child, i) =>
      nodeToIR(child, opts, raw, childSidFor(sid, ordinals[i])),
    ),
    losses,
  };

  /**
   * A text-only element that ALSO carries a box becomes a FRAME wrapping a TEXT
   * child, because a Figma TEXT node cannot have a background, border or corner
   * radius — only a fill for the glyphs themselves.
   *
   * `.ds-kbd` (bordered, rounded) and `.ds-dropzone` (dashed, filled) are both
   * text-only in the DOM, so emitting them as TEXT silently dropped their entire
   * box: the keyboard chips rendered borderless and the drop zone lost its
   * dashed outline.
   */
  const hasBox = fills.length > 0 || strokes.length > 0
    || node.style.radii.some((r) => r !== 0) || node.style.effects.length > 0;
  if (raw.text !== undefined && hasBox) {
    const inner: IRNode = {
      sid: childSid(sid, 'label'),
      name: 'label',
      kind: 'text',
      layout: { mode: 'absolute' },
      sizing: { width: 'hug', height: 'hug', w: node.sizing.w, h: node.sizing.h },
      style: { fills: [], strokes: [], radii: [0, 0, 0, 0], effects: [], opacity: 1, clip: false },
      text: textFor(raw, s, opts),
      children: [],
      losses: [],
    };
    node.kind = 'frame';
    node.layout = {
      mode: 'auto', direction: 'row',
      gap: 0,
      padding: [px(s['padding-top']), px(s['padding-right']), px(s['padding-bottom']), px(s['padding-left'])],
      primaryAlign: 'center', counterAlign: 'center', wrap: false,
    };
    node.children = [inner];
    return node;
  }

  /**
   * A child that is POSITIONED rather than flowed carries its own offset.
   *
   * Two different cases produce the same need. An absolutely-laid-out PARENT
   * positions all its children, and without an offset Figma appends them at the
   * origin so every sibling stacks on the first. And a child that is itself
   * `position: absolute` is out of its parent's flow even when that parent is a
   * flex row — the segmented nav's sliding pill is exactly that, and appended
   * into the row it became a 63px empty box that pushed Setup, Brand Kit,
   * Guideline, Design and Tools along in front of it.
   *
   * The walker turns the second case into `layoutPositioning = 'ABSOLUTE'`.
   */
  const selfPositioned = s.position === 'absolute' || s.position === 'fixed';
  const parentFlows = !!parent
    && (parent.style.display === 'flex' || parent.style.display === 'inline-flex');
  if (parent && (!parentFlows || selfPositioned)) {
    node.pos = {
      x: Math.round((raw.rect.x - parent.rect.x) * 100) / 100,
      y: Math.round((raw.rect.y - parent.rect.y) * 100) / 100,
    };
  }

  if (raw.text !== undefined) node.text = textFor(raw, s, opts);

  if (raw.svg) node.vector = { svg: inlineImageHref(raw.svg) };

  // A referenced pattern names the component it must become an INSTANCE of.
  // Its own children were deliberately not captured — they belong to that
  // component, and re-measuring them here would produce a copy that silently
  // stops tracking it.
  if (raw.fx.ref) {
    node.semantic = { ...(node.semantic ?? {}), instanceOf: raw.fx.ref };
    node.children = [];
    // What this occurrence overrides on the component it instances: which
    // variant it is, and the words it actually shows. Without them every rail
    // row is the default and the rail reads "Website" seven times.
    const axes: Record<string, string> = {};
    for (const pair of (raw.fx.refVariant ?? '').split(',')) {
      const i = pair.indexOf('=');
      if (i > 0) axes[pair.slice(0, i)] = pair.slice(i + 1);
    }
    let texts: string[] = [];
    try { texts = raw.fx.refText ? JSON.parse(raw.fx.refText) : []; } catch { texts = []; }
    // The occurrence's own paint and box, present only where they differ from
    // the component's. Instanced without them, 34 swatches carrying 34 colours
    // all came out as the one black box the component was measured from.
    const fill = raw.fx.refFill ? toPaint(raw.fx.refFill, opts.tokens) : undefined;
    const dims = (raw.fx.refSize ?? '').split(',').map(Number);
    const size = dims.length === 2 && dims.every((n) => Number.isFinite(n))
      ? { w: dims[0], h: dims[1] }
      : undefined;
    if (Object.keys(axes).length || texts.length || fill || size) {
      node.overrides = {
        ...(Object.keys(axes).length ? { variant: axes } : {}),
        ...(texts.length ? { texts } : {}),
        ...(fill ? { fill } : {}),
        ...(size ? { size } : {}),
      };
    }
  }

  return node;
}

/**
 * Replace an `<image href="data:image/svg+xml,…">` with the drawing it points at.
 *
 * Setup hands the kit each logo variant as `<svg><rect/><image href="…"/></svg>`
 * so a tile can paint it on a ground. `figma.createNodeFromSvg` does not resolve
 * a nested `<image>`, so what reaches the canvas is the RECT alone — a solid
 * block where the mark should be. That is the same failure the kit exporter hit
 * from the other direction, where the PNG came out blank; the cause is shared,
 * which is why the fix belongs at this boundary rather than in one consumer.
 *
 * Only a data URI is inlined. A remote href cannot be resolved synchronously and
 * is left alone, so the loss stays visible instead of turning into a silent
 * half-drawing.
 */
export function inlineImageHref(svg: string): string {
  // The closing tag is part of the match. `<image …></image>` is as common as
  // the self-closing form, and consuming only the opening tag left a stray
  // `</image>` in the output — which produced `</g></image>` and an SVG that a
  // parser would reject.
  const m = svg.match(
    /<image\b[^>]*?\shref="(data:image\/svg\+xml[^"]*)"[^>]*?(?:\/>|>\s*<\/image>|>)/i,
  );
  if (!m) return svg;

  const uri = m[1];
  const comma = uri.indexOf(',');
  if (comma < 0) return svg;

  const payload = uri.slice(comma + 1);
  let inner: string;
  try {
    inner = /;base64/i.test(uri.slice(0, comma))
      ? decodeBase64(payload)
      : decodeURIComponent(payload);
  } catch {
    return svg;
  }
  if (!/^\s*<svg/i.test(inner)) return svg;

  // Carry the placement across: the outer <image> positions the drawing inside
  // the outer viewBox, and dropping that would paint the mark at the origin at
  // its own scale. A <g transform> reproduces it without needing the renderer
  // to understand <image> at all.
  const attr = (name: string) => {
    const a = m[0].match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
    return a ? Number.parseFloat(a[1]) : undefined;
  };
  const x = attr('x') ?? 0;
  const y = attr('y') ?? 0;
  const w = attr('width');
  const h = attr('height');

  const vb = inner.match(/viewBox="([^"]+)"/i);
  const box = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : null;
  const sx = w && box && box[2] ? w / box[2] : 1;
  const sy = h && box && box[3] ? h / box[3] : 1;

  const body = inner.replace(/^[\s\S]*?<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
  const wrapped = `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${body}</g>`;
  return svg.replace(m[0], wrapped);
}

/** atob is not defined in node; the walker never runs this, the extractor does. */
function decodeBase64(s: string): string {
  const g = globalThis as { atob?: (v: string) => string; Buffer?: { from: (v: string, e: string) => { toString: (e: string) => string } } };
  if (typeof g.atob === 'function') return g.atob(s);
  if (g.Buffer) return g.Buffer.from(s, 'base64').toString('utf8');
  throw new Error('no base64 decoder');
}

function childSidFor(parentSid: string, roleWithOrdinal: string): string {
  const m = roleWithOrdinal.match(/^(.*?)#(\d+)$/);
  return m ? childSid(parentSid, m[1], Number(m[2])) : childSid(parentSid, roleWithOrdinal);
}

/** A declared role wins; otherwise fall back to something stable and readable. */
export function roleFor(node: RawNode, roles?: Record<string, string>): string {
  if (node.fx.role) return node.fx.role;
  if (roles) {
    for (const [selector, role] of Object.entries(roles)) {
      const cls = selector.startsWith('.') ? selector.slice(1) : null;
      if (cls && node.classes.includes(cls)) return role;
      if (selector === node.tag) return role;
    }
  }
  if (node.svg) return 'icon';
  if (node.text !== undefined) return 'label';
  return node.tag;
}

function nameFor(node: RawNode): string {
  if (node.fx.role) return node.fx.role;
  const own = node.classes.find((c) => c.startsWith('ds-'));
  return own ?? node.tag;
}

/** Build the IR text block from a raw node's computed style. */
function textFor(raw: RawNode, s: Record<string, string>, opts: ToIROptions): IRText {
  return {
    characters: raw.text ?? '',
    family: (s['font-family'] ?? '').split(',')[0].replace(/["']/g, '').trim(),
    weight: Number.parseInt(s['font-weight'] ?? '400', 10),
    size: px(s['font-size']),
    lineHeight: s['line-height'] === 'normal' ? 'auto' : px(s['line-height']),
    letterSpacing: s['letter-spacing'] === 'normal' ? 0 : px(s['letter-spacing']),
    align: (s['text-align'] as 'left') ?? 'left',
    direction: (s.direction as Direction) ?? opts.direction,
    color: toPaint(s.color, opts.tokens),
    ...(TEXT_CASE[s['text-transform'] ?? ''] ? { textCase: TEXT_CASE[s['text-transform']] } : {}),
    ...(raw.isPlaceholder ? { placeholder: true } : {}),
  };
}

const TEXT_CASE: Record<string, 'upper' | 'lower' | 'title'> = {
  uppercase: 'upper',
  lowercase: 'lower',
  capitalize: 'title',
};
