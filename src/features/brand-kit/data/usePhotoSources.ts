/**
 * "Does this brand have photography?", answered HONESTLY on first paint.
 *
 * `hasRealPhotos` is deliberately optimistic: a source nobody has failed to
 * load yet counts as a photograph, because refusing to show a picture we
 * have not tried is worse than showing it. That is right for a tile and
 * wrong for a COUNT — skam's sidebar read **37 / 37 with Photos ticked**
 * while the card beside it said "No photography yet" (QA Q15), because the
 * only thing that ever measured a source was a tile's own `<img>` error,
 * and the sidebar neither triggered it nor heard about it.
 *
 * This hook is the two halves that were missing: it ASKS for the
 * measurement on mount, and it re-renders when an answer changes. Anything
 * that reports on the brand's photography — a counter, a badge, a menu —
 * should call it rather than reading the cache once and believing it.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { photoSourceVersion, probePhotoSources, subscribePhotoSources } from './photoExport';

/**
 * Subscribe to the photo-source cache and probe this brand's sources.
 *
 * Returns the cache version — a value that changes when an answer does, so
 * a component may use it as a dependency. Callers normally ignore it and
 * simply call `hasRealPhotos` afterwards, which is now correct because the
 * re-render has happened.
 */
export function usePhotoSources(brand: MockBrand | null | undefined): number {
  const version = useSyncExternalStore(subscribePhotoSources, photoSourceVersion, () => 0);
  const photos = (brand?.photos ?? []).map((p) => p?.src ?? '').join('|');
  useEffect(() => {
    probePhotoSources(brand);
    // The SOURCES are the dependency, not the brand object: a MockBrand is
    // rebuilt on every render of the page above, and probing per render
    // would issue one request per paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);
  return version;
}
