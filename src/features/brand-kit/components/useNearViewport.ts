/**
 * True once the element has been near the viewport.
 *
 * Every kit surface that paints live artwork needs this, and for the same
 * reason: a renderer is a React tree, not an <img>, so a wall of thirty
 * business cards is thirty renderers mounting in one frame. The overview
 * needed it first (37 cards), and the drilldown needs it more — a family
 * like Envelope or Website has THIRTY designs on one page now that the
 * library is not hidden behind a modal.
 *
 * One-way: an element that has been seen stays mounted, because unmounting
 * on scroll-out would re-run the renderer every time the user scrolled
 * back — the opposite of the saving this exists for. `rootMargin` gives a
 * screen of lead time so artwork is painted before it is looked at.
 *
 * The page scrolls the WINDOW (the drilldown header is `position: sticky`
 * against it), so the default root is the right root here.
 *
 * Where there is no observer (jsdom) it reports true immediately, so unit
 * tests see real artwork rather than an empty box.
 */
import { useEffect, useRef, useState } from 'react';

export function useNearViewport<T extends HTMLElement>(
  /** Skip the wait entirely — for the handful of tiles that are above the
   *  fold by construction, where an observer round-trip would show an
   *  empty box for a frame on a page the user is already looking at. */
  eager = false,
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(eager || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  return [ref, near];
}

export default useNearViewport;
