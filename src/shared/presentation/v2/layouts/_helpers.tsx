/**
 * Layout helpers — internal shared utilities used by the 15 layouts.
 *
 * Pure presentational, token-only. No brand or hardcoded colors.
 *
 * Anything visual goes through `var(--deck-*)` tokens emitted by the
 * deck-theme provider.
 *
 * Phase 2B/2C wires both leaf primitives (`<SlotText>` / `<SlotImage>`)
 * into the EditContext. When edits are enabled and the layout is in
 * `mode='edit'`:
 *   - `<SlotText>` becomes a contentEditable element. On blur the new
 *     text is pushed through `editCtx.setBlock(slideId, slot, …)`.
 *   - `<SlotImage>` is wrapped in `<ReplaceableArtwork>` which opens
 *     the ArtworkPicker on click. Picks are mirrored from the
 *     artworkStore into the deck store via an effect so the deck-store
 *     is the v2 source of truth.
 */

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Block, ImageBlock, SlotId, TextBlock } from '../types';
import { isImage, isText } from '../types';
import { useEditContext } from '../components/EditContext';
import { ReplaceableArtwork } from '@/shared/artwork/ReplaceableArtwork';
import { useArtworkSlot } from '@/shared/artwork/artworkStore';

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
  /** Stable slide id — needed so edits route back to `setBlock`. */
  slideId: string;
  /** Slot key on the slide's `blocks` map. */
  slot: SlotId;
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
 * Renders an image slot.
 *
 * - In `present` / `thumbnail` mode: `<img>` if a url is set, else
 *   nothing.
 * - In `edit` mode WITHOUT an EditContext: dashed placeholder fallback
 *   (legacy behavior).
 * - In `edit` mode WITH an enabled EditContext: wraps in
 *   `<ReplaceableArtwork>`. Clicking opens the picker; on pick, the
 *   override is mirrored into the deck store as a fresh ImageBlock.
 */
export function SlotImage({
  slideId,
  slot,
  block,
  mode,
  style,
  hint,
  fit,
  shape = 'rect',
}: SlotImageProps) {
  const editCtx = useEditContext();
  const editing = mode === 'edit' && !!editCtx?.enabled;

  if (!editing) {
    return (
      <PresentImage
        block={block}
        mode={mode}
        style={style}
        hint={hint}
        fit={fit}
        shape={shape}
      />
    );
  }

  return (
    <EditableImageSlot
      slideId={slideId}
      slot={slot}
      block={block}
      style={style}
      hint={hint}
      fit={fit}
      shape={shape}
    />
  );
}

function PresentImage({
  block,
  mode,
  style,
  hint,
  fit,
  shape = 'rect',
}: Omit<SlotImageProps, 'slideId' | 'slot'>) {
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

interface EditableImageSlotProps {
  slideId: string;
  slot: SlotId;
  block: Block | undefined;
  style?: CSSProperties;
  hint?: string;
  fit?: 'cover' | 'contain';
  shape?: 'rect' | 'circle';
}

/**
 * Edit-mode image cell.
 *
 * `<ReplaceableArtwork>` already implements the click → ArtworkPicker
 * flow and writes overrides into `useArtworkStore`. Here we:
 *
 *   1. Hand it the deck-store image (wrapped in `<img>`) as children,
 *      or a soft dashed placeholder when no image is set yet.
 *   2. Subscribe to that artwork slot via `useArtworkSlot` and forward
 *      any picked override into the deck store as a fresh ImageBlock.
 *
 * Both stores end up holding the same url; the deck store is the v2
 * source of truth (it auto-saves into `brand.decks[]`). On reload the
 * deck-store value matches what `ReplaceableArtwork` would render so
 * there's no flicker.
 */
function EditableImageSlot({
  slideId,
  slot,
  block,
  style,
  hint,
  fit,
  shape = 'rect',
}: EditableImageSlotProps) {
  const editCtx = useEditContext();
  const url = isImage(block) ? block.url : undefined;
  const alt = isImage(block) ? block.alt : undefined;

  // Scope per-slide so a slot key like `image` or `member1` doesn't
  // collide across slides in the same deck.
  const scopeId = `deck-v2:${slideId}`;
  const slotId = String(slot);
  const [override] = useArtworkSlot(scopeId, slotId);

  // Mirror artwork-store picks into the deck store. Effect runs when
  // the override identity changes; the equality check against the
  // current block url avoids infinite loops on store-write.
  useEffect(() => {
    if (!override) return;
    if (url === override.url) return;
    const next: ImageBlock = {
      kind: 'image',
      url: override.url,
      alt,
      fit: isImage(block) ? block.fit : undefined,
      source: override.source,
      hint: isImage(block) ? block.hint : undefined,
    };
    editCtx?.setBlock(slideId, slot, next);
    // We intentionally only watch override identity — `block` / `url`
    // change on store-write and would re-fire the effect needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override?.url, override?.source]);

  const radius = shape === 'circle' ? '50%' : 'var(--deck-radius, 12px)';
  const wrapperStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: radius,
    overflow: 'hidden',
    ...style,
  };

  // ReplaceableArtwork renders an `<img>` itself when there's an
  // active artwork-store override; when there's none, it renders the
  // children we hand it. We hand it either the deck-store image or a
  // soft placeholder.
  const inner = url ? (
    <img
      src={url}
      alt={alt ?? ''}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: fit ?? (isImage(block) ? block.fit : undefined) ?? 'cover',
        borderRadius: radius,
      }}
    />
  ) : (
    <div
      style={placeholderStyle({
        width: '100%',
        height: '100%',
        borderRadius: radius,
      })}
    >
      <span>{hint ?? 'Click to add image'}</span>
    </div>
  );

  return (
    <ReplaceableArtwork
      slotId={slotId}
      scopeId={scopeId}
      defaultQuery={
        (isImage(block) && (block.hint ?? block.alt)) || hint || 'illustration'
      }
      style={wrapperStyle}
      fit={fit ?? (isImage(block) ? block.fit : undefined) ?? 'cover'}
    >
      {inner}
    </ReplaceableArtwork>
  );
}

/* ─── Text rendering ───────────────────────────────────────────────── */

interface SlotTextProps {
  /** Stable slide id — needed so edits route back to `setBlock`. */
  slideId: string;
  /** Slot key on the slide's `blocks` map. */
  slot: SlotId;
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
 * block.align/weight/color from the block.
 *
 * In present/thumbnail mode (or when no EditContext is enabled), this
 * renders a static element. In edit mode WITH an enabled context, the
 * element is contentEditable and `editCtx.setBlock(slideId, slot, …)`
 * is called on blur. We render the editable element as **uncontrolled**
 * with `key={slideId+slot+block.text}` so the cursor doesn't jump
 * mid-typing — only when the canonical store value changes does the
 * element remount. Same Gamma-style trade-off: keystrokes don't update
 * the store, blur (or Enter) does.
 */
export function SlotText({
  slideId,
  slot,
  block,
  roleClass,
  mode,
  hint,
  style,
  as = 'span',
  align,
}: SlotTextProps) {
  const editCtx = useEditContext();
  const editing = mode === 'edit' && !!editCtx?.enabled;
  const empty = isEmptyText(block);

  if (!editing) {
    return (
      <PresentText
        block={block}
        roleClass={roleClass}
        mode={mode}
        hint={hint}
        style={style}
        as={as}
        align={align}
      />
    );
  }

  const t = isText(block) ? block : undefined;
  const text = t?.text ?? '';
  const Tag = as as keyof JSX.IntrinsicElements;
  const textAlign: CSSProperties['textAlign'] =
    align ?? t?.align ? mapAlign(align ?? t?.align) : undefined;

  return (
    <EditableText
      key={`${slideId}:${slot}:${text}`}
      Tag={Tag}
      initialText={text}
      empty={empty}
      hint={hint}
      roleClass={roleClass}
      style={{
        textAlign,
        fontWeight: t?.weight,
        color: t?.color,
        ...style,
      }}
      onCommit={(nextText) => {
        if (nextText === text) return;
        const base: TextBlock = t
          ? { ...t, text: nextText }
          : {
              kind: 'text',
              text: nextText,
              role: roleFromClass(roleClass),
            };
        editCtx?.setBlock(slideId, slot, base);
      }}
    />
  );
}

function PresentText({
  block,
  roleClass,
  mode,
  hint,
  style,
  as = 'span',
  align,
}: Omit<SlotTextProps, 'slideId' | 'slot'>) {
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

interface EditableTextProps {
  Tag: keyof JSX.IntrinsicElements;
  initialText: string;
  empty: boolean;
  hint?: string;
  roleClass: string;
  style?: CSSProperties;
  onCommit: (next: string) => void;
}

/**
 * The editable text leaf. Uncontrolled — types reflect into the DOM
 * directly until blur. We track hover/focus for a soft outline so the
 * user knows the element is editable; pointerdown/click stop
 * propagation so future "select slide" handlers don't fire.
 */
function EditableText({
  Tag,
  initialText,
  empty,
  hint,
  roleClass,
  style,
  onCommit,
}: EditableTextProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const ringStyle: CSSProperties = empty
    ? {
        opacity: 0.55,
        outline: '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
        outlineOffset: 4,
        borderRadius: 6,
        padding: '2px 8px',
        minWidth: 80,
        display: 'inline-block',
      }
    : hovered || focused
      ? {
          outline: '1.5px solid var(--deck-accent, rgba(0,21,99,0.45))',
          outlineOffset: 3,
          borderRadius: 4,
        }
      : {};

  return (
    <Tag
      className={roleClass}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => {
        setFocused(false);
        const nextText = (e.currentTarget as HTMLElement).innerText.trim();
        if (empty && nextText.length === 0) return;
        onCommit(nextText);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      style={{
        cursor: 'text',
        ...ringStyle,
        ...style,
      }}
      data-editor-chrome="true"
    >
      {empty ? hint ?? 'Click to edit' : initialText}
    </Tag>
  );
}

function mapAlign(a?: 'start' | 'center' | 'end'): CSSProperties['textAlign'] {
  if (a === 'start') return 'left';
  if (a === 'end') return 'right';
  if (a === 'center') return 'center';
  return undefined;
}

/** Translate a deck-{role} class into the matching DeckTypeRole, used
 *  when we synthesize a TextBlock for a previously-empty slot. */
function roleFromClass(cls: string): TextBlock['role'] {
  const m = /^deck-([a-zA-Z0-9]+)$/.exec(cls);
  if (!m) return 'body';
  const role = m[1];
  switch (role) {
    case 'display':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'body':
    case 'caption':
    case 'label':
      return role;
    default:
      return 'body';
  }
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
