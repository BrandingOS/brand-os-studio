/**
 * Bundled template registry.
 *
 * Each template references a real product photograph (Unsplash) as its
 * base layer and uses procedurally-generated zone masks and lighting
 * so the user's design composites onto the right region of the photo.
 *
 * To add a new template:
 *   1. Pick a product photo (Unsplash works well — license is permissive
 *      for embedded use). Use a square crop URL: `?w=1600&h=1600&fit=crop`.
 *   2. Eyeball the design zone in the photo. Express it as fractional
 *      coords (0–1) in `designZone`.
 *   3. Pick a lighting direction matching the photo's actual highlight
 *      so the design integrates naturally.
 *
 * For pixel-accurate templates (true displacement, surface curvature,
 * cutouts), drop hand-authored .webp layers into the template's data
 * folder and skip the procedural helpers — the engine treats both
 * paths identically.
 */

import {
  generateLightingOverlay,
  generateZoneMask,
} from '../engine/procedural';
import type { TemplateMeta } from '../engine/types';

interface PhotoTemplateSeed {
  id: string;
  name: string;
  category: TemplateMeta['category'];
  /** Square canvas size. Should match the cropped photo's dimensions. */
  canvas: number;
  /** URL of the base photograph. */
  baseUrl: string;
  /** Smaller version used for the gallery thumbnail. Defaults to a 512px crop. */
  thumbnailUrl?: string;
  /** Where the user's design lands on the product. Fractional coords. */
  designZone: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  /** Human-readable label for the design zone. */
  zoneLabel: string;
  /** Mask outline shape — `rect` (default) or `oval` for round surfaces. */
  zoneShape?: 'rect' | 'oval';
  /** Direction of the dominant highlight for the procedural lighting. */
  highlight?: 'top-left' | 'top' | 'top-right' | 'left' | 'right';
  /** 0–1 — how strong the procedural shadow is. Default 0.25. */
  shadowStrength?: number;
  /** Brand-aware autofill hint. */
  brandKitHint: 'logo_primary' | 'logo_iconmark' | 'logo_wordmark' | 'logo_secondary';
  /** Fallback assets to try if the preferred logo isn't available. */
  brandKitFallbacks?: Array<'logo_primary' | 'logo_iconmark' | 'logo_wordmark' | 'logo_secondary'>;
}

/**
 * Helper: build an Unsplash URL with consistent parameters. We always
 * crop to a square so the canvas aspect ratio is predictable.
 */
function unsplash(photoId: string, size = 1600): string {
  return `https://images.unsplash.com/${photoId}?w=${size}&h=${size}&fit=crop&crop=center&q=80&auto=format`;
}

const seeds: PhotoTemplateSeed[] = [
  {
    id: 'white-tshirt',
    name: 'White t-shirt — flat lay',
    category: 'apparel',
    canvas: 1600,
    baseUrl: unsplash('photo-1521572163474-6864f9cf17ab'),
    thumbnailUrl: unsplash('photo-1521572163474-6864f9cf17ab', 256),
    designZone: { x: 0.34, y: 0.32, width: 0.32, height: 0.32 },
    zoneLabel: 'Chest print',
    highlight: 'top-left',
    shadowStrength: 0.18,
    brandKitHint: 'logo_primary',
    brandKitFallbacks: ['logo_iconmark', 'logo_wordmark'],
  },
  {
    id: 'white-mug',
    name: 'White ceramic mug',
    category: 'packaging',
    canvas: 1600,
    baseUrl: unsplash('photo-1514228742587-6b1558fcca3d'),
    thumbnailUrl: unsplash('photo-1514228742587-6b1558fcca3d', 256),
    designZone: { x: 0.36, y: 0.4, width: 0.28, height: 0.28 },
    zoneLabel: 'Mug face',
    zoneShape: 'rect',
    highlight: 'top-left',
    shadowStrength: 0.2,
    brandKitHint: 'logo_iconmark',
    brandKitFallbacks: ['logo_primary', 'logo_wordmark'],
  },
  {
    id: 'business-card-pair',
    name: 'Business card — dark surface',
    category: 'print',
    canvas: 1600,
    baseUrl: unsplash('photo-1606857521015-7f9fcf423740'),
    thumbnailUrl: unsplash('photo-1606857521015-7f9fcf423740', 256),
    designZone: { x: 0.24, y: 0.4, width: 0.5, height: 0.22 },
    zoneLabel: 'Card face',
    highlight: 'top',
    shadowStrength: 0.12,
    brandKitHint: 'logo_wordmark',
    brandKitFallbacks: ['logo_primary', 'logo_iconmark'],
  },
  {
    id: 'phone-screen',
    name: 'Phone — held in hand',
    category: 'device',
    canvas: 1600,
    baseUrl: unsplash('photo-1592899677977-9c10ca588bbd'),
    thumbnailUrl: unsplash('photo-1592899677977-9c10ca588bbd', 256),
    designZone: { x: 0.34, y: 0.22, width: 0.32, height: 0.6 },
    zoneLabel: 'Screen',
    highlight: 'top',
    shadowStrength: 0.1,
    brandKitHint: 'logo_primary',
    brandKitFallbacks: ['logo_iconmark', 'logo_wordmark'],
  },
  {
    id: 'paper-flatlay',
    name: 'Paper — desk flat lay',
    category: 'print',
    canvas: 1600,
    baseUrl: unsplash('photo-1517842645767-c639042777db'),
    thumbnailUrl: unsplash('photo-1517842645767-c639042777db', 256),
    designZone: { x: 0.28, y: 0.22, width: 0.45, height: 0.55 },
    zoneLabel: 'Page',
    highlight: 'top-left',
    shadowStrength: 0.15,
    brandKitHint: 'logo_primary',
    brandKitFallbacks: ['logo_wordmark', 'logo_iconmark'],
  },
  {
    id: 'tote-bag',
    name: 'Canvas tote bag',
    category: 'apparel',
    canvas: 1600,
    baseUrl: unsplash('photo-1591348278863-a8fb3887e2aa'),
    thumbnailUrl: unsplash('photo-1591348278863-a8fb3887e2aa', 256),
    designZone: { x: 0.35, y: 0.35, width: 0.3, height: 0.3 },
    zoneLabel: 'Tote print',
    highlight: 'top-left',
    shadowStrength: 0.22,
    brandKitHint: 'logo_primary',
    brandKitFallbacks: ['logo_iconmark', 'logo_wordmark'],
  },
];

let cached: TemplateMeta[] | null = null;

export function getBundledTemplates(): TemplateMeta[] {
  if (cached) return cached;
  cached = seeds.map((seed) => {
    const mask = generateZoneMask({
      canvas: seed.canvas,
      zone: seed.designZone,
      shape: seed.zoneShape ?? 'rect',
      feather: 6,
    });
    const lighting = generateLightingOverlay({
      canvas: seed.canvas,
      zone: seed.designZone,
      highlight: seed.highlight,
      shadowStrength: seed.shadowStrength,
    });

    const cx = (seed.designZone.x + seed.designZone.width / 2) * seed.canvas;
    const cy = (seed.designZone.y + seed.designZone.height / 2) * seed.canvas;
    const w = seed.designZone.width * seed.canvas;
    const h = seed.designZone.height * seed.canvas;

    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      canvas: { width: seed.canvas, height: seed.canvas },
      assets: {
        base: seed.baseUrl,
        thumbnail: seed.thumbnailUrl ?? seed.baseUrl,
      },
      backgroundReplaceable: false,
      zones: [
        {
          id: 'design',
          label: seed.zoneLabel,
          mask,
          lighting,
          // Real photos already encode surface curvature in their pixels —
          // we don't need a procedural displacement map. (When a hand-
          // authored Photoshop displacement.png ships, set it here.)
          displacementScale: 0,
          defaultTransform: {
            x: cx,
            y: cy,
            width: w,
            height: h,
            rotation: seed.designZone.rotation ?? 0,
          },
          constraints: { minScale: 0.25, maxScale: 1.6, lockAspect: true },
          brandKitHints: {
            preferredAsset: seed.brandKitHint,
            fallbackAssets: seed.brandKitFallbacks,
          },
        },
      ],
    };
  });
  return cached;
}

export function getBundledTemplateById(id: string): TemplateMeta | null {
  return getBundledTemplates().find((t) => t.id === id) ?? null;
}
