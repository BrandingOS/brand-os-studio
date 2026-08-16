/**
 * Where you are in the document, and how to get anywhere else.
 *
 * A compact floating card rather than a full bar: it costs a corner instead of
 * a strip, and it states WHERE YOU ARE rather than listing everywhere you could
 * go. That is the reference site's best structural idea.
 *
 * Three things it does that the reference does not, each fixing something that
 * page gets wrong:
 *
 *   It TRACKS. The current section is observed and shown, so a long document
 *   always answers "where am I" without the reader opening anything.
 *
 *   It SHRINKS. The reference keeps a 252px card on a 390px phone — 65% of the
 *   screen, permanently over the content, with no hamburger. Here it collapses
 *   to a pill and the list opens as a sheet.
 *
 *   It shows PROGRESS. A hairline fill across the card, because a document that
 *   can run six thousand pixels should say how much of it is left.
 */
import { useEffect, useState } from 'react';
import type { IdentitySectionId } from '../identityModel';
import { SECTION_LABEL } from '../identityModel';

export interface IdentityNavProps {
  brandName: string;
  sections: IdentitySectionId[];
  /** Rendered at the end of the card — share/edit in Studio, nothing in public. */
  actions?: React.ReactNode;
}

export function IdentityNav({ brandName, sections, actions }: IdentityNavProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<IdentitySectionId | undefined>(sections[0]);
  const [progress, setProgress] = useState(0);

  // Which section is on screen. `-45% 0px -45% 0px` narrows the observation to
  // a band across the middle, so "active" means "what you are reading" rather
  // than "what has touched the viewport edge".
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit?.target.id) setActive(hit.target.id as IdentitySectionId);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id: IdentitySectionId) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="bi-nav" aria-label="Sections">
      <div className="bi-nav-card">
        <span className="bi-nav-brand">
          <span className="bi-nav-brand-name">{brandName}</span>
          <span className="bi-nav-brand-sub">Brand identity</span>
        </span>

        <button
          type="button"
          className="bi-nav-current"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{active ? SECTION_LABEL[active] : 'Overview'}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span className="bi-nav-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </span>

        {actions && <span className="bi-nav-actions">{actions}</span>}
      </div>

      {open && (
        <div className="bi-nav-menu" role="menu">
          {sections.map((id) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={`bi-nav-item${id === active ? ' is-active' : ''}`}
              onClick={() => go(id)}
            >
              {SECTION_LABEL[id]}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

export default IdentityNav;
