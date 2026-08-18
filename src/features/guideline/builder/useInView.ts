/**
 * True once an element has come near the viewport, and true forever after.
 *
 * One-way on purpose. A guideline page that scrolls out of view has live
 * inline-editing state and a DOM the user may have just typed into; tearing it
 * down to save a few nodes would throw that away. This only defers the FIRST
 * render, which is where the cost actually is.
 */
import { useEffect, useState, type RefObject } from 'react';

export function useInView(ref: RefObject<Element>, rootMargin = '600px'): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    // jsdom has no IntersectionObserver; rendering everything is the correct
    // fallback for a test environment and for any browser without it.
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
