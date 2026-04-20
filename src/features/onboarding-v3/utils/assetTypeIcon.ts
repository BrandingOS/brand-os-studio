import type { AssetKind } from '../types';

const DESIGN_EXT = ['fig', 'ai', 'sketch', 'psd', 'xd', 'indd'];
const FONT_EXT = ['otf', 'ttf', 'woff', 'woff2'];

function extOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
}

export function detectAssetKind(filename: string, mimeType: string): AssetKind {
  const ext = extOf(filename);
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (FONT_EXT.includes(ext) || mimeType.startsWith('font/')) return 'font';
  if (DESIGN_EXT.includes(ext)) return 'design';
  if (mimeType === 'application/zip' || ext === 'zip') return 'zip';
  return 'image'; // sensible fallback for unknown image-like content
}

export function iconForKind(kind: AssetKind): string {
  switch (kind) {
    case 'pdf':    return '/onboarding-v3/icons/pdf.svg';
    case 'link':   return '/onboarding-v3/icons/link.svg';
    case 'font':   return '/onboarding-v3/icons/logo.svg';
    case 'design': return '/onboarding-v3/icons/logo.svg';
    case 'zip':    return '/onboarding-v3/icons/logo.svg';
    case 'image':  return '/onboarding-v3/icons/png.png';
  }
}

export const ACCEPTED_MIME: Record<string, string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'],
  'application/pdf': ['.pdf'],
  'font/otf': ['.otf'],
  'font/ttf': ['.ttf'],
  'font/woff': ['.woff'],
  'font/woff2': ['.woff2'],
  'application/zip': ['.zip'],
  'application/octet-stream': ['.fig', '.ai', '.sketch', '.psd'],
};
