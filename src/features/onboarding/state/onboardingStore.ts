/**
 * Transient UI state only.
 *
 * Deliberately holds NO brand values and NO material: those live on the brand
 * and in the Library from the moment they exist (brand-first). What is left is
 * genuinely ephemeral — what is in flight, what the interpreter has said so
 * far, and which direction the user is looking at.
 *
 * Nothing here survives a reload, and nothing needs to: resume reads the step
 * off the brand and re-reads material from the Library.
 */
import { create } from 'zustand';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import type { Proposal } from '../understanding/proposals';
import type { StartingDirection } from '../understanding/interpret';

/** What the understanding pass has said so far, for the transition's lines. */
export interface UnderstandingLine {
  id: string;
  /** Past tense, brand nouns: "Found your logo, and three variants". */
  text: string;
  done: boolean;
}

interface State {
  /** Material in flight, in the order it was supplied. */
  items: OnboardingAsset[];
  /** True while the interpreter is still working. */
  understanding: boolean;
  lines: UnderstandingLine[];
  proposals: Proposal[];
  /** Generated directions, only when the user asked for help starting. */
  directions: StartingDirection[];
  chosenDirection: StartingDirection | null;
  /** Core paths confirmed this session, so the UI can render without refetching. */
  confirmed: Set<string>;
  /** Set when a save could not complete, shown inline and never as a modal. */
  problem: string | null;
}

interface Actions {
  addItem(a: OnboardingAsset): void;
  updateItem(id: string, patch: Partial<OnboardingAsset>): void;
  removeItem(id: string): void;
  setUnderstanding(on: boolean): void;
  addLine(line: UnderstandingLine): void;
  completeLine(id: string): void;
  setProposals(p: Proposal[]): void;
  setDirections(d: StartingDirection[]): void;
  chooseDirection(d: StartingDirection | null): void;
  markConfirmed(paths: string[]): void;
  setProblem(p: string | null): void;
  reset(): void;
}

const initial: State = {
  items: [],
  understanding: false,
  lines: [],
  proposals: [],
  directions: [],
  chosenDirection: null,
  confirmed: new Set(),
  problem: null,
};

export const useOnboardingStore = create<State & Actions>((set, get) => ({
  ...initial,

  addItem: (a) => set({ items: [...get().items, a] }),
  updateItem: (id, patch) =>
    set({ items: get().items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }),
  removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

  setUnderstanding: (understanding) => set({ understanding }),
  addLine: (line) => set({ lines: [...get().lines, line] }),
  completeLine: (id) =>
    set({ lines: get().lines.map((l) => (l.id === id ? { ...l, done: true } : l)) }),

  setProposals: (proposals) => set({ proposals }),
  setDirections: (directions) => set({ directions }),
  chooseDirection: (chosenDirection) => set({ chosenDirection }),

  // A Set, not a count: the UI needs to know WHICH values are settled so a
  // section can show mixed state. A total would only support a progress bar,
  // which this flow deliberately does not have.
  markConfirmed: (paths) => {
    const next = new Set(get().confirmed);
    paths.forEach((p) => next.add(p));
    set({ confirmed: next });
  },

  setProblem: (problem) => set({ problem }),
  reset: () => set({ ...initial, confirmed: new Set() }),
}));
