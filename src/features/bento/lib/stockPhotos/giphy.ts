import type { SearchResult, StockPhoto, StockPhotoProvider } from './types';

const KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
const BASE = 'https://api.giphy.com/v1/gifs';

interface GiphyGif {
  id: string;
  url: string;
  username: string;
  images: {
    fixed_height_small: { url: string; width: string; height: string };
    downsized_medium: { url: string };
    original: { url: string; width: string; height: string };
  };
}

export const giphyProvider: StockPhotoProvider = {
  id: 'giphy',
  name: 'GIPHY',

  isConfigured() {
    return !!KEY;
  },

  async search(query, { page, perPage }): Promise<SearchResult> {
    if (!KEY) throw new Error('Giphy API key missing. Set VITE_GIPHY_API_KEY in .env.');
    const offset = (page - 1) * perPage;
    const endpoint = query.trim() ? 'search' : 'trending';
    const url = `${BASE}/${endpoint}?api_key=${KEY}&limit=${perPage}&offset=${offset}` +
      (query.trim() ? `&q=${encodeURIComponent(query)}` : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Giphy ${res.status}`);
    const data = (await res.json()) as { data: GiphyGif[]; pagination: { total_count: number } };
    return {
      page,
      perPage,
      total: data.pagination?.total_count ?? data.data.length,
      results: data.data.map((g) => mapGiphy(g)),
    };
  },
};

function mapGiphy(g: GiphyGif): StockPhoto {
  return {
    id: g.id,
    provider: 'giphy',
    thumbUrl: g.images.fixed_height_small.url,
    regularUrl: g.images.downsized_medium.url,
    fullUrl: g.images.original.url,
    author: g.username || 'GIPHY',
    sourceUrl: g.url,
    width: Number(g.images.original.width),
    height: Number(g.images.original.height),
  };
}
