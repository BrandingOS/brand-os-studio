import type { ReactNode } from 'react';
import type { SocialPlatformId } from '../types';

export interface SocialPlatform {
  id: SocialPlatformId;
  name: string;
  /** URL hostname patterns (any match). */
  hosts: RegExp;
  /** Format a path → handle, e.g. "/yourhandle" → "@yourhandle". */
  extractHandle?: (url: URL) => string | null;
  /** Build a canonical URL from a handle (used when user types just `@name`). */
  fromHandle?: (handle: string) => string;
  icon: ReactNode;
}

const stripAt = (h: string) => h.replace(/^@+/, '').trim();

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    hosts: /(^|\.)instagram\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ? `@${seg}` : null;
    },
    fromHandle: (h) => `https://instagram.com/${stripAt(h)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    hosts: /(^|\.)(twitter|x)\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ? `@${seg}` : null;
    },
    fromHandle: (h) => `https://x.com/${stripAt(h)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2H21l-6.51 7.44L22 22h-6.84l-4.76-6.18L4.83 22H2.07l6.96-7.96L2 2h6.97l4.31 5.7L18.24 2Zm-1.2 18h1.7L7.05 4H5.27l11.78 16Z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    hosts: /(^|\.)linkedin\.com$/i,
    extractHandle: (u) => {
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'in' || p === 'company');
      const seg = idx >= 0 ? parts[idx + 1] : parts[0];
      return seg ? `${seg}` : null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18.34h-2.7V9.67h2.7v8.67Zm-1.35-9.84a1.57 1.57 0 1 1 0-3.13 1.57 1.57 0 0 1 0 3.13Zm11.36 9.84h-2.7v-4.21c0-1.01-.02-2.31-1.41-2.31-1.41 0-1.62 1.1-1.62 2.24v4.28h-2.7V9.67h2.59v1.18h.04c.36-.68 1.24-1.4 2.55-1.4 2.73 0 3.24 1.8 3.24 4.13v4.76Z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: /(^|\.)(youtube\.com|youtu\.be)$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      if (!seg) return null;
      if (seg.startsWith('@')) return seg;
      return seg;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.6A3 3 0 0 0 1 7.2C.5 9.1.5 12 .5 12s0 2.9.6 4.8a3 3 0 0 0 2.1 2.1c1.9.6 8.9.6 8.9.6s7 0 8.9-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.6-4.8ZM9.75 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    hosts: /(^|\.)facebook\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ? seg : null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.56 9.88V14.9H7.9v-2.9h2.54V9.79c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.9h-2.34v6.98A10 10 0 0 0 22 12Z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hosts: /(^|\.)tiktok\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg && seg.startsWith('@') ? seg : seg ? `@${seg}` : null;
    },
    fromHandle: (h) => `https://tiktok.com/@${stripAt(h)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 3a5.5 5.5 0 0 0 4.5 4.5v3.05a8.45 8.45 0 0 1-4.5-1.32v6.93a6.84 6.84 0 1 1-6.84-6.84c.32 0 .64.02.95.07v3.13a3.7 3.7 0 1 0 2.74 3.57V3h3.15Z" />
      </svg>
    ),
  },
  {
    id: 'threads',
    name: 'Threads',
    hosts: /(^|\.)threads\.(net|com)$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg && seg.startsWith('@') ? seg : seg ? `@${seg}` : null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a8 8 0 1 0 5.66 13.66" />
        <path d="M8 13c0-2.5 1.5-4 3.5-4 2.4 0 3.5 1.7 3.5 3.5C15 14.5 13.5 16 11.5 16 9.5 16 8 14.5 8 13Z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    hosts: /(^|\.)github\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ?? null;
    },
    fromHandle: (h) => `https://github.com/${stripAt(h)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56 0-.27-.01-1.18-.02-2.13-3.21.7-3.89-1.36-3.89-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.55A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    ),
  },
  {
    id: 'behance',
    name: 'Behance',
    hosts: /(^|\.)behance\.net$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ?? null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.4 6.5c1.54 0 2.79.77 2.79 2.49 0 1.04-.55 1.86-1.5 2.27 1.34.4 2.09 1.34 2.09 2.85 0 2.16-1.66 3.04-3.62 3.04H2V6.5h7.4Zm-.45 4.04c.97 0 1.62-.4 1.62-1.32 0-.94-.66-1.32-1.66-1.32H4.7v2.64h4.25Zm.27 4.94c1.05 0 1.85-.45 1.85-1.5 0-1.06-.77-1.55-1.79-1.55H4.7v3.05h4.52ZM18.18 8.5c2.71 0 4.07 2.17 4.07 4.55 0 .27-.02.5-.05.7h-6.04c.06 1.5 1.06 2.4 2.4 2.4 1 0 1.62-.42 1.95-1.04h2.07c-.5 1.65-2.07 2.6-4.05 2.6-2.78 0-4.65-1.86-4.65-4.6 0-2.7 1.91-4.61 4.3-4.61Zm-2 3.7h3.97c-.13-1.18-.94-1.95-1.95-1.95-1.13 0-1.85.69-2.02 1.95Zm.86-5.2h4.92v-1.4h-4.92v1.4Z" />
      </svg>
    ),
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    hosts: /(^|\.)dribbble\.com$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ?? null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 22a18 18 0 0 0 6.3-15.5M2.5 9.5C7 9 14 9 19 14M21.5 13.5c-3 1-9 2-13 9.5" />
      </svg>
    ),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    hosts: /(^|\.)pinterest\.(com|co\.[a-z]+)$/i,
    extractHandle: (u) => {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg ?? null;
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.2-2 0-2.9.2-.8 1.3-5 1.3-5s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1 .6 1.9 1.6 1.9 1.9 0 3.4-2 3.4-5 0-2.6-1.9-4.4-4.6-4.4-3.1 0-5 2.4-5 4.8 0 1 .4 2 .8 2.5.1.1.1.2.1.3-.1.4-.3 1-.3 1.2 0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.3 2.7.9.3 2 .5 3 .5 5.5 0 10-4.5 10-10S17.5 2 12 2Z" />
      </svg>
    ),
  },
];

const WEBSITE_PLATFORM: SocialPlatform = {
  id: 'website',
  name: 'Website',
  hosts: /.+/,
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
};

export function detectPlatform(rawUrl: string): { platform: SocialPlatform; handle: string | null; url: string } {
  let url = rawUrl.trim();
  if (!url) return { platform: WEBSITE_PLATFORM, handle: null, url: '' };

  // Bare handle? "@user" — default to instagram, x, or generic
  if (/^@[\w.]{1,30}$/.test(url)) {
    return { platform: SOCIAL_PLATFORMS[0], handle: url, url: SOCIAL_PLATFORMS[0].fromHandle?.(url) ?? '' };
  }

  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { platform: WEBSITE_PLATFORM, handle: null, url };
  }

  const host = parsed.hostname.toLowerCase();
  const platform = SOCIAL_PLATFORMS.find((p) => p.hosts.test(host)) ?? WEBSITE_PLATFORM;
  let handle: string | null = null;
  if (platform.id !== 'website') {
    handle = platform.extractHandle?.(parsed) ?? null;
  } else {
    handle = host.replace(/^www\./, '');
  }
  return { platform, handle, url };
}

export function getPlatform(id: string | undefined): SocialPlatform {
  if (!id) return WEBSITE_PLATFORM;
  return SOCIAL_PLATFORMS.find((p) => p.id === id) ?? WEBSITE_PLATFORM;
}
