import type { SizePreset, SizePresetId } from './types';

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'square',     name: 'Square',   width: 1080, height: 1080, hint: 'Instagram · 1:1' },
  { id: 'post-4x5',   name: 'Post',     width: 1080, height: 1350, hint: 'IG portrait · 4:5' },
  { id: 'story-9x16', name: 'Story',    width: 1080, height: 1920, hint: 'Stories / Reels · 9:16' },
  { id: 'wide-16x9',  name: 'Wide',     width: 1920, height: 1080, hint: 'YT / X header · 16:9' },
  { id: 'poster-2x3', name: 'Poster',   width: 1200, height: 1800, hint: 'Print · 2:3' },
  { id: 'a4',         name: 'A4',       width: 2480, height: 3508, hint: 'Print · A4 300dpi' },
];

export function resolveSize(
  id: SizePresetId,
  custom?: { width: number; height: number },
): { width: number; height: number; name: string } {
  if (id === 'custom' && custom) return { ...custom, name: 'Custom' };
  const found = SIZE_PRESETS.find((p) => p.id === id);
  if (found) return { width: found.width, height: found.height, name: found.name };
  return { width: 1080, height: 1080, name: 'Square' };
}
