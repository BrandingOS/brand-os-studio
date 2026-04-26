/**
 * InlineEditableSlide — wraps a slide composition in `EditableSlide`
 * and auto-saves any DOM mutation as the slide's frozen HTML.
 *
 * Reusable across the case-study deck and the pitch deck (and any
 * future fixed-canvas slide system). Provides:
 *   - Click-to-select + FloatingToolbar (via EditableSlide)
 *   - Double-click-to-edit text inline
 *   - Drag/resize for leaf elements
 *   - Per-slide undo/redo snapshot stack with Cmd+Z / Cmd+Shift+Z
 *   - Debounced auto-save (800ms) via the `onSave` callback
 *
 * The component flips between two render modes:
 *   - "react": children are rendered fresh each render
 *   - "frozen": the captured HTML is mounted via dangerouslySetInnerHTML
 *     so React stops reconciling away the user's mutations
 *
 * It transitions from react→frozen on the first user mutation, then
 * from frozen→frozen on every subsequent edit. The `frozenHtml` prop
 * (received from the host) only re-seeds state on RESET (e.g. the user
 * clicked "Reset to template") — auto-save echoes are guarded against.
 *
 * Selection styles (outline, box-shadow, data-original-bg) are stripped
 * from each captured snapshot so click-noise doesn't pollute history.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditableSlide } from './blocks/EditableSlide';

interface InlineEditableSlideProps {
  /** Stable index for keyboard-shortcut gating + observer reset. */
  slideIndex: number;
  /** Previously-saved HTML, if any. Set this back from the host on reset. */
  frozenHtml: string | undefined;
  /** Active = listening for Cmd+Z keyboard shortcuts on this slide only. */
  isActive: boolean;
  /** Frame width in CSS pixels (e.g. 1920 for the deck canvases). */
  width: number;
  /** Frame height in CSS pixels (e.g. 1080). */
  height: number;
  /** Save callback. Called debounced after each edit. */
  onSave: (html: string | undefined) => void;
  /** The React composition to render on first mount. */
  children: ReactNode;
}

export function InlineEditableSlide({
  slideIndex,
  frozenHtml,
  isActive,
  width,
  height,
  onSave,
  children,
}: InlineEditableSlideProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(frozenHtml ?? null);
  const isApplyingRef = useRef(false);
  const didMountRef = useRef(false);

  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  const isHistoryNavRef = useRef(false);

  // Re-seed when the host hands down a new frozenHtml (e.g. brand
  // change or reset). Skip self-save echoes by comparing to the
  // history top.
  useEffect(() => {
    const hist = historyRef.current;
    const currentTop = hist.stack[hist.index];
    if (frozenHtml && currentTop === frozenHtml) return;
    setDocHtml(frozenHtml ?? null);
    historyRef.current = {
      stack: frozenHtml ? [frozenHtml] : [],
      index: frozenHtml ? 0 : -1,
    };
  }, [frozenHtml, slideIndex]);

  // Capture the React-rendered baseline so the user's first edit has
  // something to undo back to. 250ms gives FitText / useLayoutEffects
  // time to settle.
  useEffect(() => {
    if (frozenHtml !== undefined) return;
    const t = setTimeout(() => {
      const baseline = readSlideHtml();
      if (!baseline) return;
      if (historyRef.current.stack.length === 0) {
        historyRef.current = { stack: [baseline], index: 0 };
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, frozenHtml]);

  // Suppress observer reactions to our own swap. Skip the first run.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    isApplyingRef.current = true;
    const t = setTimeout(() => {
      isApplyingRef.current = false;
    }, 60);
    return () => clearTimeout(t);
  }, [docHtml]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const readSlideHtml = (): string | null => {
    const root = containerRef.current;
    if (!root) return null;
    const editableOuter = root.firstElementChild as HTMLElement | null;
    const editableInner = editableOuter?.firstElementChild as HTMLElement | null;
    if (!editableInner) return null;
    const clone = editableInner.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[style*="outline"]').forEach((el) => {
      const e = el as HTMLElement;
      e.style.outline = '';
      e.style.outlineOffset = '';
      e.style.boxShadow = '';
      e.style.borderRadius = '';
      e.removeAttribute('data-original-bg');
    });
    clone.querySelectorAll('.resize-handle').forEach((el) => el.remove());
    return clone.innerHTML;
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (isApplyingRef.current) return;
      if (isHistoryNavRef.current) return;
      const next = readSlideHtml();
      if (next === null) return;
      const hist = historyRef.current;
      if (next === hist.stack[hist.index]) return;
      // CRITICAL: do NOT call setDocHtml(next) here.
      //
      // Why this used to be a bug: the user drags a text element. The first
      // pointermove sets `style.left` on the dragged node. The observer
      // sees the mutation and called setDocHtml(next), which on the next
      // render passed a new `frozenHtml` prop into <EditableSlide>, which
      // re-fed it to `dangerouslySetInnerHTML`. React then REPLACED the
      // entire inner DOM tree — including the node currently being dragged
      // — with a freshly-parsed copy. The drag handler's closure kept
      // holding a reference to the now-detached old node, so subsequent
      // pointermoves wrote `.style.left` to a node that no longer existed
      // visually. End result: "element moves 1px and stops."
      //
      // The DOM is the source of truth between user gestures. We only need
      // to (a) snapshot it for the history/undo stack and (b) persist via
      // onSave. We do NOT need to reseed React's `dangerouslySetInnerHTML`
      // — the live DOM already reflects the user's edit.
      //
      // setDocHtml is still called when the HOST hands down a new
      // frozenHtml prop (reset, brand swap, slide-variant change) — that
      // path is the only legitimate reseed path.
      const trimmed = hist.stack.slice(0, hist.index + 1);
      trimmed.push(next);
      while (trimmed.length > 100) trimmed.shift();
      historyRef.current = { stack: trimmed, index: trimmed.length - 1 };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(next), 800);
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex]);

  // Cmd/Ctrl+Z + Cmd/Ctrl+Shift+Z + Ctrl+Y — only on the active slide.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index <= 0) return;
        const nextIdx = hist.index - 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index >= hist.stack.length - 1) return;
        const nextIdx = hist.index + 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, onSave]);

  return (
    <div ref={containerRef} style={{ width, height, position: 'relative' }}>
      <EditableSlide frozenHtml={docHtml ?? undefined}>
        {docHtml === null ? children : null}
      </EditableSlide>
    </div>
  );
}
