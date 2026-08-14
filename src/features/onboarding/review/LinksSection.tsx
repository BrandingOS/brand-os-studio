/**
 * Links — the website and the brand's social presence.
 *
 * The retired links group, with its platform detection restored. Carries no
 * Core proposals: a link is a fact about the business, not a claim about the
 * brand, so there is nothing here to confirm and no "Looks right".
 */
import { useState } from 'react';
import { ReviewCard } from './ReviewCard';

export interface BrandLink {
  id: string;
  url: string;
  label: string;
  platform: string;
}

export interface LinksSectionProps {
  links: BrandLink[];
  onAdd(raw: string): void;
  onRemove(id: string): void;
}

/** Reads the platform off a URL. Falls back to the host, never to "unknown". */
export function detectPlatform(url: string): { platform: string; label: string } {
  let host = url.trim().toLowerCase();
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep the raw text — a malformed link is still the user's link */
  }
  const table: Array<[string, string]> = [
    ['instagram.com', 'Instagram'],
    ['linkedin.com', 'LinkedIn'],
    ['x.com', 'X'],
    ['twitter.com', 'X'],
    ['facebook.com', 'Facebook'],
    ['youtube.com', 'YouTube'],
    ['tiktok.com', 'TikTok'],
    ['behance.net', 'Behance'],
    ['dribbble.com', 'Dribbble'],
    ['pinterest.com', 'Pinterest'],
    ['github.com', 'GitHub'],
  ];
  for (const [needle, label] of table) {
    if (host.includes(needle)) return { platform: label.toLowerCase(), label };
  }
  return { platform: 'website', label: 'Website' };
}

export function LinksSection({ links, onAdd, onRemove }: LinksSectionProps) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <ReviewCard
      title="Links"
      meta={links.length ? `${links.length} ${links.length === 1 ? 'link' : 'links'}` : undefined}
      empty="No links added."
      footer={
        <label className="onb-pill onb-pill--add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
          </svg>
          <input
            type="text"
            className="onb-pill-input"
            value={draft}
            placeholder="Paste a URL or @handle"
            aria-label="Add a link"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button type="button" className="onb-act" onClick={submit} disabled={!draft.trim()}>
            + Add
          </button>
        </label>
      }
    >
      {links.length > 0 && (
        <div>
          {links.map((l) => (
            <div className="onb-link" key={l.id}>
              <span className="onb-link-f" aria-hidden="true">{l.label.slice(0, 2).toUpperCase()}</span>
              <b className="onb-link-n">{l.url.replace(/^https?:\/\//i, '')}</b>
              <small className="onb-link-p">{l.label}</small>
              <button type="button" className="onb-file-x" onClick={() => onRemove(l.id)}>
                <span className="sr-only">Remove {l.url}</span>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </ReviewCard>
  );
}
