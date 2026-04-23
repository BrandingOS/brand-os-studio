import { useCallback, useEffect, useRef, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useBrandStore } from '@/shared/store/brandStore';
import { ensurePairLoaded } from '@/shared/typography';

const DEBOUNCE_MS = 150;

export function useTypescaleDraft(brandId: string | undefined, initial: Typescale) {
  const setTypescale = useBrandStore(s => s.setTypescale);
  const [draft, setDraft] = useState<Typescale>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ensurePairLoaded(initial.fonts); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    ensurePairLoaded(draft.fonts);
  }, [draft.fonts.heading.family, draft.fonts.body.family, draft.fonts.mono?.family]);

  const commit = useCallback((next: Typescale) => {
    if (!brandId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTypescale(brandId, { ...next, updatedAt: new Date().toISOString() });
    }, DEBOUNCE_MS);
  }, [brandId, setTypescale]);

  const update = useCallback((patch: (prev: Typescale) => Typescale) => {
    setDraft(prev => {
      const next = patch(prev);
      commit(next);
      return next;
    });
  }, [commit]);

  return { draft, update };
}
