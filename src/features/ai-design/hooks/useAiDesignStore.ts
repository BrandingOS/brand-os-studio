/**
 * Per-brand AI Design session store.
 *
 * State is kept in memory only — a full persistence layer would require
 * per-project storage (out of scope for v1). Switching brands resets the
 * session.
 */
import { create } from 'zustand';
import type { ChatMessage, DesignNode, SkillId } from '../types';

interface AiDesignState {
  brandSlug: string | null;
  messages: ChatMessage[];
  nodes: DesignNode[];
  isThinking: boolean;
  /** Track selection so the InfiniteCanvas can highlight nodes. */
  selectedNodeId: string | null;
  /** Phase: 'entry' shows the hero input. 'workspace' shows split chat+canvas. */
  phase: 'entry' | 'workspace';
  activeSkill: SkillId | null;
}

interface AiDesignActions {
  init: (brandSlug: string) => void;
  setPhase: (phase: 'entry' | 'workspace') => void;
  setActiveSkill: (skill: SkillId | null) => void;
  addMessage: (msg: ChatMessage) => void;
  addNodes: (nodes: DesignNode[]) => void;
  setThinking: (thinking: boolean) => void;
  selectNode: (id: string | null) => void;
  clearCanvas: () => void;
  moveNode: (id: string, x: number, y: number) => void;
}

const EMPTY: Omit<AiDesignState, 'brandSlug'> = {
  messages: [],
  nodes: [],
  isThinking: false,
  selectedNodeId: null,
  phase: 'entry',
  activeSkill: null,
};

export const useAiDesignStore = create<AiDesignState & AiDesignActions>((set) => ({
  brandSlug: null,
  ...EMPTY,
  init: (brandSlug) =>
    set((s) => (s.brandSlug === brandSlug ? s : { brandSlug, ...EMPTY })),
  setPhase: (phase) => set({ phase }),
  setActiveSkill: (activeSkill) => set({ activeSkill }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  addNodes: (nodes) => set((s) => ({ nodes: [...s.nodes, ...nodes] })),
  setThinking: (isThinking) => set({ isThinking }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  clearCanvas: () => set({ nodes: [], selectedNodeId: null }),
  moveNode: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),
}));
