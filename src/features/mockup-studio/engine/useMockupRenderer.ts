/**
 * useMockupRenderer — React lifecycle wrapper around MockupRenderer.
 *
 * We intentionally do NOT use @pixi/react — its v8-beta is shaky on
 * React 18 (BrandingOS is 18.3.1), and we only need the narrow subset
 * covered here (mount, template swap, state-driven repaint, unmount).
 *
 * The canvas is usually mounted conditionally (only when a template is
 * loaded), so we can't key init off `[]` — the canvas ref is null on
 * the first render. We use a callback ref (`attachCanvas`) that wires
 * up the renderer the moment the canvas element lands in the DOM and
 * tears it down when it's removed.
 *
 * Template swaps and state updates serialize through a promise queue
 * so rapid mutations paint in the order they were dispatched, and
 * destroy-mid-applyState can't touch PIXI objects after teardown
 * (the renderer itself has a `destroyed` guard between each await).
 */

import { useCallback, useEffect, useRef } from 'react';

import { MockupRenderer } from './MockupRenderer';
import type { MockupState, TemplateMeta } from './types';

export function useMockupRenderer(
  template: TemplateMeta | null,
  state: MockupState | null,
) {
  const rendererRef = useRef<MockupRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const templateRef = useRef(template);
  templateRef.current = template;

  /**
   * Callback ref — called with the canvas element when it mounts and
   * with `null` when it unmounts. This is the correct way to key
   * lifecycle on the existence of a conditionally-rendered DOM node.
   */
  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    const previous = rendererRef.current;
    canvasRef.current = canvas;

    if (canvas) {
      // Canvas just mounted. Init a fresh renderer.
      const renderer = new MockupRenderer();
      rendererRef.current = renderer;
      const width = templateRef.current?.canvas.width ?? 1600;
      const height = templateRef.current?.canvas.height ?? 1600;
      queueRef.current = queueRef.current
        .catch(() => {})
        .then(() => renderer.init(canvas, { width, height }))
        .catch((err) =>
          console.error('[useMockupRenderer] init failed', err),
        );
    } else {
      // Canvas just unmounted. Destroy the previous renderer on the
      // end of the queue so in-flight async lands first.
      if (previous) {
        queueRef.current = queueRef.current
          .catch(() => {})
          .then(() => previous.destroy());
      }
      rendererRef.current = null;
    }
  }, []);

  // Template swap.
  useEffect(() => {
    if (!template) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    queueRef.current = queueRef.current
      .catch(() => {})
      .then(async () => {
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
        await renderer.applyState(state);
      })
      .catch((err) =>
        console.error('[useMockupRenderer] applyState failed', err),
      );
  }, [state, template]);

  return attachCanvas;
}
