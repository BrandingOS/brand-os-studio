import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Token ↔ preview linking. One context both columns share: focusing a
 * control on the left sets the active token; TokenAnchors wrapping the
 * matching demo highlight and scroll into view. Hovering an anchor
 * reveals which tokens drive it (title attr — subtle, zero layout
 * noise); clicking its padding jumps back to the left-hand control.
 *
 * Deliberately imports NOTHING from @/shared/ds so it sits outside the
 * tokens.ts HMR chain (applies hot-swap CSS without reloading the page).
 */

interface HighlightApi {
  activeVar: string | null;
  /** Focus a token from the left panel → highlight + scroll the preview. */
  showToken: (cssVar: string | null) => void;
  /** Jump from a preview anchor back to the left-hand control row. */
  focusControl: (cssVar: string) => void;
  registerAnchor: (cssVar: string, el: HTMLElement | null) => void;
  registerControl: (cssVar: string, el: HTMLElement | null) => void;
}

const HighlightContext = createContext<HighlightApi | null>(null);

export function useHighlight(): HighlightApi {
  const ctx = useContext(HighlightContext);
  if (!ctx) throw new Error('useHighlight outside provider');
  return ctx;
}

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [activeVar, setActiveVar] = useState<string | null>(null);
  const anchors = useRef(new Map<string, Set<HTMLElement>>());
  const controls = useRef(new Map<string, HTMLElement>());

  const registerAnchor = useCallback((cssVar: string, el: HTMLElement | null) => {
    let set = anchors.current.get(cssVar);
    if (!set) anchors.current.set(cssVar, (set = new Set()));
    if (el) set.add(el);
  }, []);

  const registerControl = useCallback((cssVar: string, el: HTMLElement | null) => {
    if (el) controls.current.set(cssVar, el);
  }, []);

  const showToken = useCallback((cssVar: string | null) => {
    setActiveVar(cssVar);
    if (!cssVar) return;
    const set = anchors.current.get(cssVar);
    const first = set?.values().next().value;
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const focusControl = useCallback((cssVar: string) => {
    setActiveVar(cssVar);
    const el = controls.current.get(cssVar);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.animate(
      [{ backgroundColor: 'var(--ds-surface-hover)' }, { backgroundColor: 'transparent' }],
      { duration: 1200, easing: 'ease-out' },
    );
  }, []);

  const api = useMemo(
    () => ({ activeVar, showToken, focusControl, registerAnchor, registerControl }),
    [activeVar, showToken, focusControl, registerAnchor, registerControl],
  );
  return <HighlightContext.Provider value={api}>{children}</HighlightContext.Provider>;
}

/** Wraps a demo; highlights when any of its tokens is selected on the left. */
export function TokenAnchor({
  vars,
  children,
  block,
}: {
  vars: string[];
  children: React.ReactNode;
  /** Render as block (full width) instead of inline-flex. */
  block?: boolean;
}) {
  const { activeVar, registerAnchor, focusControl } = useHighlight();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const v of vars) registerAnchor(v, ref.current);
  }, [vars, registerAnchor]);
  const active = activeVar !== null && vars.includes(activeVar);
  return (
    <div
      ref={ref}
      title={`Controlled by: ${vars.join(' · ')} — click to jump to the control`}
      onClick={(e) => {
        // Only treat clicks on the wrapper padding as "jump to control" —
        // interactive children keep their own behavior.
        if (e.target === e.currentTarget) focusControl(vars[0]);
      }}
      style={{
        display: block ? 'block' : 'inline-flex',
        flexDirection: block ? undefined : 'column',
        borderRadius: 10,
        outline: active ? '2px dashed var(--ds-accent)' : '2px dashed transparent',
        outlineOffset: 4,
        transition: 'outline-color 200ms var(--ds-ease)',
      }}
    >
      {children}
    </div>
  );
}
