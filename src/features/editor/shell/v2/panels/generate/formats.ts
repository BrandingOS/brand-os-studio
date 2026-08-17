// Output formats and prompt presets.
//
// A format is an ASPECT RATIO plus an intent, not a pixel size: the model
// decides pixels from its own supported sizes, and the server snaps anything it
// cannot honour. One entry per ratio — the user picks the shape, the prompt
// supplies the use case.

import {
  Image as ImageIcon,
  Square as SquareIcon, RectangleHorizontal, RectangleVertical, Smartphone, MonitorPlay,
} from 'lucide-react';
import type { AspectRatio } from '@/features/image-generation';

export interface FormatPreset {
  id: string;
  ratio: AspectRatio | 'auto';
  name: string;
  Icon: typeof SquareIcon;
  promptSuffix: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: 'auto',       ratio: 'auto',  name: 'Auto',       Icon: ImageIcon,           promptSuffix: '' },
  { id: 'square',     ratio: '1:1',   name: 'Square',     Icon: SquareIcon,          promptSuffix: '' },
  { id: 'portrait',   ratio: '4:5',   name: 'Portrait',   Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'tall',       ratio: '2:3',   name: 'Tall',       Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'vertical',   ratio: '9:16',  name: 'Vertical',   Icon: Smartphone,          promptSuffix: ', vertical mobile composition' },
  { id: 'classic',    ratio: '4:3',   name: 'Classic',    Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'landscape',  ratio: '3:2',   name: 'Landscape',  Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'widescreen', ratio: '16:9',  name: 'Widescreen', Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'cinematic',  ratio: '21:9',  name: 'Cinematic',  Icon: MonitorPlay,         promptSuffix: ', cinematic ultrawide composition' },
];

export function findFormat(id: string | undefined | null): FormatPreset {
  return FORMAT_PRESETS.find((f) => f.id === id) ?? FORMAT_PRESETS[0];
}

/** Nearest offered ratio for an arbitrary page size (the "Auto" case). */
export function ratioForSize(width: number, height: number, allowed: AspectRatio[]): AspectRatio {
  const target = width / height;
  let best = allowed[0] ?? '1:1';
  let bestDiff = Infinity;
  for (const r of allowed) {
    const [w, h] = r.split(':').map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) { bestDiff = diff; best = r; }
  }
  return best;
}

export function formatLabel(f: FormatPreset, resolved?: AspectRatio): string {
  return f.ratio === 'auto' ? `Auto${resolved ? ` · ${resolved}` : ''}` : `${f.ratio} ${f.name}`;
}

/**
 * Creation intents. Each sets the prompt intent AND the shape — a preset that
 * only filled in words would leave the user to guess the rest.
 */
export interface PromptPreset {
  id: string;
  title: string;
  /** `{brand}` is replaced with the brand name at click time. */
  prompt: string;
  formatId: string;
  intent: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'social-post',  title: 'Social post',   formatId: 'square',     intent: 'Square feed image',
    prompt: 'A striking social post image for {brand}: bold central subject, generous negative space at the top for a headline, crisp lighting' },
  { id: 'story',        title: 'Story',         formatId: 'vertical',   intent: 'Full-bleed vertical',
    prompt: 'A full-bleed vertical story background for {brand}: atmospheric depth, subject low in frame, clean space in the upper third for text' },
  { id: 'ad',           title: 'Ad creative',   formatId: 'landscape',  intent: 'Advertising still',
    prompt: 'An advertising still for {brand}: hero product or subject sharply lit against a controlled background, premium finish, room for a short line of copy' },
  { id: 'product',      title: 'Product shot',  formatId: 'square',     intent: 'Studio product photo',
    prompt: 'Studio product photography for {brand}: single product centred on a seamless surface, soft key light with a gentle shadow, true colour, no props' },
  { id: 'background',   title: 'Background',    formatId: 'widescreen', intent: 'Abstract backdrop',
    prompt: 'An abstract background for {brand}: subtle gradient and grain, calm composition with no focal subject, designed to sit behind text' },
  { id: 'illustration', title: 'Illustration',  formatId: 'square',     intent: 'Vector-feel illustration',
    prompt: 'A flat vector-style illustration for {brand}: simple geometry, confident shapes, limited palette, even lighting, no photographic texture' },
  { id: 'editorial',    title: 'Editorial',     formatId: 'portrait',   intent: 'Editorial photograph',
    prompt: 'An editorial photograph for {brand}: documentary framing, natural light, honest texture, a real moment rather than a staged pose' },
  { id: 'pattern',      title: 'Pattern',       formatId: 'square',     intent: 'Seamless pattern',
    prompt: 'A seamless repeating pattern for {brand}: even density across the frame, no focal point, tileable, restrained palette' },
];
