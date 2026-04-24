/**
 * Mockup Studio state — Zustand v5 with `devtools` + `persist`.
 *
 * One store per tab. The persist middleware scopes to the current
 * template so a user can come back to a partially-edited mockup.
 * Brand-aware editor ignores persistence on first load — it always
 * starts from `applyBrandKit(template, brand)`.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import {
  createInitialMockupState,
  type MockupState,
  type TemplateMeta,
  type TextLayer,
} from '../engine/types';

export interface MockupStudioState {
  /** Which template is loaded. */
  template: TemplateMeta | null;
  /** Current composited state. */
  mockup: MockupState | null;
  /** Which zone or layer is currently selected, or null for the canvas. */
  selection:
    | { kind: 'zone'; id: string }
    | { kind: 'text'; id: string }
    | null;
  /** Undo / redo stacks. */
  history: MockupState[];
  future: MockupState[];

  // ─── actions ─────────────────────────────────────────────────
  loadTemplate: (template: TemplateMeta, seed?: Partial<MockupState>) => void;
  setZoneDesign: (zoneId: string, designUrl: string | null) => void;
  setZoneTransform: (
    zoneId: string,
    patch: Partial<MockupState['zones'][string]['transform']>,
  ) => void;
  setTint: (regionId: string, color: string) => void;
  setBackground: (bg: MockupState['background']) => void;
  setLightingIntensity: (value: number) => void;
  setPropVisible: (propId: string, visible: boolean) => void;
  addTextLayer: (layer: TextLayer) => void;
  updateTextLayer: (id: string, patch: Partial<TextLayer>) => void;
  deleteTextLayer: (id: string) => void;
  setSelection: (selection: MockupStudioState['selection']) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  /** Swap wholesale (used by applyBrandKit). */
  setState: (next: MockupState) => void;
}

const MAX_HISTORY = 50;

function pushHistory(current: MockupState | null, history: MockupState[]): MockupState[] {
  if (!current) return history;
  const next = [...history, current];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const useMockupStore = create<MockupStudioState>()(
  devtools(
    persist(
      (set, get) => ({
        template: null,
        mockup: null,
        selection: null,
        history: [],
        future: [],

        loadTemplate: (template, seed) => {
          const base = createInitialMockupState(template);
          const merged = seed ? { ...base, ...seed } : base;
          set({
            template,
            mockup: merged,
            history: [],
            future: [],
            selection: null,
          });
        },

        setZoneDesign: (zoneId, designUrl) => {
          const { mockup, history } = get();
          if (!mockup) return;
          const zone = mockup.zones[zoneId];
          if (!zone) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              zones: {
                ...mockup.zones,
                [zoneId]: { ...zone, designUrl },
              },
            },
          });
        },

        setZoneTransform: (zoneId, patch) => {
          const { mockup, history } = get();
          if (!mockup) return;
          const zone = mockup.zones[zoneId];
          if (!zone) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              zones: {
                ...mockup.zones,
                [zoneId]: {
                  ...zone,
                  transform: { ...zone.transform, ...patch },
                },
              },
            },
          });
        },

        setTint: (regionId, color) => {
          const { mockup, history } = get();
          if (!mockup) return;
          const prev = mockup.tints[regionId] ?? { color, visible: true };
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              tints: {
                ...mockup.tints,
                [regionId]: { ...prev, color },
              },
            },
          });
        },

        setBackground: (background) => {
          const { mockup, history } = get();
          if (!mockup) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: { ...mockup, background },
          });
        },

        setLightingIntensity: (value) => {
          const { mockup, history } = get();
          if (!mockup) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              effects: { ...mockup.effects, lightingIntensity: value },
            },
          });
        },

        setPropVisible: (propId, visible) => {
          const { mockup, history } = get();
          if (!mockup) return;
          const prev = mockup.props[propId] ?? { visible: true };
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              props: {
                ...mockup.props,
                [propId]: { ...prev, visible },
              },
            },
          });
        },

        addTextLayer: (layer) => {
          const { mockup, history } = get();
          if (!mockup) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: { ...mockup, textLayers: [...mockup.textLayers, layer] },
          });
        },

        updateTextLayer: (id, patch) => {
          const { mockup, history } = get();
          if (!mockup) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              textLayers: mockup.textLayers.map((t) =>
                t.id === id ? { ...t, ...patch } : t,
              ),
            },
          });
        },

        deleteTextLayer: (id) => {
          const { mockup, history } = get();
          if (!mockup) return;
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: {
              ...mockup,
              textLayers: mockup.textLayers.filter((t) => t.id !== id),
            },
          });
        },

        setSelection: (selection) => set({ selection }),

        undo: () => {
          const { history, future, mockup } = get();
          if (!mockup || history.length === 0) return;
          const prev = history[history.length - 1];
          set({
            history: history.slice(0, -1),
            future: [mockup, ...future],
            mockup: prev,
          });
        },

        redo: () => {
          const { history, future, mockup } = get();
          if (!mockup || future.length === 0) return;
          const [next, ...rest] = future;
          set({
            history: pushHistory(mockup, history),
            future: rest,
            mockup: next,
          });
        },

        reset: () => {
          const { template } = get();
          if (!template) return;
          set({
            mockup: createInitialMockupState(template),
            history: [],
            future: [],
            selection: null,
          });
        },

        setState: (next) => {
          const { mockup, history } = get();
          set({
            history: pushHistory(mockup, history),
            future: [],
            mockup: next,
          });
        },
      }),
      {
        name: 'mockup-studio:draft',
        // Only persist the editable state — history is in-memory.
        partialize: (state) => ({
          template: state.template,
          mockup: state.mockup,
        }),
      },
    ),
    { name: 'mockup-studio' },
  ),
);
