import type { SearchResult, StockPhoto, StockPhotoProvider } from './types';

const KEY = import.meta.env.VITE_PIXABAY_API_KEY as string | undefined;
const BASE = 'https://pixabay.com/api/';

interface PixabayPhoto {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
  imageWidth: number;
  imageHeight: number;
  pageURL: string;
  user: string;
  user_id: number;
}

export const pixabayProvider: StockPhotoProvider = {
  id: 'pixabay',
  name: 'Pixabay',

  isConfigured() {
    return !!KEY;
  },

  async search(query, { page, perPage }): Promise<SearchResult> {
    if (!KEY) throw new Error('Pixabay API key missing. Set VITE_PIXABAY_API_KEY in .env.');
    const url = `${BASE}?key=${KEY}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&image_type=photo&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pixabay ${res.status}`);
    const data = (await res.json()) as { totalHits: number; hits: PixabayPhoto[] };
    return {
      page,
      perPage,
      total: data.totalHits,
      results: data.hits.map((p) => mapPixabay(p)),
    };
  },
};

function mapPixabay(p: PixabayPhoto): StockPhoto {
  return {
    id: String(p.id),
    provider: 'pixabay',
    thumbUrl: p.previewURL,
    regularUrl: p.webformatURL,
    fullUrl: p.largeImageURL,
    author: p.user,
    authorUrl: `https://pixabay.com/users/${p.user}-${p.user_id}/`,
    sourceUrl: p.pageURL,
    width: p.imageWidth,
    height: p.imageHeight,
  };
}
