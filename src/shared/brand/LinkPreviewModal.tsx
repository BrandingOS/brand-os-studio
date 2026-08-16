/**
 * Looking at a link without leaving the page.
 *
 * The site renders in a SANDBOXED iframe: it may run scripts and paint, and
 * that is all. No same-origin access, no top-level navigation, no forms, no
 * popups — the page it is embedded in stays the page it is embedded in.
 *
 * ── Why the fallback is the interesting half ──────────────────────────────
 *
 * Most sites worth linking to refuse to be framed, and a page CANNOT reliably
 * find out. `X-Frame-Options` and `frame-ancestors` are enforced by the browser,
 * which then loads its own error page into the frame — and that fires `load`
 * exactly like a successful navigation. Reading inside to check is impossible
 * too: `contentDocument` is null for a refused frame and for a perfectly
 * healthy cross-origin one alike. There is no signal here, only the appearance
 * of one, and building on it produces a viewer that swears the page is fine
 * while showing a broken-document glyph.
 *
 * What CAN be observed is how long it took. A refusal page is generated
 * locally and arrives almost instantly; a real page has to cross the network
 * first. That is a heuristic and is treated as one — it decides which view to
 * OFFER, never what is true, and every branch leaves the user in control:
 *
 *   nothing loads          →  the site's own card, and a button that opens it
 *   loads suspiciously fast →  the same card, plus "show it here anyway"
 *   loads normally         →  the page, plus a standing escape hatch, because
 *                             the guess above can be wrong in either direction
 *
 * A user who can see the site sees the site. A user who cannot is one click
 * from it and is told why. Nobody is left looking at a broken-document glyph
 * wondering whether to keep waiting.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DsButton } from '@/shared/ds';
import { domainOf, prettyUrl, type SitePreview } from './sitePreview';

/** How long a frame gets to paint before the fallback is offered. */
const EMBED_GRACE_MS = 2600;

/**
 * A load this fast did not cross the network.
 *
 * The browser's own refusal page is local, so it arrives in a few
 * milliseconds. A real site — DNS, TLS, HTML, first paint — effectively never
 * does. Generous on purpose: guessing "blocked" for a very fast real site
 * costs one click on "show it here anyway", while guessing "fine" for a
 * blocked one costs a broken-document glyph and no explanation.
 */
const SUSPICIOUSLY_FAST_MS = 400;

export interface LinkPreviewModalProps {
  url: string | null;
  preview?: SitePreview | null;
  onClose(): void;
}

export function LinkPreviewModal({ url, preview, onClose }: LinkPreviewModalProps) {
  const [phase, setPhase] = useState<'loading' | 'shown' | 'blocked'>('loading');
  /** Set when the user has said "show it here anyway" — the guess is overridden. */
  const [forced, setForced] = useState(false);
  const framePainted = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!url) return;
    setPhase('loading');
    setForced(false);
    framePainted.current = false;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => {
      // No load event by now means the browser refused the frame — or the site
      // is simply very slow, which looks identical from here and is served just
      // as well by offering the tab.
      if (!framePainted.current) setPhase('blocked');
    }, EMBED_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  if (!url || typeof document === 'undefined') return null;
  const domain = preview?.domain ?? domainOf(url);

  return createPortal(
    <div className="link-preview-scrim" role="presentation" onClick={onClose}>
      <div
        className="link-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${domain}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="link-preview-head">
          {preview?.favicon && (
            <img className="link-preview-favicon" src={preview.favicon} alt="" />
          )}
          <span className="link-preview-title">{preview?.title || domain}</span>
          <span className="link-preview-url">{prettyUrl(url)}</span>
          <a
            className="link-preview-open"
            href={url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open in new tab
          </a>
          <button type="button" className="link-preview-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="link-preview-body">
          {phase !== 'blocked' && (
            <iframe
              className="link-preview-frame"
              src={url}
              title={`${domain} preview`}
              /*
               * The frame may paint and run its own scripts. It may not reach
               * this document, navigate the tab it sits in, submit forms, open
               * windows, or download anything.
               *
               * `allow-same-origin` is deliberately absent: paired with
               * `allow-scripts` it lets a same-origin document remove its own
               * sandbox, and nothing here needs to read inside the frame.
               */
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={() => {
                framePainted.current = true;
                const elapsed = Date.now() - startedAt.current;
                // Too fast to have been fetched — almost certainly the
                // browser's refusal page. Offer the clean card instead of the
                // glyph, unless the user has already overruled the guess.
                setPhase(!forced && elapsed < SUSPICIOUSLY_FAST_MS ? 'blocked' : 'shown');
              }}
            />
          )}

          {phase === 'loading' && (
            <div className="link-preview-state" aria-live="polite">
              <span className="link-preview-spinner" aria-hidden="true" />
              <p>Loading {domain}…</p>
            </div>
          )}

          {/*
            The standing escape hatch.
            
            Shown once something has loaded, because "something" may be the
            browser's own refusal page — which is indistinguishable from the
            real site from in here. Rather than guess, say so and offer the way
            through.
          */}
          {phase === 'shown' && (
            <div className="link-preview-escape" role="note">
              <span>Page not showing? {domain} may block embedding.</span>
              <a href={url} target="_blank" rel="noreferrer noopener">
                Open in new tab
              </a>
            </div>
          )}

          {phase === 'blocked' && (
            <div className="link-preview-state">
              {preview?.image ? (
                <img className="link-preview-shot" src={preview.image} alt="" />
              ) : null}
              <h3>{preview?.title || domain}</h3>
              <p>
                {preview?.description ??
                  `${domain} doesn’t allow itself to be embedded in another page.`}
              </p>
              <DsButton
                tone="primary"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                Open website in new tab
              </DsButton>
              {/* The guess above is a heuristic, so it is always overridable. */}
              <button
                type="button"
                className="link-preview-anyway"
                onClick={() => {
                  setForced(true);
                  setPhase('shown');
                }}
              >
                Show it here anyway
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default LinkPreviewModal;
