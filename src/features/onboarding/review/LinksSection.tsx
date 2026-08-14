/**
 * Links — the website and the brand's social presence.
 *
 * The retired links group, with its platform detection restored. Carries no
 * Core proposals: a link is a fact about the business, not a claim about the
 * brand, so there is nothing here to confirm and no "Looks right".
 */
import { useState } from 'react';
import { DsButton, DsInput } from '@/shared/ds';
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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
    setAdding(false);
  };

  return (
    <ReviewCard
      title="Links"
      meta={links.length ? `${links.length} ${links.length === 1 ? 'link' : 'links'}` : undefined}
      empty="No links yet — add your website or a social profile."
      footer={
        adding ? (
          <div className="onb-addlink">
            <DsInput
              value={draft}
              autoFocus
              placeholder="yourbrand.com or a profile URL"
              aria-label="Add a link"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') setAdding(false);
              }}
            />
            <DsButton size="sm" onClick={submit} disabled={!draft.trim()}>Add</DsButton>
            <DsButton size="sm" tone="tertiary" onClick={() => setAdding(false)}>Cancel</DsButton>
          </div>
        ) : (
          <button type="button" className="onb-hint-link" onClick={() => setAdding(true)}>
            Add a link
          </button>
        )
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
