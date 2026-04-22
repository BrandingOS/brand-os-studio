/**
 * Generate a dynamic OG (Open Graph) image from a palette.
 *
 * Rendered on the client into a 1200×630 canvas, then exported as a
 * data URL. The result can be swapped into a `<meta property="og:image">`
 * tag at runtime for share previews.
 *
 * Not a replacement for a real server-side OG generator — but a
 * decent fallback that works in static hosting environments.
 */
import type { PaletteSystem } from '@/lib/color-engine';

export function renderOgImage(palette: PaletteSystem): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background = canvas token
  ctx.fillStyle = palette.semanticTokens.canvas;
  ctx.fillRect(0, 0, 1200, 630);

  // Color strip — primary scale 100 → 900
  const stops = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
  const w = 1200 / stops.length;
  stops.forEach((stop, i) => {
    ctx.fillStyle = palette.roles.primary.shades[stop].hex;
    ctx.fillRect(i * w, 80, w, 320);
  });

  // Headline
  ctx.fillStyle = palette.semanticTokens.textPrimary;
  ctx.font = '700 56px "Inter", system-ui, sans-serif';
  ctx.fillText(palette.name || 'UI Color System', 60, 500);

  // Seed hex
  ctx.fillStyle = palette.semanticTokens.textSecondary;
  ctx.font = '400 28px "Inter", system-ui, sans-serif';
  ctx.fillText(palette.roles.primary.inputHex.toUpperCase(), 60, 545);

  // Footer brand
  ctx.fillStyle = palette.semanticTokens.textMuted;
  ctx.font = '500 20px "Inter", system-ui, sans-serif';
  ctx.fillText('brandos.design · UI Color System', 60, 590);

  return canvas.toDataURL('image/png');
}
