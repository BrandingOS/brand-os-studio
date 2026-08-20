import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { ContentPath } from './paths';
// The `.bk-bind*` rules this component's classNames rely on — moved
// here (2026-08-20) from `brand-kit.css` so they travel with `<Bind>`
// into every consumer, not just the Brand Kit pages that happened to
// import that stylesheet. See content.css's own header for why.
import './content.css';

/**
 * `<Bind>` — the contract between a renderer and the editor.
 *
 * A renderer declares WHICH CONTENT a piece of text is. That is its only
 * obligation; it keeps its own layout, typography and absolute
 * positioning, which is the whole reason these designs are worth keeping.
 *
 *     <Bind path="lineItems.0.label" value={item.label} />
 *
 * What this is NOT: the old path. Edits used to be applied by walking the
 * rendered DOM and string-replacing literals, which is why an edited
 * invoice collided with itself — a substituted string has different
 * metrics from the literal the design was laid out around, and nothing
 * upstream knew the text had changed.
 *
 * Here the content model stays the source of truth in both directions:
 *
 *   • The renderer renders `value` FROM state. Always.
 *   • While a region is focused the browser mutates its text — that is
 *     just how a caret works — but on commit the element is restored to
 *     the value React last rendered BEFORE the new text is handed to
 *     `onCommit`. The transient DOM text is never read as data by anyone
 *     else, and never survives a render.
 *
 * With no provider above it (the drilldown grid, an offscreen export)
 * a Bind is an ordinary span. Bound designs therefore render and
 * rasterise exactly as they did before they were bound.
 */

export type BindContextValue = {
  /** Currently selected content path, or null. */
  selectedPath: ContentPath | null;
  onSelect: (path: ContentPath) => void;
  /** Called with the raw text the user left behind. Coercion is the
   *  model's job, not the caret's. */
  onCommit: (path: ContentPath, text: string) => void;
};

const BindContext = createContext<BindContextValue | null>(null);

export function BindProvider({
  value,
  children,
}: {
  value: BindContextValue;
  children: ReactNode;
}) {
  return <BindContext.Provider value={value}>{children}</BindContext.Provider>;
}

export function useBindContext(): BindContextValue | null {
  return useContext(BindContext);
}

/**
 * How a bound region behaves when its value is longer than the literal
 * the design was drawn around.
 *
 * Structured content fixes the data problem but not the physics: "Jane
 * Smith" and "Bartholomew Vandersteen-Whitfield" do not occupy the same
 * space. These are deliberately cheap — no layout engine, no reflow of
 * the design, just a per-field answer to "what should overflow do here".
 *
 *   • `clamp`  — one line, ellipsis. The safe default: it cannot push a
 *                neighbour, which is the failure the old editor had.
 *   • `shrink` — one line, font-size reduced to fit the parent, down to a
 *                floor. For display text where an ellipsis reads broken.
 *   • `wrap`   — allowed to flow onto more lines. For bodies and
 *                addresses, where the design has vertical room.
 *   • `none`   — no constraint.
 */
export type BindFit = 'clamp' | 'shrink' | 'wrap' | 'none';

const FIT_CLASS: Record<BindFit, string> = {
  clamp: 'bk-bind--clamp',
  shrink: 'bk-bind--shrink',
  wrap: 'bk-bind--wrap',
  none: '',
};

/** How far `shrink` may go before it gives up and clamps instead. */
const MIN_SHRINK = 0.55;

type BindProps = {
  path: ContentPath;
  /** The authoritative string, from content state. */
  value: string;
  fit?: BindFit;
  /** Multi-line editing (a letter body). Enter inserts a newline. */
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Rendered when `value` is empty — keeps a design from collapsing. */
  placeholder?: string;
};

export function Bind({
  path,
  value,
  fit = 'clamp',
  multiline = false,
  className,
  style,
  placeholder,
}: BindProps) {
  const ctx = useBindContext();
  const ref = useRef<HTMLSpanElement | null>(null);
  const editingRef = useRef(false);

  const shown = value.length > 0 ? value : (placeholder ?? '');
  const classes = ['bk-bind', FIT_CLASS[fit], className].filter(Boolean).join(' ');

  useFitToParent(ref, fit === 'shrink', shown);

  const endEdit = useCallback(
    (commit: boolean) => {
      const el = ref.current;
      if (!el || !editingRef.current) return;
      editingRef.current = false;
      const text = el.textContent ?? '';
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-bind-editing');

      // Restore what React last rendered BEFORE committing. React's record
      // of this text node still says `shown`, so if the committed value
      // resolves back to the same string React would make no DOM update
      // and the caret's leftovers would survive. Restoring first means the
      // DOM is always exactly what state says, whatever the commit does.
      if (el.textContent !== shown) el.textContent = shown;
      if (commit && text !== shown) ctx?.onCommit(path, text);
    },
    [ctx, path, shown],
  );

  if (!ctx) {
    // No editing surface above us: an ordinary span. This is the path the
    // drilldown grid and every offscreen export take.
    return (
      <span className={classes} style={style} data-bind={path}>
        {shown}
      </span>
    );
  }

  const selected = ctx.selectedPath === path;

  return (
    <span
      ref={ref}
      className={classes}
      style={style}
      data-bind={path}
      data-bind-selected={selected ? '' : undefined}
      role="textbox"
      tabIndex={0}
      suppressContentEditableWarning
      title={`Edit ${path.split('.').pop()}`}
      onMouseDown={(e) => {
        // Claim the click before the artifact's own background clears the
        // selection, and before a focus-scroll fights the caret.
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect(path);
        const el = ref.current;
        if (!el || editingRef.current) return;
        editingRef.current = true;
        el.setAttribute('contenteditable', 'plaintext-only');
        el.setAttribute('data-bind-editing', '');
        el.focus();
      }}
      onBlur={() => endEdit(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          endEdit(false);
          ref.current?.blur();
          return;
        }
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          endEdit(true);
          ref.current?.blur();
          return;
        }
        if (e.key === 'Enter' && !editingRef.current) {
          // Keyboard users reach a region by tabbing; Enter opens it.
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
    >
      {shown}
    </span>
  );
}

/**
 * Shrink a one-line region until it fits the box its design gave it.
 *
 * Measured against the PARENT rather than the element, because these
 * designs overwhelmingly place auto-width text inside a positioned box —
 * an auto-width span never reports its own overflow, so measuring the
 * element alone would always answer "it fits" right up until it visibly
 * did not.
 */
function useFitToParent(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  value: string,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.removeProperty('--bk-bind-fit');
      return;
    }
    const parent = el.parentElement;
    if (!parent) return;

    const measure = () => {
      el.style.setProperty('--bk-bind-fit', '1');
      const available = parent.clientWidth;
      const needed = el.scrollWidth;
      if (available <= 0 || needed <= 0 || needed <= available) return;
      const ratio = Math.max(MIN_SHRINK, available / needed);
      el.style.setProperty('--bk-bind-fit', String(ratio));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [ref, enabled, value]);
}
