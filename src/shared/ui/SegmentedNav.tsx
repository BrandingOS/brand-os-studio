// SegmentedNav — the cosmos pill nav, reusable across surfaces.
//
// Step 5/7 fix 2: the editor's top-bar previously inlined its own
// pill markup. The visual was already correct (it used the same
// cosmos `.segmented-nav-*` classes as /setup), but the duplication
// meant any future tweak to the nav would need patches in two
// places. This module is the single source.
//
// Two modes share the same animated pill + open keyframe:
//
//   • route mode — items carry `to` paths; selection is driven by
//     React Router's NavLink isActive. Used by CosmosWorkspaceShell
//     for the workspace-level tabs (Setup / Brand Kit / Guideline /
//     Design / Tools).
//
//   • state mode — items carry an `id`; the consumer manages
//     activeId and onChange. Used by the editor's Edit / Preview /
//     Comments pill.
//
// Both modes expose the same data attributes for tests:
//   [data-segmented-nav]                   — the <nav> root
//   [data-segmented-nav-item="<id|to>"]    — each item
//   [data-segmented-nav-pill]              — the moving pill

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/** Persists across remounts so the pill picks up where it left off
 *  on the next route/tab change instead of cold-starting. Module-
 *  scoped on purpose: the cache is per-app, not per-instance. */
type PillStyle = { left: number; width: number };
let lastPillStyle: PillStyle | null = null;
let hasOpenedOnce = false;

export type SegmentedNavRouteItem = {
  label: ReactNode;
  to: string;
  end?: boolean;
};

export type SegmentedNavStateItem = {
  id: string;
  label: ReactNode;
};

interface RouteProps {
  mode: 'route';
  items: SegmentedNavRouteItem[];
  ariaLabel: string;
  className?: string;
}

interface StateProps {
  mode: 'state';
  items: SegmentedNavStateItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

type Props = RouteProps | StateProps;

export function SegmentedNav(props: Props) {
  const navRef = useRef<HTMLElement | null>(null);
  const [pillStyle, setPillStyle] = useState<PillStyle | null>(lastPillStyle);
  const [shouldAnimateOpen] = useState(() => !hasOpenedOnce);

  // The dependency that drives a re-measure. Route mode → location;
  // state mode → activeId. Used as a useEffect dep below so the
  // effect runs ONLY when the active item actually changes — never
  // on every render (that would produce an infinite setPillStyle
  // loop because the new {left,width} object identity always differs
  // from the previous, even when values match).
  const location = useLocation();
  const reflowTrigger =
    props.mode === 'state' ? props.activeId : location.pathname;

  const measurePill = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('.segmented-nav-item.is-active');
    if (!active) return;
    // Layout offsets (NOT getBoundingClientRect) — immune to the
    // open keyframe's `scale(0.96)` that briefly distorts the rect.
    const next = { left: active.offsetLeft, width: active.offsetWidth };
    lastPillStyle = next;
    setPillStyle((prev) =>
      prev && prev.left === next.left && prev.width === next.width
        ? prev
        : next,
    );
  }, []);

  useEffect(() => {
    hasOpenedOnce = true;
  }, []);

  useEffect(() => {
    measurePill();
  }, [reflowTrigger, measurePill]);

  useEffect(() => {
    window.addEventListener('resize', measurePill);
    return () => window.removeEventListener('resize', measurePill);
  }, [measurePill]);

  return (
    <nav
      ref={navRef}
      className={`segmented-nav${shouldAnimateOpen ? ' is-opening' : ''}${
        props.className ? ` ${props.className}` : ''
      }`}
      aria-label={props.ariaLabel}
      data-segmented-nav
    >
      {pillStyle && (
        <span
          className="segmented-nav-pill"
          aria-hidden
          data-segmented-nav-pill
          style={{
            transform: `translateX(${pillStyle.left}px)`,
            width: pillStyle.width,
          }}
        />
      )}
      {props.mode === 'route'
        ? props.items.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              data-segmented-nav-item={tab.to}
              className={({ isActive }) =>
                `segmented-nav-item${isActive ? ' is-active' : ''}`
              }
            >
              {tab.label}
            </NavLink>
          ))
        : props.items.map((tab) => {
            const isActive = tab.id === props.activeId;
            return (
              <button
                key={tab.id}
                type="button"
                data-segmented-nav-item={tab.id}
                className={`segmented-nav-item${isActive ? ' is-active' : ''}`}
                onClick={() => props.onChange(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
    </nav>
  );
}
