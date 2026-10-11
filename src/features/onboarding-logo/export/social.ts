/**
 * Social starter kit — four ready-to-post images, drawn on a canvas in the
 * brand's own colours, type and pattern. Sizes are each platform's current
 * recommended pixel dimensions.
 */
import type { BrandContext, BrandSystem, LogoSource } from '../model/types';
import { ensureFont, loadImage, logoPng, toBlob } from '../engine/logoArt';
import { patternSwatchSvg } from '../engine/graphics';
import { svgDataUrl } from '../engine/logoRead';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';

export interface SocialFormat {
  id: string;
  name: string;
  w: number;
  h: number;
}

export const SOCIAL_FORMATS: SocialFormat[] = [
  { id: 'profile', name: 'Profile picture', w: 1080, h: 1080 },
  { id: 'post', name: 'Square post', w: 1080, h: 1080 },
  { id: 'story', name: 'Story', w: 1080, h: 1920 },
  { id: 'cover', name: 'Header / cover', w: 1500, h: 500 },
];

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function blobImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function patternImage(system: BrandSystem, w: number, h: number): Promise<HTMLImageElement | null> {
  if (system.pattern === 'mark') return null;
  const p = system.palette;
  const svg = patternSwatchSvg(system.pattern, { fg: p.primary, bg: p.secondary, accent: p.accent }, w, h, Math.round(Math.min(w, h) / 9));
  return loadImage(svgDataUrl(svg)).catch(() => null);
}

export async function renderSocial(
  format: SocialFormat,
  logo: LogoSource,
  system: BrandSystem,
  context: BrandContext,
  type: 'image/png' | 'image/jpeg' = 'image/png',
): Promise<Blob> {
  const { w, h } = format;
  const p = system.palette;
  await ensureFont(system.type.heading, system.type.headingWeight);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const headingFont = (size: number) => `${system.type.headingWeight} ${size}px "${system.type.heading}", sans-serif`;
  const headline = system.voice.samples[0] ?? context.name;
  const white = await blobImage(await logoPng(logo, { color: '#ffffff', height: 600 }));
  const ratio = logo.width / logo.height;

  const drawLogo = (img: HTMLImageElement, x: number, y: number, height: number) => {
    const width = Math.min(height * ratio, w * 0.7);
    ctx.drawImage(img, x, y, width, width / ratio);
  };

  if (format.id === 'profile') {
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, w, h);
    const lh = ratio > 1.6 ? (w * 0.6) / ratio : h * 0.42;
    const lw = lh * ratio;
    ctx.drawImage(white, (w - lw) / 2, (h - lh) / 2, lw, lh);
  } else if (format.id === 'post') {
    const pat = await patternImage(system, w, h);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(0, 0, w, h);
    if (pat) ctx.drawImage(pat, 0, 0, w, h);
    const pad = 90;
    ctx.fillStyle = p.dark;
    ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fillStyle = pickFgOnBackground(p.dark, ['#ffffff', p.light]);
    ctx.font = headingFont(78);
    const lines = wrapLines(ctx, headline, w - pad * 4);
    lines.slice(0, 5).forEach((l, i) => ctx.fillText(l, pad * 2, pad * 2 + 70 + i * 92));
    drawLogo(white, pad * 2, h - pad * 2 - 70, 70);
  } else if (format.id === 'story') {
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, w, h);
    drawLogo(white, 100, 140, 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = headingFont(108);
    const lines = wrapLines(ctx, headline, w - 200);
    lines.slice(0, 6).forEach((l, i) => ctx.fillText(l, 100, h * 0.45 + i * 124));
    ctx.fillStyle = p.accent;
    ctx.fillRect(100, h - 220, 260, 12);
  } else {
    ctx.fillStyle = p.dark;
    ctx.fillRect(0, 0, w, h);
    const pat = await patternImage(system, w / 2, h);
    if (pat) ctx.drawImage(pat, w / 2, 0, w / 2, h);
    const lh = Math.min(140, (w * 0.32) / ratio);
    drawLogo(white, 110, (h - lh) / 2, lh);
  }
  return toBlob(c, type, 0.92);
}
