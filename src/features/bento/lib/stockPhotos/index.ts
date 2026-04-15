import { unsplashProvider } from './unsplash';
import { pexelsProvider } from './pexels';
import { pixabayProvider } from './pixabay';
import type { StockPhoto, StockPhotoProvider } from './types';

export type { StockPhoto, StockPhotoProvider, ProviderId, SearchResult } from './types';

export const ALL_PROVIDERS: StockPhotoProvider[] = [
  unsplashProvider,
  pexelsProvider,
  pixabayProvider,
];

export function getConfiguredProviders(): StockPhotoProvider[] {
  return ALL_PROVIDERS.filter((p) => p.isConfigured());
}

export function getProvider(id: string): StockPhotoProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id);
}

/**
 * Fetch a remote image and return a data URL suitable for embedding /
 * export. Runs the provider's `trackDownload` ping (Unsplash requirement)
 * the first time we actually use the photo.
 */
export async function fetchPhotoAsDataUrl(photo: StockPhoto): Promise<string> {
  if (photo.trackDownload) {
    void photo.trackDownload(); // fire-and-forget; non-blocking
  }
  const res = await fetch(photo.regularUrl, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}
