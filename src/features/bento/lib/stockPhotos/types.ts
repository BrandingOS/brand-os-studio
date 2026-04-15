/**
 * Stock photo provider contract.
 *
 * A provider is any image search backend. Each one has its own SDK/API
 * quirks but normalises results into `StockPhoto` so the UI doesn't care.
 *
 * Providers must self-report `isConfigured()` so the UI can hide tabs
 * when an env key is missing.
 */

export type ProviderId = 'unsplash' | 'pexels' | 'pixabay' | 'giphy';

export interface StockPhoto {
  id: string;
  provider: ProviderId;
  /** Small URL for the search grid. */
  thumbUrl: string;
  /** Medium/large URL to use on the bento tile. */
  regularUrl: string;
  /** Optional full-resolution URL (download). */
  fullUrl?: string;
  /** Author display name for attribution. */
  author: string;
  authorUrl?: string;
  /** Page on the provider's site showing this photo. */
  sourceUrl?: string;
  /** Approx dimensions. */
  width?: number;
  height?: number;
  /** Dominant color hex (Unsplash + Pixabay supply this). */
  color?: string;
  /**
   * Some providers (Unsplash) require a ping when the image is actually
   * used. Call this on select to stay API-compliant.
   */
  trackDownload?: () => Promise<void>;
}

export interface SearchResult {
  results: StockPhoto[];
  total: number;
  page: number;
  perPage: number;
}

export interface StockPhotoProvider {
  id: ProviderId;
  name: string;
  /** True when the required env key is present. */
  isConfigured(): boolean;
  search(query: string, opts: { page: number; perPage: number }): Promise<SearchResult>;
}
