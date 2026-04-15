import type { SearchResult, StockPhoto, StockPhotoProvider } from './types';

const KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;
const BASE = 'https://api.pexels.com/v1';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  avg_color?: string;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    tiny: string;
    small: string;
    medium: string;
    large: string;
    large2x: string;
    original: string;
  };
}

export const pexelsProvider: StockPhotoProvider = {
  id: 'pexels',
  name: 'Pexels',

  isConfigured() {
    return !!KEY;
  },

  async search(query, { page, perPage }): Promise<SearchResult> {
    if (!KEY) throw new Error('Pexels API key missing. Set VITE_PEXELS_API_KEY in .env.');
    const url = `${BASE}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, { headers: { Authorization: KEY } });
    if (!res.ok) throw new Error(`Pexels ${res.status}`);
    const data = (await res.json()) as { total_results: number; photos: PexelsPhoto[] };
    return {
      page,
      perPage,
      total: data.total_results,
      results: data.photos.map((p) => mapPexels(p)),
    };
  },
};

function mapPexels(p: PexelsPhoto): StockPhoto {
  return {
    id: String(p.id),
    provider: 'pexels',
    thumbUrl: p.src.tiny,
    regularUrl: p.src.large,
    fullUrl: p.src.original,
    author: p.photographer,
    authorUrl: p.photographer_url,
    sourceUrl: p.url,
    width: p.width,
    height: p.height,
    color: p.avg_color,
  };
}
