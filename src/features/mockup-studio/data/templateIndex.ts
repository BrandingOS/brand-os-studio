/**
 * Bundled template registry.
 *
 * V1 ships templates as procedural descriptors — the engine reads
 * `TemplateMeta` + data-URL assets at runtime. When real Photoshop
 * bundles land, they slot in behind the same `TemplateMeta` shape.
 */

import {
  generateProceduralAssets,
  type ProceduralTemplateDescriptor,
} from '../engine/procedural';
import type { TemplateMeta } from '../engine/types';

interface SeedTemplate {
  descriptor: ProceduralTemplateDescriptor;
  meta: Omit<TemplateMeta, 'assets'>;
}

const seeds: SeedTemplate[] = [
  {
    descriptor: {
      id: 'white-tshirt-flat',
      canvas: 1600,
      backgroundColor: '#f3ece2',
      productColor: '#ffffff',
      shape: 'tshirt',
      designZone: { x: 0.33, y: 0.32, width: 0.34, height: 0.3 },
    },
    meta: {
      id: 'white-tshirt-flat',
      name: 'T-shirt — flat lay',
      category: 'apparel',
      canvas: { width: 1600, height: 1600 },
      zones: [
        {
          id: 'chest',
          label: 'Chest print',
          displacementScale: 6,
          defaultTransform: {
            x: 800,
            y: 750,
            width: 520,
            height: 520,
            rotation: 0,
          },
          constraints: { minScale: 0.25, maxScale: 1.6, lockAspect: true },
          brandKitHints: {
            preferredAsset: 'logo_primary',
            fallbackAssets: ['logo_iconmark', 'logo_wordmark'],
          },
        },
      ],
      tintableRegions: [
        {
          id: 'shirt_color',
          label: 'Shirt color',
          mask: 'procedural:tintMask',
          defaultColor: '#ffffff',
          swatches: [
            '#ffffff',
            '#111827',
            '#1f2937',
            '#b91c1c',
            '#1d4ed8',
            '#15803d',
            '#d97706',
            '#7c3aed',
          ],
          brandKitHints: { preferredColorRole: 'neutral_light' },
        },
      ],
      backgroundReplaceable: true,
    },
  },
  {
    descriptor: {
      id: 'business-card-flat',
      canvas: 1600,
      backgroundColor: '#1b1b1b',
      productColor: '#fafafa',
      shape: 'businessCard',
      designZone: { x: 0.2, y: 0.34, width: 0.6, height: 0.32 },
    },
    meta: {
      id: 'business-card-flat',
      name: 'Business card — top down',
      category: 'print',
      canvas: { width: 1600, height: 1600 },
      zones: [
        {
          id: 'face',
          label: 'Card face',
          displacementScale: 2,
          defaultTransform: {
            x: 800,
            y: 800,
            width: 820,
            height: 440,
            rotation: 0,
          },
          constraints: { minScale: 0.4, maxScale: 1.2, lockAspect: true },
          brandKitHints: {
            preferredAsset: 'logo_wordmark',
            fallbackAssets: ['logo_primary', 'logo_iconmark'],
          },
        },
      ],
      tintableRegions: [
        {
          id: 'card_color',
          label: 'Card color',
          mask: 'procedural:tintMask',
          defaultColor: '#fafafa',
          swatches: ['#fafafa', '#111827', '#0f172a', '#d4d4d4', '#eab308'],
          brandKitHints: { preferredColorRole: 'neutral_light' },
        },
      ],
      backgroundReplaceable: true,
    },
  },
  {
    descriptor: {
      id: 'white-mug',
      canvas: 1600,
      backgroundColor: '#ede6d9',
      productColor: '#ffffff',
      shape: 'mug',
      designZone: { x: 0.33, y: 0.36, width: 0.34, height: 0.3 },
    },
    meta: {
      id: 'white-mug',
      name: 'Ceramic mug — studio',
      category: 'packaging',
      canvas: { width: 1600, height: 1600 },
      zones: [
        {
          id: 'face',
          label: 'Mug face',
          displacementScale: 18,
          defaultTransform: {
            x: 800,
            y: 790,
            width: 500,
            height: 440,
            rotation: 0,
          },
          constraints: { minScale: 0.3, maxScale: 1.4, lockAspect: true },
          brandKitHints: {
            preferredAsset: 'logo_iconmark',
            fallbackAssets: ['logo_primary', 'logo_wordmark'],
          },
        },
      ],
      tintableRegions: [
        {
          id: 'mug_color',
          label: 'Mug color',
          mask: 'procedural:tintMask',
          defaultColor: '#ffffff',
          swatches: ['#ffffff', '#111827', '#2563eb', '#16a34a', '#b91c1c'],
          brandKitHints: { preferredColorRole: 'neutral_light' },
        },
      ],
      backgroundReplaceable: true,
    },
  },
];

/** Lazily-resolved template list — data URLs generated on first access. */
let cached: TemplateMeta[] | null = null;

export function getBundledTemplates(): TemplateMeta[] {
  if (cached) return cached;
  cached = seeds.map(({ descriptor, meta }) => {
    const assets = generateProceduralAssets(descriptor);
    // Tintable regions reference `procedural:tintMask` — resolve to the URL.
    const tintableRegions = meta.tintableRegions?.map((r) => ({
      ...r,
      mask: r.mask === 'procedural:tintMask' ? assets.tintMask : r.mask,
    }));
    return {
      ...meta,
      tintableRegions,
      assets: {
        base: assets.base,
        displacement: assets.displacement,
        lighting: assets.lighting,
        mask: assets.mask,
        thumbnail: assets.thumbnail,
      },
      zones: meta.zones.map((zone) => ({
        ...zone,
        displacement: zone.displacement ?? assets.displacement,
        lighting: zone.lighting ?? assets.lighting,
        mask: zone.mask ?? assets.mask,
      })),
    };
  });
  return cached;
}

export function getBundledTemplateById(id: string): TemplateMeta | null {
  return getBundledTemplates().find((t) => t.id === id) ?? null;
}
