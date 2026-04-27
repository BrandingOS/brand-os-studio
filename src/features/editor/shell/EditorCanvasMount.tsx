// Mounts the editor adapter into a DOM container ref. Loads the
// initial document on mount, unmounts cleanly on unmount.

import { useEffect, useRef } from 'react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';

interface Props {
  adapter: EditorAdapter;
  initialDocument: BrandOSDocument;
}

export function EditorCanvasMount({ adapter, initialDocument }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    void (async () => {
      await adapter.mount(container);
      if (cancelled) {
        adapter.unmount();
        return;
      }
      await adapter.loadDocument(initialDocument);
    })();
    return () => {
      cancelled = true;
      adapter.unmount();
    };
  }, [adapter, initialDocument]);

  return <div ref={containerRef} />;
}
