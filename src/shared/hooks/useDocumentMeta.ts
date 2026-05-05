// Phase 8.2 — useDocumentMeta hook.
//
// Sets <title>, <meta name="description"> and the OG/Twitter unfurl
// tags directly on document.head. No react-helmet (kept the bundle
// small per the existing project preference). Restores prior values
// on unmount so navigating away from a meta-setting page doesn't
// leave stale tags behind.
//
// SSR caveat: mutating document.head only helps unfurlers that
// execute JS. iMessage/Slack/Twitter all run JS for previews; pure
// HTML-only crawlers (Googlebot, basic Facebook) need server-side
// rendering or a pre-render layer to see these tags. That's out of
// scope for 8.2 but documented so the next phase can tackle it.

import { useEffect } from 'react';

export interface DocumentMeta {
  /** <title>X</title>. Falls back to a sensible default if undefined. */
  title?: string;
  /** <meta name="description"> + og:description + twitter:description. */
  description?: string;
  /** og:image / twitter:image. Absolute URL recommended. */
  image?: string;
  /** og:url. Absolute URL of the current page. Defaults to window.location.href. */
  url?: string;
  /** og:type. Defaults to 'website'. */
  ogType?: 'website' | 'article';
  /** twitter:card. Defaults to 'summary_large_image' when an image
   *  is provided, otherwise 'summary'. */
  twitterCard?: 'summary' | 'summary_large_image';
}

/**
 * Mutate document head meta tags for the lifetime of the calling
 * component. Restores the previous values on unmount.
 */
export function useDocumentMeta(meta: DocumentMeta): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cleanups: Array<() => void> = [];

    if (meta.title !== undefined) {
      const prev = document.title;
      document.title = meta.title;
      cleanups.push(() => {
        document.title = prev;
      });
    }

    const url = meta.url ?? window.location.href;
    const card =
      meta.twitterCard ?? (meta.image ? 'summary_large_image' : 'summary');
    const ogType = meta.ogType ?? 'website';

    const tags: Array<{ kind: 'name' | 'property'; key: string; value: string | undefined }> = [
      { kind: 'name', key: 'description', value: meta.description },
      { kind: 'property', key: 'og:title', value: meta.title },
      { kind: 'property', key: 'og:description', value: meta.description },
      { kind: 'property', key: 'og:image', value: meta.image },
      { kind: 'property', key: 'og:url', value: url },
      { kind: 'property', key: 'og:type', value: ogType },
      { kind: 'name', key: 'twitter:card', value: card },
      { kind: 'name', key: 'twitter:title', value: meta.title },
      { kind: 'name', key: 'twitter:description', value: meta.description },
      { kind: 'name', key: 'twitter:image', value: meta.image },
    ];

    for (const { kind, key, value } of tags) {
      if (value === undefined) continue;
      cleanups.push(setMeta(kind, key, value));
    }

    return () => {
      // Run in reverse so the title restore doesn't get clobbered
      // by an in-flight meta change.
      for (let i = cleanups.length - 1; i >= 0; i--) {
        cleanups[i]();
      }
    };
  }, [
    meta.title,
    meta.description,
    meta.image,
    meta.url,
    meta.ogType,
    meta.twitterCard,
  ]);
}

/**
 * Set or insert a <meta> tag and return a cleanup function that
 * restores the prior value (or removes the tag if it didn't exist).
 */
function setMeta(
  kind: 'name' | 'property',
  key: string,
  value: string,
): () => void {
  const selector = `meta[${kind}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    const prev = existing.content;
    existing.content = value;
    return () => {
      existing.content = prev;
    };
  }
  const tag = document.createElement('meta');
  tag.setAttribute(kind, key);
  tag.setAttribute('content', value);
  document.head.appendChild(tag);
  return () => {
    if (tag.parentNode) tag.parentNode.removeChild(tag);
  };
}
