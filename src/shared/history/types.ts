/**
 * The undo/redo contract.
 *
 * BrandingOS had NINE independent undo implementations before this file —
 * a Fabric ring buffer, three Fabric-JSON stacks, an IndexedDB HTML snapshot
 * store, two contentEditable innerHTML stacks, and two hand-rolled
 * past/future pairs in zustand stores — with eight `window` keydown listeners
 * between them and four different policies on whether ⌘Z should fire while the
 * user is typing in a field.
 *
 * This does NOT replace them, and deliberately so. Those systems store
 * genuinely different things (document clones, DOM strings, Fabric JSON) with
 * genuinely different flush semantics, and three of them live inside the
 * `stable/editable-export-v1` freeze. A single flat stack over all of that
 * would be exactly the fragile hack we are trying to stop building.
 *
 * What IS shared is the part that should never have been duplicated: WHO the
 * user is undoing in right now, what the keyboard does, and what the UI shows.
 * A surface implements `UndoScope`, registers it while mounted, and the
 * registry arbitrates. Existing systems can adopt this one line at a time —
 * `FabricAdapter` already satisfies the shape.
 */

export interface UndoScope {
  /** Stable id, unique per live scope. Used for registration bookkeeping only. */
  id: string;
  /** What the user is undoing IN — shown in UI, e.g. "Brand guidelines". */
  label: string;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** What the next undo would reverse, for a tooltip or a menu item. */
  undoLabel?(): string | undefined;
  redoLabel?(): string | undefined;
  /**
   * Set when the scope handles its own text editing and wants ⌘Z even while
   * focus is inside a field or a contentEditable region.
   *
   * Default false, which is the safe answer: inside an `<input>` the browser's
   * own undo is what the user expects, and stealing it is the single most
   * common way an app-level undo becomes infuriating. The deck editor's
   * inline text surfaces are the case that needs `true`.
   */
  ownsTextInput?: boolean;
}

/** A scope plus the bookkeeping the registry needs. */
export interface RegisteredScope extends UndoScope {
  /** Monotonic — the most recently registered live scope wins arbitration. */
  seq: number;
}
