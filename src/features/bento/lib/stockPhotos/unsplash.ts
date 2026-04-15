import type { SearchResult, StockPhoto, StockPhotoProvider } from './types';

const KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;
const BASE = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  urls: { thumb: string; small: string; regular: string; full: string };
  color?: string;
  width: number;
  height: number;
  user: { name: string; links: { html: string } };
  links: { html: string; download_location: string };
}

export const unsplashProvider: StockPhotoProvider = {
  id: 'unsplash',
  name: 'Unsplash',

  isConfigured() {
    return !!KEY;
  },

  async search(query, { page, perPage }): Promise<SearchResult> {
    if (!KEY) throw new Error('Unsplash access key missing. Set VITE_UNSPLASH_ACCESS_KEY in .env.');
    const url = `${BASE}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}` } });
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const data = (await res.json()) as { results: UnsplashPhoto[]; total: number };
    return {
      page,
      perPage,
      total: data.total,
      results: data.results.map((p) => mapUnsplash(p)),
    };
  },
};

function mapUnsplash(p: UnsplashPhoto): StockPhoto {
  return {
    id: p.id,
    provider: 'unsplash',
    thumbUrl: p.urls.thumb,
    regularUrl: p.urls.regular,
    fullUrl: p.urls.full,
    author: p.user.name,
    authorUrl: p.user.links.html,
    sourceUrl: p.links.html,
    width: p.width,
    height: p.height,
    color: p.color,
    trackDownload: async () => {
      // Unsplash API Guideline: trigger a download ping when the image
      // is actually used. Fire-and-forget; failure is non-fatal.
      try {
        await fetch(p.links.download_location, {
          headers: { Authorization: `Client-ID ${KEY}` },
        });
      } catch (err) {
        console.warn('Unsplash download ping failed', err);
      }
    },
  };
}
