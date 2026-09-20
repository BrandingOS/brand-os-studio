// Studio state — the coalescing and the selectors.
//
// These pin the two rules that keep the editor fast: geometry does not
// reach React once per pointer event, and a component only re-renders
// for the slice it actually shows. Both are invisible to a test that
// only checks the final document, which is why they are tested here
// directly.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BrandOSDocument } from '@/features/editor/schema';
import {
  createDocumentSink,
  resetStudio,
  usePageSummaries,
  useSelectedLayers,
  useShallowStudio,
  useStudioStore,
} from './studioStore';

function doc(over: Partial<BrandOSDocument> = {}): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'doc',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages: [
      {
        id: 'p1',
        name: 'Page 1',
        width: 1080,
        height: 1080,
        background: '#fff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: {},
    ...over,
  } as BrandOSDocument;
}

function layer(id: string, x = 0) {
  return {
    id,
    name: id,
    kind: 'shape',
    shape: 'rectangle',
    fill: '#000',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
    transform: { x, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  };
}

afterEach(() => {
  resetStudio();
  vi.restoreAllMocks();
});

describe('createDocumentSink', () => {
  it('collapses a burst into ONE apply per frame', async () => {
    const applied: BrandOSDocument[] = [];
    const sink = createDocumentSink((d) => applied.push(d));

    // What a drag looks like: a document per pointer event.
    for (let i = 0; i < 40; i += 1) {
      sink.push(doc({ id: `frame-${i}` }));
    }
    expect(applied).toHaveLength(0);

    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 0));

    expect(applied).toHaveLength(1);
    // The LAST state wins — an intermediate frame is never what the
    // user is looking at by the time React renders.
    expect(applied[0].id).toBe('frame-39');
    sink.dispose();
  });

  it('flushes on dispose, so the end of a gesture is never dropped', () => {
    const applied: BrandOSDocument[] = [];
    const sink = createDocumentSink((d) => applied.push(d));
    sink.push(doc({ id: 'final' }));
    sink.dispose();
    // Unmounting mid-drag must not lose where the layer ended up.
    expect(applied.map((d) => d.id)).toEqual(['final']);
  });

  it('is quiet when nothing was pushed', () => {
    const applied: BrandOSDocument[] = [];
    const sink = createDocumentSink((d) => applied.push(d));
    sink.dispose();
    expect(applied).toHaveLength(0);
  });
});

describe('useShallowStudio', () => {
  it('does not re-render when a rebuilt list has the same contents', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useShallowStudio((s) => s.selection.map((id) => ({ id })));
    });

    act(() => {
      useStudioStore.getState().setSelection(['a']);
    });
    const after = renders;
    const value = result.current;

    // A store write that produces an EQUAL list — exactly what an
    // adapter emit does on every frame of a drag.
    act(() => {
      useStudioStore.getState().setSelection(['a']);
    });

    expect(renders).toBe(after);
    // …and the same reference, which is what lets zustand bail out.
    expect(result.current).toBe(value);
  });

  it('does re-render when the contents genuinely change', () => {
    const { result } = renderHook(() =>
      useShallowStudio((s) => s.selection.map((id) => ({ id }))),
    );
    act(() => {
      useStudioStore.getState().setSelection(['a']);
    });
    expect(result.current).toEqual([{ id: 'a' }]);
    act(() => {
      useStudioStore.getState().setSelection(['a', 'b']);
    });
    expect(result.current).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});

describe('usePageSummaries', () => {
  it('is stable while a layer MOVES, and changes when one is added', () => {
    const base = doc({
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          width: 1080,
          height: 1080,
          background: '#fff',
          masterPageId: null,
          layers: [layer('a')],
        },
      ],
    } as Partial<BrandOSDocument>);

    const { result } = renderHook(() => usePageSummaries());
    act(() => useStudioStore.getState().setDoc(base));
    const first = result.current;
    expect(first).toEqual([
      { id: 'p1', name: 'Page 1', width: 1080, height: 1080, layerCount: 1 },
    ]);

    // A drag: same pages, a layer at a new x. The pages strip must not
    // re-render for this.
    act(() =>
      useStudioStore.getState().setDoc(
        doc({
          pages: [{ ...base.pages[0], layers: [layer('a', 300)] }],
        } as Partial<BrandOSDocument>),
      ),
    );
    expect(result.current).toBe(first);

    // Adding a layer DOES change the summary.
    act(() =>
      useStudioStore.getState().setDoc(
        doc({
          pages: [{ ...base.pages[0], layers: [layer('a'), layer('b')] }],
        } as Partial<BrandOSDocument>),
      ),
    );
    expect(result.current).not.toBe(first);
    expect(result.current[0].layerCount).toBe(2);
  });
});

describe('useSelectedLayers', () => {
  it('returns the selection in PAINT order, not click order', () => {
    act(() => {
      useStudioStore.getState().setDoc(
        doc({
          pages: [
            {
              id: 'p1',
              name: 'Page 1',
              width: 100,
              height: 100,
              background: '#fff',
              masterPageId: null,
              layers: [layer('a'), layer('b'), layer('c')],
            },
          ],
        } as Partial<BrandOSDocument>),
      );
      useStudioStore.getState().setActivePageId('p1');
    });
    const { result } = renderHook(() => useSelectedLayers());
    act(() => useStudioStore.getState().setSelection(['c', 'a']));
    expect(result.current.map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('is empty with no selection', () => {
    const { result } = renderHook(() => useSelectedLayers());
    expect(result.current).toEqual([]);
  });
});

describe('resetStudio', () => {
  it('leaves nothing from the previous design behind', () => {
    act(() => {
      useStudioStore.getState().setSelection(['a']);
      useStudioStore.getState().setRail('layers');
      useStudioStore.getState().setViewport({ zoom: 4 });
      useStudioStore.getState().setReadOnly(true);
    });
    resetStudio();
    const s = useStudioStore.getState();
    expect(s.selection).toEqual([]);
    expect(s.zoom).toBe(1);
    expect(s.readOnly).toBe(false);
    expect(s.doc).toBeNull();
  });
});
