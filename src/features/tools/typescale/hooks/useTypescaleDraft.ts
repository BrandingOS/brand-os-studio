import { useCallback, useEffect, useRef, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useBrandStore } from '@/shared/store/brandStore';
import { ensurePairLoaded } from '@/shared/typography';
import { useToolSession } from '@/features/tools/core/useToolSession';

const DEBOUNCE_MS = 150;

/** The payload we persist to the anonymous session in public mode. */
export interface TypescaleSessionPayload {
  typescale: Typescale;
}

export function useTypescaleDraft(brandId: string | undefined, initial: Typescale) {
  const setTypescale = useBrandStore(s => s.setTypescale);
  const [draft, setDraft] = useState<Typescale>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Public-mode persistence (anonymous session). The hook is always invoked so
  // React's hook-ordering rules are satisfied; we only call `patchSession`
  // when there is no `brandId` (public mode) to avoid polluting storage when
  // mounted in-app.
  const { patchPayload: patchSession } = useToolSession<TypescaleSessionPayload>({
    slug: 'typescale',
    mode: brandId ? 'in-app' : 'public',
    initialPayload: { typescale: initial },
  });

  useEffect(() => { ensurePairLoaded(initial.fonts); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ensurePairLoaded(draft.fonts);
  }, [draft.fonts.heading.family, draft.fonts.body.family, draft.fonts.mono?.family]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    setDraft(initial);
    if (timer.current) clearTimeout(timer.current);
  }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback((next: Typescale) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const ts = { ...next, updatedAt: new Date().toISOString() };
      if (brandId) {
        setTypescale(brandId, ts);
      } else {
        patchSession({ typescale: ts });
      }
    }, DEBOUNCE_MS);
  }, [brandId, setTypescale, patchSession]);

  const update = useCallback((patch: (prev: Typescale) => Typescale) => {
    setDraft(prev => {
      const next = patch(prev);
      commit(next);
      return next;
    });
  }, [commit]);

  return { draft, update };
}
