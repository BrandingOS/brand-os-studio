/**
 * A website address, found in what the user typed.
 *
 * Deterministic and tiny. Social hosts are not websites — the review already
 * knows that rule (`linkKindOf`), and this reuses it rather than keeping a
 * second list of hosts.
 *
 * DISPOSABLE — Gate 2 only. The production home is the understanding layer.
 */
import { linkKindOf } from '@/features/onboarding/bridge/reviewWriteThrough';

const URL_RE = /(?<![\w@.])(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?:\/[^\s)]*)?/gi;

export function detectSiteInText(text: string): string | null {
  for (const m of text.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    const url = `https://${host}`;
    const kind = linkKindOf({
      id: 'probe',
      name: host,
      sub: '',
      kind: 'link',
      previewUrl: null,
      sourceUrl: url,
      uploadStatus: 'done',
      uploadProgress: 1,
    });
    if (kind === 'website') return host;
  }
  return null;
}
