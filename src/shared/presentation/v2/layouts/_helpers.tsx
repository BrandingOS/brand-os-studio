/**
 * Layout helpers — internal shared utilities used by the 15 layouts.
 *
 * Pure presentational, token-only. No brand or hardcoded colors.
 *
 * Anything visual goes through `var(--deck-*)` tokens emitted by the
 * deck-theme provider.
 */

import type { CSSProperties } from 'react';
import type { Block, ImageBlock, TextBlock } from '../types';
import { isText } from '../types';

/* ─── RTL detection ────────────────────────────────────────────────── */

const ARABIC_RANGE = /[؀-ۿ]/;

/** True if the text contains any Arabic character. */
export function hasArabic(text: string | undefined): boolean {
  return !!text && ARABIC_RANGE.test(text);
}

/**
 * Walk a block bag and return `'rtl'` if any text/list block leads with
 * Arabic — best-effort heuristic. Returns undefined otherwise so the
 * default direction is inherited.
 */
export function detectDirection(
  blocks: Record<string, Block>,
): CSSProperties['direction'] {
  for (const key of Object.keys(blocks)) {
    const b = blocks[key];
    if (!b) continue;
    if (b.kind === 'text' && hasArabic(b.text)) return 'rtl';
    if (b.kind === 'list' && b.items.some(hasArabic)) return 'rtl';
    if (b.kind === 'quote' && hasArabic(b.text)) return 'rtl';
  }
  return undefined;
}

/* ─── Empty-slot detection ─────────────────────────────────────────── */

export function isEmptyText(b: Block | undefined): boolean {
  return !isText(b) || !b.text || b.text.trim().length === 0;
}

export function isEmptyImage(b: Block | undefined): boolean {
  return !b || b.kind !== 'image' || !b.url || b.url.trim().length === 0;
}

/* ─── Edit-mode placeholder shells ─────────────────────────────────── */

export function placeholderStyle(extra?: CSSProperties): CSSProperties {
  return {
    border: '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
    borderRadius: 'var(--deck-radius, 12px)',
    color: 'var(--deck-color-caption, rgba(0,21,99,0.55))',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--deck-font-caption, inherit)',
    fontSize: 14,
    minHeight: 0,
    ...extra,
  };
}

/* ─── Image rendering ──────────────────────────────────────────────── */

interface SlotImageProps {
  block: Block | undefined;
  mode: 'present' | 'edit' | 'thumbnail';
  /** Style applied to the wrapper. */
  style?: CSSProperties;
  /** Hint shown inside the placeholder. */
  hint?: string;
  /** Pass-through to the rendered <img>. */
  fit?: 'cover' | 'contain';
  /** Placeholder shape. Defaults to rectangle. */
  shape?: 'rect' | 'circle';
}

/**
 * Renders an image slot. If the block is empty:
 *   - In `edit` mode: render a dashed placeholder.
 *   - In `present` / `thumbnail` mode: render nothing (returns null).
 */
export function SlotImage({
  block,
  mode,
  style,
  hint,
  fit,
  shape = 'rect',
}: SlotImageProps) {
  const empty = isEmptyImage(block);

  if (empty) {
    if (mode !== 'edit') return null;
    return (
      <div
        style={placeholderStyle({
          ...style,
          borderRadius:
            shape === 'circle' ? '50%' : style?.borderRadius ?? 'var(--deck-radius, 12px)',
        })}
      >
        <span>{hint ?? 'Click to add image'}</span>
      </div>
    );
  }

  const img = block as ImageBlock;
  return (
    <img
      src={img.url}
      alt={img.alt ?? ''}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: fit ?? img.fit ?? 'cover',
        borderRadius:
          shape === 'circle' ? '50%' : 'var(--deck-radius, 12px)',
        ...style,
      }}
    />
  );
}

/* ─── Text rendering ───────────────────────────────────────────────── */

interface SlotTextProps {
  block: Block | undefined;
  /** Role class fallback if block.role isn't suitable. */
  roleClass: string;
  mode: 'present' | 'edit' | 'thumbnail';
  /** Hint shown inside the placeholder. */
  hint?: string;
  style?: CSSProperties;
  /** Render as which element? Defaults to span/div based on role. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  /** Inline align override. */
  align?: 'start' | 'center' | 'end';
}

/**
 * Renders a text slot using `.deck-{role}` classes. Honors
 * block.align/weight/color from the block. In edit mode, empty text
 * shows a soft outline so the user knows it's a fillable slot.
 */
export function SlotText({
  block,
  roleClass,
  mode,
  hint,
  style,
  as = 'span',
  align,
}: SlotTextProps) {
  const empty = isEmptyText(block);

  if (empty) {
    if (mode !== 'edit') return null;
    const Tag = as as keyof JSX.IntrinsicElements;
    return (
      <Tag
        className={roleClass}
        style={{
          opacity: 0.55,
          outline: '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
          outlineOffset: 4,
          borderRadius: 6,
          padding: '2px 8px',
          minWidth: 80,
          display: 'inline-block',
          ...style,
        }}
      >
        {hint ?? 'Click to edit'}
      </Tag>
    );
  }

  const t = block as TextBlock;
  const Tag = as as keyof JSX.IntrinsicElements;
  const textAlign: CSSProperties['textAlign'] =
    align ?? t.align ? mapAlign(align ?? t.align) : undefined;

  return (
    <Tag
      className={roleClass}
      style={{
        textAlign,
        fontWeight: t.weight,
        color: t.color,
        ...style,
      }}
    >
      {t.text}
    </Tag>
  );
}

function mapAlign(a?: 'start' | 'center' | 'end'): CSSProperties['textAlign'] {
  if (a === 'start') return 'left';
  if (a === 'end') return 'right';
  if (a === 'center') return 'center';
  return undefined;
}

/* ─── Slide-content area sizing ────────────────────────────────────── */

/**
 * Reserve room for the chrome row at the top of the Frame. The chrome
 * occupies `--deck-chrome-pad-y` + ~24px (rule line). Layouts use this
 * top inset so their content doesn't run under the wordmark / page-N row.
 */
export const CHROME_TOP_INSET = 56;

/* ─── Chrome-aware container ───────────────────────────────────────── */

/**
 * Wrapper applied as the outermost container inside Frame's padding.
 * Reserves chrome room at the top and provides direction-aware flex
 * stacking.
 */
export function StageContainer({
  children,
  style,
  direction,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  direction?: CSSProperties['direction'];
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: `${CHROME_TOP_INSET}px 0 0 0`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--deck-gap, 24px)',
        direction,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
