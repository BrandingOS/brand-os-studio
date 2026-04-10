/**
 * DAM utilities — pure functions for asset type/category detection.
 * Extracted from DamPage.tsx for testability.
 */
import type { Asset } from '@/shared/types/brand';

/** Detect asset type from a File's MIME type */
export function detectAssetType(file: Pick<File, 'type'>): Asset['type'] {
  if (file.type === 'image/svg+xml') return 'icon';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'document';
  if (file.type.includes('font')) return 'font';
  return 'document';
}

/** Detect asset category from filename + MIME type */
export function detectCategory(name: string, mime: string): Asset['category'] {
  const lower = name.toLowerCase();
  if (lower.includes('logo')) return 'logo';
  if (lower.includes('icon') || lower.includes('favicon')) return 'icon';
  if (lower.includes('mockup') || lower.includes('mock-up')) return 'mockup';
  if (lower.includes('social') || lower.includes('instagram') || lower.includes('facebook') || lower.includes('twitter')) return 'social';
  if (lower.includes('reference') || lower.includes('moodboard') || lower.includes('inspo')) return 'reference';
  if (mime === 'image/svg+xml') return 'icon';
  if (mime === 'application/pdf') return 'reference';
  return 'photo';
}
