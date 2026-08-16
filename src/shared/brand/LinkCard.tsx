/**
 * A link, shown as a card rather than as a browser.
 *
 * The Website section used to render one big empty frame: a fake chrome, a
 * fake tab strip, and a body that showed either a screenshot or — far more
 * often — a giant letter on grey. A brand with three links got one of them,
 * at the size of a monitor, and the other two as tabs.
 *
 * A link's own metadata is a better answer at a tenth the size. The card shows
 * the favicon, the title, the description and the domain, with the OG image as
 * a thumbnail when the site declares one, and it stays legible when the site
 * declares nothing at all — which is the common case and not an error.
 *
 * Opening it is a separate act: `onOpen` raises the preview drawer, which is
 * where a full-size render belongs.
 */
import { useEffect, useState } from 'react';
import { DsSkeleton } from '@/shared/ds';
import { domainOf, fetchSitePreview, prettyUrl, type SitePreview } from './sitePreview';

export interface LinkCardProps {
  url: string;
  /** Shown while the site's own title is unknown. */
  fallbackTitle?: string;
  onOpen?(preview: SitePreview | null): void;
  onRemove?(): void;
  /** Change the URL behind this card. */
  onReplace?(): void;
}

export function LinkCard({ url, fallbackTitle, onOpen, onRemove, onReplace }: LinkCardProps) {
  const [preview, setPreview] = useState<SitePreview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'bare'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    setPreview(null);
    void fetchSitePreview(url).then((result) => {
      if (!alive) return;
      setPreview(result);
      // "Bare" is not an error. Plenty of sites publish no card metadata, and
      // the domain alone is still a perfectly good link.
      setState(result && (result.title || result.description || result.image) ? 'ready' : 'bare');
    });
    return () => {
      alive = false;
    };
  }, [url]);

  const domain = preview?.domain ?? domainOf(url);
  const title = preview?.title ?? fallbackTitle ?? domain;

  return (
    <div className="link-card" data-state={state}>
      <button
        type="button"
        className="link-card-main"
        onClick={() => onOpen?.(preview)}
        title={`Preview ${prettyUrl(url)}`}
      >
        <span className="link-card-thumb" aria-hidden="true">
          {state === 'loading' ? (
            <DsSkeleton radius={8} style={{ position: 'absolute', inset: 0, height: 'auto' }} />
          ) : preview?.image ? (
            <img
              src={preview.image}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <GlobeMark />
          )}
        </span>

        <span className="link-card-body">
          <span className="link-card-head">
            {preview?.favicon && (
              <img
                className="link-card-favicon"
                src={preview.favicon}
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="link-card-title">
              {state === 'loading' ? <DsSkeleton width={140} height={13} /> : title}
            </span>
          </span>
          {state === 'loading' ? (
            <span className="link-card-desc">
              <DsSkeleton width={220} height={11} />
            </span>
          ) : preview?.description ? (
            <span className="link-card-desc">{preview.description}</span>
          ) : (
            <span className="link-card-desc is-muted">No description published</span>
          )}
          <span className="link-card-domain">{domain}</span>
        </span>
      </button>

      <span className="link-card-actions">
        {onReplace && (
          <button type="button" className="link-card-action" aria-label={`Change ${domain}`} onClick={onReplace}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        <a
          className="link-card-action"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${domain} in a new tab`}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
        </a>
        {onRemove && (
          <button type="button" className="link-card-action" aria-label={`Remove ${domain}`} onClick={onRemove}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </span>
    </div>
  );
}

function GlobeMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
  );
}

export default LinkCard;
