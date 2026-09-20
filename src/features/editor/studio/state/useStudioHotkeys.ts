// The Studio keyboard layer.
//
// The editor previously handled six shortcuts and every one of them
// required ⌘ — the handler returned early on `if (!meta) return`. So
// Delete did nothing, the arrow keys did nothing, and there was no
// duplicate, copy, paste, select-all, group or order shortcut at all.
//
// Two rules the whole file is built around:
//
//   1. NEVER STEAL A KEY FROM SOMEONE WHO IS TYPING. Inside an input, a
//      textarea, or Fabric's hidden editing textarea, the browser's own
//      behaviour is what the user expects — including ⌘Z, where stealing
//      undo is the fastest way to make an editor infuriating.
//   2. READ-ONLY MEANS READ-ONLY. A viewer keeps zoom, selection and
//      navigation; every mutating binding is simply absent, rather than
//      running and failing at the save.

import { useEffect } from 'react';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import {
  copyLayers,
  cutLayers,
  deleteLayers,
  duplicateLayers,
  groupLayers,
  nudgeLayers,
  orderLayers,
  pasteLayers,
  toggleFlag,
  ungroupLayers,
} from '../ops/layerOps';
import { activePageOf, readStudio } from './studioStore';
import { isTypingTarget, type StudioViewport } from './useStudioViewport';

/** Arrow-key step, and the step with Shift held. */
export const NUDGE_STEP = 1;
export const NUDGE_STEP_LARGE = 10;

interface Options {
  adapter: LayerEditingAdapter | null;
  viewport: StudioViewport;
  onFlushSave: () => void | Promise<void>;
  onToggleShortcuts: () => void;
}

export function useStudioHotkeys({
  adapter,
  viewport,
  onFlushSave,
  onToggleShortcuts,
}: Options): void {
  useEffect(() => {
    if (!adapter) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Rule 1. Note this also covers inline text editing on the canvas:
      // Fabric routes typing through a real (hidden) <textarea>.
      if (isTypingTarget(e.target)) {
        // Escape still has to reach us — it is how you leave the field.
        if (e.key !== 'Escape') return;
      }

      const state = readStudio();
      const page = activePageOf(state);
      const selection = state.selection;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const canEdit = !state.readOnly;
      const pageId = page?.id ?? '';

      // ─── View: always available, even read-only ──────────────────────
      if (mod && (key === '=' || key === '+')) {
        e.preventDefault();
        viewport.zoomIn();
        return;
      }
      if (mod && key === '-') {
        e.preventDefault();
        viewport.zoomOut();
        return;
      }
      if (mod && key === '0') {
        e.preventDefault();
        viewport.fit();
        return;
      }
      if (mod && key === '1') {
        e.preventDefault();
        viewport.actualSize();
        return;
      }

      if (key === 'escape') {
        if (state.editingMasterId) {
          e.preventDefault();
          adapter.exitMasterMode();
          return;
        }
        if (selection.length > 0) {
          e.preventDefault();
          adapter.setSelection([]);
        }
        return;
      }

      if (mod && key === 'a') {
        if (!page) return;
        e.preventDefault();
        adapter.setSelection(
          page.layers.filter((l) => !l.locked && l.visible).map((l) => l.id),
        );
        return;
      }

      if (e.key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        onToggleShortcuts();
        return;
      }

      if (mod && key === 'c') {
        if (page && selection.length > 0) {
          e.preventDefault();
          copyLayers(page, selection);
        }
        return;
      }

      // ─── Everything below mutates ────────────────────────────────────
      if (!canEdit) return;

      if (mod && key === 's') {
        e.preventDefault();
        void onFlushSave();
        return;
      }
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        adapter.undo();
        return;
      }
      if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) {
        e.preventDefault();
        adapter.redo();
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        if (selection.length === 0 || !page) return;
        e.preventDefault();
        deleteLayers(adapter, pageId, selection);
        return;
      }

      if (mod && key === 'd') {
        if (selection.length === 0 || !page) return;
        e.preventDefault();
        duplicateLayers(adapter, pageId, selection);
        return;
      }

      if (mod && key === 'x') {
        if (!page || selection.length === 0) return;
        e.preventDefault();
        cutLayers(adapter, page, selection);
        return;
      }

      if (mod && key === 'v') {
        if (!page) return;
        e.preventDefault();
        pasteLayers(adapter, pageId);
        return;
      }

      if (mod && key === 'g') {
        if (!page) return;
        e.preventDefault();
        if (e.shiftKey) ungroupLayers(adapter, pageId, selection);
        else groupLayers(adapter, pageId, selection);
        return;
      }

      if (mod && key === 'l') {
        if (!page || selection.length === 0) return;
        e.preventDefault();
        toggleFlag(adapter, page, selection, 'locked');
        return;
      }

      // ⌘] / ⌘[ step; add Shift to go all the way.
      if (mod && (e.key === ']' || e.key === '[')) {
        if (!page || selection.length === 0) return;
        e.preventDefault();
        const forward = e.key === ']';
        orderLayers(
          adapter,
          pageId,
          selection,
          e.shiftKey ? (forward ? 'front' : 'back') : forward ? 'forward' : 'backward',
        );
        return;
      }

      if (e.key.startsWith('Arrow')) {
        if (selection.length === 0 || !page) return;
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        if (dx || dy) nudgeLayers(adapter, pageId, selection, dx, dy);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [adapter, viewport, onFlushSave, onToggleShortcuts]);
}

/** The bindings, for the help sheet. Kept beside the handler on purpose. */
export const STUDIO_SHORTCUTS: ReadonlyArray<{
  group: string;
  items: ReadonlyArray<{ keys: string; label: string }>;
}> = [
  {
    group: 'Essentials',
    items: [
      { keys: '⌘Z', label: 'Undo' },
      { keys: '⌘⇧Z', label: 'Redo' },
      { keys: '⌘S', label: 'Save now' },
      { keys: '⌘A', label: 'Select all' },
      { keys: 'Esc', label: 'Deselect' },
      { keys: '?', label: 'Shortcuts' },
    ],
  },
  {
    group: 'Edit',
    items: [
      { keys: '⌫', label: 'Delete' },
      { keys: '⌘D', label: 'Duplicate' },
      { keys: '⌘C / ⌘X / ⌘V', label: 'Copy, cut, paste' },
      { keys: '⌘G', label: 'Group' },
      { keys: '⌘⇧G', label: 'Ungroup' },
      { keys: '⌘L', label: 'Lock / unlock' },
    ],
  },
  {
    group: 'Arrange',
    items: [
      { keys: '←↑→↓', label: 'Nudge 1px' },
      { keys: '⇧ + arrows', label: 'Nudge 10px' },
      { keys: '⌘]', label: 'Bring forward' },
      { keys: '⌘[', label: 'Send backward' },
      { keys: '⌘⇧]', label: 'Bring to front' },
      { keys: '⌘⇧[', label: 'Send to back' },
    ],
  },
  {
    group: 'View',
    items: [
      { keys: '⌘0', label: 'Fit to screen' },
      { keys: '⌘1', label: 'Actual size' },
      { keys: '⌘+ / ⌘−', label: 'Zoom in / out' },
      { keys: '⌘ + scroll', label: 'Zoom at pointer' },
      { keys: 'Space + drag', label: 'Pan' },
      { keys: 'Scroll', label: 'Pan vertically' },
    ],
  },
];
