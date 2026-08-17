// Format presets + premade prompt presets for the Generate panel.
// One entry per unique aspect ratio — the user picks the shape, the
// prompt provides the use case.

import {
  Image as ImageIcon,
  Square as SquareIcon, RectangleHorizontal, RectangleVertical, Smartphone, MonitorPlay,
} from 'lucide-react';

export interface FormatPreset {
  id: string;
  ratio: string;
  name: string;
  width: number;
  height: number;
  Icon: typeof SquareIcon;
  promptSuffix: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  // Auto = follow the active page's current dimensions, no resize.
  { id: 'auto',        ratio: 'Auto', name: 'Auto',       width: 0,    height: 0,    Icon: ImageIcon,           promptSuffix: '' },
  { id: 'square',      ratio: '1:1',  name: 'Square',     width: 1024, height: 1024, Icon: SquareIcon,          promptSuffix: '' },
  { id: 'portrait',    ratio: '4:5',  name: 'Portrait',   width: 1024, height: 1280, Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'tall',        ratio: '2:3',  name: 'Tall',       width: 1024, height: 1536, Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'vertical',    ratio: '9:16', name: 'Vertical',   width: 1024, height: 1820, Icon: Smartphone,          promptSuffix: ', vertical mobile composition' },
  { id: 'classic',     ratio: '4:3',  name: 'Classic',    width: 1365, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'landscape',   ratio: '3:2',  name: 'Landscape',  width: 1536, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'widescreen',  ratio: '16:9', name: 'Widescreen', width: 1820, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'cinematic',   ratio: '21:9', name: 'Cinematic',  width: 1920, height: 832,  Icon: MonitorPlay,         promptSuffix: ', cinematic ultrawide composition' },
];

export function findFormat(id: string | undefined | null): FormatPreset {
  return FORMAT_PRESETS.find((f) => f.id === id) ?? FORMAT_PRESETS[0];
}

export function formatLabel(f: FormatPreset, w?: number, h?: number): string {
  return f.id === 'auto' ? `Auto${w && h ? ` · ${w}×${h}` : ''}` : `${f.ratio} ${f.name}`;
}

export interface PromptPreset {
  id: string;
  title: string;
  /** `{brand}` is replaced with brand.name at click time. */
  prompt: string;
  formatId: string;
  previewSeed: number;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'football-poster',  title: 'Football Poster',  prompt: 'Epic football stadium aerial shot at golden hour, dramatic lighting, cinematic film grain, {brand} colors',                                formatId: 'tall',       previewSeed: 101 },
  { id: 'cyber-hero',       title: 'Cyber Hero',       prompt: 'Neon cyberpunk hero composition at night, glowing red accents, dramatic mood, ultra-detailed, {brand} aesthetic',                          formatId: 'square',     previewSeed: 202 },
  { id: 'product-clean',    title: 'Clean Product',    prompt: 'Professional product photography, clean white background, soft studio lighting, premium {brand} product on pedestal',                       formatId: 'square',     previewSeed: 303 },
  { id: 'team-mood',        title: 'Team Mood',        prompt: 'Moody locker room with team jerseys, dramatic accent lighting, {brand} colors, cinematic',                                                  formatId: 'widescreen', previewSeed: 404 },
  { id: 'minimal-bg',       title: 'Minimal BG',       prompt: 'Minimalist abstract gradient background, subtle grain, {brand}-colored, leaves space for headline',                                         formatId: 'widescreen', previewSeed: 505 },
  { id: 'event-banner',     title: 'Event Banner',     prompt: 'Wide event banner, bold geometric shapes, energetic composition, {brand} palette, ultra-sharp',                                             formatId: 'cinematic',  previewSeed: 606 },
  { id: 'avatar-portrait',  title: 'Avatar',           prompt: 'Centered avatar portrait, neutral background, premium studio lighting, {brand} mood',                                                       formatId: 'square',     previewSeed: 707 },
  { id: 'logo-mark',        title: 'Logo Mark',        prompt: 'Minimalist logo concept on neutral background, geometric, balanced, contemporary, {brand} essence',                                         formatId: 'square',     previewSeed: 808 },
];
