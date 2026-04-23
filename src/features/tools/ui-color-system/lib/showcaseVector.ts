/**
 * Showcase → Vector IR
 *
 * A focused DOM walker for the UI Color System showcases. Unlike the
 * shared DOM→IR walker (src/shared/services/export/vectorize/*,
 * stable/editable-export-v1) this one is forgiving: whenever it hits
 * CSS it can't emit as vector (gradients, box-shadow, filters,
 * transforms, inline SVG, canvas), it just skips that node and keeps
 * recursing. Text, rectangles, borders, and embedded <img> all make
 * it out as editable SVG or jsPDF primitives.
 *
 * Produces:
 *   - <rect>   for elements with a solid background-color
 *   - <rect stroke> for elements with a visible border
 *   - <text>   for each wrapped text line (via Range.getClientRects)
 *   - <image>  for <img> tags — fetched + base64'd so the export is
 *              self-contained
 */

export interface VNode {
  kind: 'rect' | 'border' | 'text' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  /** rect / border */
  rx?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** text */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  /** image (data URL) */
  href?: string;
  /** alpha */
  opacity: number;
}

export interface VectorCapture {
  width: number;
  height: number;
  /** Root background color (applied before any node). */
  background: string;
  nodes: VNode[];
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS']);

export async function captureShowcaseToVector(
  root: HTMLElement,
): Promise<VectorCapture> {
  const rootRect = root.getBoundingClientRect();
  const rootStyle = getComputedStyle(root);
  const capture: VectorCapture = {
    width: rootRect.width,
    height: rootRect.height,
    background: colorString(parseColor(rootStyle.backgroundColor)) || '#f5f4ef',
    nodes: [],
  };
  const imagePromises: Promise<void>[] = [];
  walk(root, rootRect, capture.nodes, imagePromises, /* isRoot */ true);
  await Promise.all(imagePromises);
  return capture;
}

function walk(
  el: Element,
  rootRect: DOMRect,
  out: VNode[],
  imagePromises: Promise<void>[],
  isRoot: boolean,
): void {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return;
  if (SKIP_TAGS.has(el.tagName)) return;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return;
  const opacity = Number(style.opacity);
  if (!Number.isFinite(opacity) || opacity === 0) return;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    for (const child of Array.from(el.children)) {
      walk(child, rootRect, out, imagePromises, false);
    }
    return;
  }

  const x = rect.left - rootRect.left;
  const y = rect.top - rootRect.top;

  // ── Background (solid only, skip gradients) ──
  if (!isRoot) {
    const bg = parseColor(style.backgroundColor);
    const gradient = style.backgroundImage && style.backgroundImage.includes('gradient');
    if (bg && bg.a > 0.01 && !gradient) {
      out.push({
        kind: 'rect',
        x,
        y,
        w: rect.width,
        h: rect.height,
        rx: averageBorderRadius(style),
        fill: rgbaToHex(bg),
        opacity: opacity * bg.a,
      });
    }
  }

  // ── Border ──
  const borderW = parsePx(style.borderTopWidth);
  if (borderW > 0 && !isRoot) {
    const borderColor = parseColor(style.borderTopColor);
    if (borderColor && borderColor.a > 0.01) {
      out.push({
        kind: 'border',
        x: x + borderW / 2,
        y: y + borderW / 2,
        w: rect.width - borderW,
        h: rect.height - borderW,
        rx: Math.max(0, averageBorderRadius(style) - borderW / 2),
        stroke: rgbaToHex(borderColor),
        strokeWidth: borderW,
        opacity: opacity * borderColor.a,
      });
    }
  }

  // ── <img> ──
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement;
    if (img.src) {
      const p = imgToDataUrl(img).then((dataUrl) => {
        if (dataUrl) {
          out.push({
            kind: 'image',
            x,
            y,
            w: rect.width,
            h: rect.height,
            href: dataUrl,
            opacity,
          });
        }
      });
      imagePromises.push(p);
    }
    return;
  }

  // ── Text (leaf elements with direct text children) ──
  if (hasDirectText(el) && el.childElementCount === 0) {
    emitText(el, rootRect, style, opacity, out);
    return;
  }

  // ── Recurse ──
  for (const child of Array.from(el.children)) {
    walk(child, rootRect, out, imagePromises, false);
  }
}

function hasDirectText(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent && child.textContent.trim()) {
      return true;
    }
  }
  return false;
}

function emitText(
  el: HTMLElement,
  rootRect: DOMRect,
  style: CSSStyleDeclaration,
  opacity: number,
  out: VNode[],
): void {
  const rawText = el.textContent ?? '';
  if (!rawText.trim()) return;

  const fontSize = parsePx(style.fontSize) || 14;
  const color = parseColor(style.color) ?? { r: 17, g: 17, b: 17, a: 1 };
  const fontFamily = stripFontFamily(style.fontFamily || 'sans-serif');
  const fontWeight = style.fontWeight || '400';
  const fontStyle = style.fontStyle || 'normal';
  const textAlign =
    (['left', 'center', 'right'].includes(style.textAlign)
      ? (style.textAlign as 'left' | 'center' | 'right')
      : 'left');

  // Use Range to walk the wrapped lines geometrically.
  const range = document.createRange();
  const textNode = firstSignificantTextNode(el);
  if (!textNode) return;
  range.setStart(textNode, 0);
  // End at the last significant text node — usually it's the same one.
  let last: Text = textNode;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent && child.textContent.trim()) {
      last = child as Text;
    }
  }
  range.setEnd(last, last.textContent?.length ?? 0);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);

  if (rects.length === 0) return;

  const lines = splitIntoLines(rawText.trim(), rects.length);
  rects.forEach((lineRect, i) => {
    const line = lines[i];
    if (!line) return;
    out.push({
      kind: 'text',
      x: lineRect.left - rootRect.left,
      y: lineRect.top - rootRect.top + fontSize * 0.82, // approx baseline
      w: lineRect.width,
      h: lineRect.height,
      text: line,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      fill: rgbaToHex(color),
      textAlign,
      opacity: opacity * color.a,
    } as VNode);
  });
}

function firstSignificantTextNode(el: Element): Text | null {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent && child.textContent.trim()) {
      return child as Text;
    }
  }
  return null;
}

/**
 * Approximate splitting of text into N lines. CSS wraps at word
 * boundaries, so split on whitespace and chunk by word count roughly
 * proportional to each line's rect width.
 */
function splitIntoLines(text: string, lineCount: number): string[] {
  if (lineCount === 1) return [text];
  const words = text.split(/\s+/);
  if (words.length <= lineCount) return words;
  const perLine = Math.ceil(words.length / lineCount);
  const out: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    out.push(words.slice(i * perLine, (i + 1) * perLine).join(' '));
  }
  return out;
}

// ── Colour + CSS helpers ─────────────────────────────────────

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (s === 'transparent' || s === 'none') return null;
  const rgbMatch = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((p) => p.trim());
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] !== undefined ? Number(parts[3]) : 1;
    if ([r, g, b, a].every(Number.isFinite)) return { r, g, b, a };
  }
  const hex = s.replace('#', '');
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  return null;
}

function rgbaToHex({ r, g, b }: RGBA): string {
  const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function colorString(rgba: RGBA | null): string | null {
  return rgba ? rgbaToHex(rgba) : null;
}

function parsePx(input: string | undefined | null): number {
  if (!input) return 0;
  const n = parseFloat(input);
  return Number.isFinite(n) ? n : 0;
}

function averageBorderRadius(style: CSSStyleDeclaration): number {
  const radii = [
    parsePx(style.borderTopLeftRadius),
    parsePx(style.borderTopRightRadius),
    parsePx(style.borderBottomLeftRadius),
    parsePx(style.borderBottomRightRadius),
  ];
  return radii.reduce((a, b) => a + b, 0) / 4;
}

function stripFontFamily(family: string): string {
  // Use just the first family; Illustrator picks up commas poorly.
  const first = family.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

async function imgToDataUrl(img: HTMLImageElement): Promise<string | null> {
  if (img.src.startsWith('data:')) return img.src;
  try {
    const res = await fetch(img.src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Emitters ─────────────────────────────────────────────────

export function vectorCaptureToSVG(cap: VectorCapture): string {
  const w = cap.width;
  const h = cap.height;
  const body = cap.nodes.map((n) => nodeToSvg(n)).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${cap.background}"/>
  ${body}
</svg>`;
}

function nodeToSvg(n: VNode): string {
  const opacity = n.opacity !== undefined && n.opacity < 1 ? ` opacity="${round(n.opacity, 3)}"` : '';
  switch (n.kind) {
    case 'rect':
      return `<rect x="${round(n.x)}" y="${round(n.y)}" width="${round(n.w)}" height="${round(n.h)}" rx="${round(n.rx || 0)}" ry="${round(n.rx || 0)}" fill="${n.fill}"${opacity}/>`;
    case 'border':
      return `<rect x="${round(n.x)}" y="${round(n.y)}" width="${round(n.w)}" height="${round(n.h)}" rx="${round(n.rx || 0)}" ry="${round(n.rx || 0)}" fill="none" stroke="${n.stroke}" stroke-width="${round(n.strokeWidth || 1, 2)}"${opacity}/>`;
    case 'text': {
      const weight = n.fontWeight ? ` font-weight="${n.fontWeight}"` : '';
      const slant = n.fontStyle && n.fontStyle !== 'normal' ? ` font-style="${n.fontStyle}"` : '';
      const anchor =
        n.textAlign === 'center'
          ? ' text-anchor="middle"'
          : n.textAlign === 'right'
            ? ' text-anchor="end"'
            : '';
      const tx =
        n.textAlign === 'center'
          ? n.x + n.w / 2
          : n.textAlign === 'right'
            ? n.x + n.w
            : n.x;
      return `<text x="${round(tx)}" y="${round(n.y)}" fill="${n.fill}" font-family="${escXml(n.fontFamily || 'sans-serif')}" font-size="${round(n.fontSize || 14)}"${weight}${slant}${anchor}${opacity}>${escXml(n.text || '')}</text>`;
    }
    case 'image':
      return `<image x="${round(n.x)}" y="${round(n.y)}" width="${round(n.w)}" height="${round(n.h)}" xlink:href="${n.href}" href="${n.href}" preserveAspectRatio="xMidYMid slice"${opacity}/>`;
  }
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function round(n: number, dp = 1): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

export async function vectorCaptureToPDFBlob(cap: VectorCapture): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: cap.width >= cap.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [cap.width, cap.height],
    hotfixes: ['px_scaling'],
  });

  doc.setFillColor(cap.background);
  doc.rect(0, 0, cap.width, cap.height, 'F');

  for (const n of cap.nodes) {
    try {
      applyPDFNode(doc, n);
    } catch {
      // Be forgiving — skip a broken node rather than fail the whole export.
    }
  }

  return doc.output('blob');
}

function applyPDFNode(doc: any, n: VNode): void {
  switch (n.kind) {
    case 'rect': {
      if (!n.fill) return;
      doc.setFillColor(n.fill);
      if ((n.rx || 0) > 1) {
        doc.roundedRect(n.x, n.y, n.w, n.h, n.rx || 0, n.rx || 0, 'F');
      } else {
        doc.rect(n.x, n.y, n.w, n.h, 'F');
      }
      break;
    }
    case 'border': {
      if (!n.stroke) return;
      doc.setDrawColor(n.stroke);
      doc.setLineWidth(n.strokeWidth || 1);
      if ((n.rx || 0) > 1) {
        doc.roundedRect(n.x, n.y, n.w, n.h, n.rx || 0, n.rx || 0, 'S');
      } else {
        doc.rect(n.x, n.y, n.w, n.h, 'S');
      }
      break;
    }
    case 'text': {
      if (!n.text) return;
      doc.setTextColor(n.fill || '#000000');
      doc.setFontSize((n.fontSize || 14) * 0.75); // jsPDF uses pt → scale down a touch
      const style = textStyleFor(n.fontWeight, n.fontStyle);
      try {
        doc.setFont('helvetica', style);
      } catch {
        /* default font */
      }
      const align = n.textAlign === 'center' || n.textAlign === 'right' ? n.textAlign : 'left';
      const textX =
        align === 'center' ? n.x + n.w / 2 : align === 'right' ? n.x + n.w : n.x;
      doc.text(n.text, textX, n.y, { align });
      break;
    }
    case 'image': {
      if (!n.href) return;
      const type = n.href.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(n.href, type, n.x, n.y, n.w, n.h, undefined, 'FAST');
      break;
    }
  }
}

function textStyleFor(weight?: string, style?: string): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  const isBold = weight && (weight === 'bold' || Number(weight) >= 600);
  const isItalic = style === 'italic' || style === 'oblique';
  if (isBold && isItalic) return 'bolditalic';
  if (isBold) return 'bold';
  if (isItalic) return 'italic';
  return 'normal';
}
