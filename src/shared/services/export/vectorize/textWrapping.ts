/**
 * Text wrapping helper.
 *
 * Uses Range + getClientRects to ask the browser exactly where it broke
 * each line during layout. This preserves real-world wrapping at the
 * rendered slide size, including hyphenation, justification, and
 * letter-spacing — without re-implementing the line-break algorithm.
 */

export interface WrappedLine {
  text: string;
  /** Visual top of the line in viewport coordinates. */
  top: number;
}

/**
 * Returns the visual lines of text as the browser laid them out for the
 * given element. The element should be a leaf node containing only text.
 */
export function extractWrappedLines(el: HTMLElement): WrappedLine[] {
  const text = el.textContent ?? '';
  if (!text.trim()) return [];

  // Walk character-by-character using a Range. For each character, get the
  // bounding rect and bucket by `top` (within 1px tolerance) to recover lines.
  const range = document.createRange();
  const lines = new Map<number, string>();
  let lastTop = -Infinity;
  let bucketTop = 0;

  // Find the first text node child (the actual text content)
  let textNode: Text | null = null;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      textNode = child as Text;
      break;
    }
  }

  if (!textNode) {
    // No direct text child — fallback to single line.
    return [{ text: text.trim(), top: el.getBoundingClientRect().top }];
  }

  const raw = textNode.data;
  for (let i = 0; i < raw.length; i++) {
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    // New line if vertical position jumped by more than 2px
    if (rect.top - lastTop > 2 || lastTop === -Infinity) {
      bucketTop = rect.top;
      if (!lines.has(bucketTop)) lines.set(bucketTop, '');
    }
    lastTop = rect.top;
    lines.set(bucketTop, (lines.get(bucketTop) ?? '') + raw[i]);
  }

  // Collapse consecutive whitespace and trim each line.
  return Array.from(lines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([top, line]) => ({ top, text: line.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text.length > 0);
}
