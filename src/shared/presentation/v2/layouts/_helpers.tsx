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
    // In edit mode, render an UNOBTRUSIVE placeholder — a tiny "+"
    // affordance, not the hint text. Showing the hint as visible
    // content (e.g. "SECTION LABEL", "Click to edit") makes the slide
    // look like it has content when it doesn't. Hint becomes a
    // tooltip via `title` attribute so the user still gets context.
    const Tag = as as keyof JSX.IntrinsicElements;
    return (
      <Tag
        className={roleClass}
        title={hint ?? 'Click to edit'}
        aria-label={hint ?? 'Click to edit'}
        style={{
          opacity: 0,
          minWidth: 60,
          minHeight: '1em',
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 6,
          border: '1px dashed transparent',
          transition: 'opacity 0.15s ease, border-color 0.15s ease',
          ...style,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0.5';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--deck-border-subtle, rgba(0,21,99,0.25))';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0';
          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}
      >
        +
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

/* ─── Decorative primitives (shared across layouts) ───────────────── */

/**
 * Massive slide-number watermark (e.g. "01") rendered behind layout
 * content. Pure decoration — `aria-hidden`. Position via `style`.
 *
 * Default styling: 14rem display weight, 6% accent opacity. Layouts can
 * override `size` (rem) and `opacity` (0–1) for variation.
 */
export function NumeralWatermark({
  index,
  size = 16,
  opacity = 0.06,
  style,
}: {
  index: number;
  size?: number;
  opacity?: number;
  style?: CSSProperties;
}) {
  const padded = String(index).padStart(2, '0');
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        fontFamily: 'var(--deck-font-display)',
        fontWeight: 800,
        fontSize: `${size}rem`,
        lineHeight: 0.85,
        color: 'var(--deck-accent)',
        opacity,
        userSelect: 'none',
        pointerEvents: 'none',
        letterSpacing: '-0.04em',
        ...style,
      }}
    >
      {padded}
    </span>
  );
}

/**
 * Section label with leading accent rule. Renders the supplied text
 * via SlotText (so it's editable in edit mode) preceded by a 24×2px
 * accent line. Pair with any role='label' slot.
 */
export function LabelWithRule({
  slideId,
  slot,
  block,
  mode,
  hint,
  align = 'start',
  style,
}: {
  slideId: string;
  slot: SlotId;
  block: Block | undefined;
  mode: 'present' | 'edit' | 'thumbnail';
  hint?: string;
  align?: 'start' | 'center' | 'end';
  style?: CSSProperties;
}) {
  const empty = isEmptyText(block);
  // Hide the WHOLE row (rule + label) when the slot is empty — even
  // in edit mode. Showing the accent rule beside an invisible "+"
  // makes the slide look like it has a stray decorative line for
  // no reason. Users discover label slots through the layout/template
  // catalog, not by clicking floating accent dashes.
  if (empty) return null;

  const justify =
    align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        justifyContent: justify,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 28,
          height: 2,
          background: 'var(--deck-accent)',
          borderRadius: 999,
          flexShrink: 0,
        }}
      />
      <SlotText
        slideId={slideId}
        slot={slot}
        block={block}
        roleClass="deck-label"
        mode={mode}
        as="span"
        hint={hint ?? 'LABEL'}
        style={{ color: 'var(--deck-accent)', letterSpacing: '0.16em' }}
      />
    </div>
  );
}

/**
 * Decorative empty-image placeholder used in present/edit mode when an
 * image slot has no URL. Replaces the dashed-border + text design with
 * a soft tinted card holding a dot grid and a hairline "+" mark.
 *
 * Layouts pass it the same `style` they'd give to `<SlotImage>`. The
 * variant param lets each layout vary the look slightly so a 6-tile
 * gallery doesn't render six identical placeholders.
 */
export function ImagePlaceholder({
  variant = 0,
  shape = 'rect',
  style,
}: {
  /** 0–5: rotates accent block style for visual rhythm. */
  variant?: number;
  shape?: 'rect' | 'circle';
  style?: CSSProperties;
}) {
  const radius = shape === 'circle' ? '50%' : 'var(--deck-radius, 12px)';
  // Subtle dot-grid via repeating radial gradient.
  const dotGrid =
    'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--deck-accent) 28%, transparent) 1px, transparent 1.5px)';
  const dotSize = '14px 14px';

  // Variant flourish — a corner block, an offset circle, a diagonal
  // gradient sliver. Stays in accent color at low opacity.
  const corner: CSSProperties = (() => {
    switch (variant % 6) {
      case 0:
        return {
          position: 'absolute',
          right: 12,
          bottom: 12,
          width: '36%',
          height: '36%',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--deck-accent) 22%, transparent), transparent 70%)',
          borderRadius: shape === 'circle' ? '50%' : 'var(--deck-radius, 12px)',
        };
      case 1:
        return {
          position: 'absolute',
          left: 14,
          top: 14,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--deck-accent) 18%, transparent)',
        };
      case 2:
        return {
          position: 'absolute',
          right: 0,
          top: 0,
          width: '40%',
          height: 4,
          background: 'var(--deck-accent)',
          opacity: 0.6,
        };
      case 3:
        return {
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 4,
          height: '50%',
          background: 'var(--deck-accent)',
          opacity: 0.55,
        };
      case 4:
        return {
          position: 'absolute',
          right: 24,
          top: 24,
          width: 36,
          height: 36,
          border: '2px solid color-mix(in srgb, var(--deck-accent) 45%, transparent)',
          borderRadius: 6,
          transform: 'rotate(12deg)',
        };
      default:
        return {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '52%',
          height: '52%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--deck-accent) 14%, transparent) 0%, transparent 70%)',
        };
    }
  })();

  // Per-variant gradient halo position so a 6-tile gallery doesn't
  // render six identical placeholders.
  const haloPositions = ['top left', 'top right', 'bottom right', 'bottom left', 'center', 'top'];
  const haloPos = haloPositions[variant % haloPositions.length];

  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'color-mix(in srgb, var(--deck-bg-card) 70%, var(--deck-bg-page))',
        borderRadius: radius,
        overflow: 'hidden',
        border:
          '1px solid color-mix(in srgb, var(--deck-accent) 12%, transparent)',
        ...style,
      }}
    >
      {/* Soft radial halo seeded by variant */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at ${haloPos}, color-mix(in srgb, var(--deck-accent) 9%, transparent), transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: dotGrid,
          backgroundSize: dotSize,
          opacity: 0.55,
        }}
      />
      <div style={corner} />
      {/* Centered "+" with dashed-circle aura + caption underneath */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Faint dashed aura ring */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border:
                '1px dashed color-mix(in srgb, var(--deck-accent) 28%, transparent)',
              opacity: 0.7,
            }}
          />
          {/* Tinted center disc */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background:
                'color-mix(in srgb, var(--deck-accent) 14%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--deck-accent) 30%, transparent)',
            }}
          />
          {/* Plus glyph */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'relative',
              color: 'var(--deck-accent)',
              opacity: 0.4,
            }}
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'var(--deck-font-caption, inherit)',
            color: 'var(--deck-color-caption, rgba(0,21,99,0.55))',
            opacity: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          Drop image or click
        </span>
      </div>
    </div>
  );
}

/**
 * A thin accent rule (full width or capped) rendered as a flexible
 * divider. Use as a horizontal accent line below titles or between
 * sections.
 */
export function AccentRule({
  width = 96,
  height = 4,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
        height,
        background: 'var(--deck-accent)',
        borderRadius: 999,
        ...style,
      }}
    />
  );
}

/**
 * Soft radial-gradient backdrop in brand accent. Drop into a layout's
 * absolute-positioned background slot. Pure decoration.
 */
export function AccentRadialBackdrop({
  position = 'top-left',
  intensity = 0.08,
  style,
}: {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  intensity?: number;
  style?: CSSProperties;
}) {
  const map: Record<string, string> = {
    'top-left': '20% 15%',
    'top-right': '85% 15%',
    'bottom-left': '15% 85%',
    'bottom-right': '85% 85%',
    center: '50% 50%',
  };
  const stop = `color-mix(in srgb, var(--deck-accent) ${Math.round(
    intensity * 100,
  )}%, transparent)`;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at ${map[position]}, ${stop} 0%, transparent 55%)`,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

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
