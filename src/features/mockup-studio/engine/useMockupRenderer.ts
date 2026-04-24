/**
 * useMockupRenderer — React lifecycle wrapper around MockupRenderer.
 *
 * We intentionally do NOT use @pixi/react — that package's v8-beta is
 * shaky on React 18 (BrandOS is 18.3.1), and we only need the subset
 * covered here (mount, template swap, state-driven repaint, unmount).
 *
 * Usage:
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   useMockupRenderer(canvasRef, template, state);
 */

import { useEffect, useRef } from 'react';

import { MockupRenderer } from './MockupRenderer';
import type { MockupState, TemplateMeta } from './types';

export function useMockupRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  template: TemplateMeta | null,
  state: MockupState | null,
) {
  const rendererRef = useRef<MockupRenderer | null>(null);
  const mountedRef = useRef(false);
  // Serialize async work so a fast template swap during init doesn't race.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // Mount / unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    mountedRef.current = true;

    const renderer = new MockupRenderer();
    rendererRef.current = renderer;

    queueRef.current = queueRef.current
      .then(() =>
        renderer.init(canvas, {
          width: template.canvas.width,
          height: template.canvas.height,
        }),
      )
      .catch((err) => console.error('[useMockupRenderer] init failed', err));

    return () => {
      mountedRef.current = false;
      // Destroy on the end of the queue to let in-flight async land first.
      queueRef.current = queueRef.current
        .catch(() => {})
        .then(() => renderer.destroy());
      rendererRef.current = null;
    };
    // Only re-init when the canvas element itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current]);

  // Template swap.
  useEffect(() => {
    if (!template) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    queueRef.current = queueRef.current
      .catch(() => {})
      .then(async () => {
        if (!mountedRef.current) return;
        renderer.resize(template.canvas.width, template.canvas.height);
        await renderer.setTemplate(template);
      })
      .catch((err) =>
        console.error('[useMockupRenderer] setTemplate failed', err),
      );
  }, [template]);

  // State update.
  useEffect(() => {
    if (!state || !template) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    queueRef.current = queueRef.current
      .catch(() => {})
      .then(async () => {
        if (!mountedRef.current) return;
        await renderer.applyState(state);
      })
      .catch((err) =>
        console.error('[useMockupRenderer] applyState failed', err),
      );
  }, [state, template]);

  return rendererRef;
}
