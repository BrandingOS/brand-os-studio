/**
 * Selecting projects on the dashboard.
 *
 * Three ways in, because people arrive with three different habits and all of
 * them are right: a checkbox on the card, a modifier-click (⌘ to add one, Shift
 * to take a run), and a rubber band dragged across the grid. They share one
 * piece of state so they compose — band a group, then ⌘-click to drop one out
 * of it.
 *
 * The anchor is what makes Shift mean anything. It is the last card touched
 * WITHOUT Shift, so a run always extends from where the user last committed,
 * not from wherever the list happens to start.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface ProjectSelection {
  ids: ReadonlySet<string>;
  count: number;
  active: boolean;
  isSelected: (id: string) => boolean;
  /** A plain click on a card's checkbox, or a ⌘/Ctrl-click on the card. */
  toggle: (id: string) => void;
  /** Shift-click: everything between the anchor and here. */
  extendTo: (id: string, order: string[]) => void;
  /** What a rubber band decides, replacing whatever it covered last frame. */
  setBand: (ids: string[], additive: boolean) => void;
  /** The band gesture is over; the next one starts from the new selection. */
  endBand: () => void;
  selectOnly: (id: string) => void;
  clear: () => void;
}

export function useProjectSelection(): ProjectSelection {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const anchorRef = useRef<string | undefined>(undefined);
  // What was selected when the current band started, so dragging with a
  // modifier ADDS to a selection instead of replacing it.
  const bandBaseRef = useRef<ReadonlySet<string> | undefined>(undefined);

  const toggle = useCallback((id: string) => {
    anchorRef.current = id;
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const extendTo = useCallback((id: string, order: string[]) => {
    const anchor = anchorRef.current;
    const to = order.indexOf(id);
    if (to < 0) return;
    const from = anchor ? order.indexOf(anchor) : -1;
    // No anchor yet: Shift-click behaves like a plain click rather than
    // silently selecting from the top of a list the user never touched.
    const [lo, hi] = from < 0 ? [to, to] : from <= to ? [from, to] : [to, from];
    setIds((prev) => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i += 1) next.add(order[i]!);
      return next;
    });
  }, []);

  const setBand = useCallback((banded: string[], additive: boolean) => {
    setIds((prev) => {
      if (bandBaseRef.current === undefined) bandBaseRef.current = additive ? prev : new Set();
      const base = bandBaseRef.current;
      const next = new Set(base);
      for (const id of banded) next.add(id);
      return next;
    });
  }, []);

  const selectOnly = useCallback((id: string) => {
    anchorRef.current = id;
    setIds(new Set([id]));
  }, []);

  const endBand = useCallback(() => {
    bandBaseRef.current = undefined;
  }, []);

  const clear = useCallback(() => {
    anchorRef.current = undefined;
    bandBaseRef.current = undefined;
    setIds(new Set());
  }, []);

  return useMemo(
    () => ({
      ids,
      count: ids.size,
      active: ids.size > 0,
      isSelected: (id: string) => ids.has(id),
      toggle,
      extendTo,
      setBand,
      endBand,
      selectOnly,
      clear,
    }),
    [ids, toggle, extendTo, setBand, endBand, selectOnly, clear],
  );
}
