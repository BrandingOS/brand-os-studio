/**
 * applyBrandKit — pure function that pre-fills a `MockupState` from a
 * brand's kit.
 *
 * This is the spec's "killer feature" adapter (§4.2). Keep it pure: no
 * network calls, no side effects, no React. The caller fetches the
 * brand and template and passes them in.
 */

import type { Brand } from '@/shared/types/brand';

import {
  createInitialMockupState,
  type MockupState,
  type TemplateMeta,
  type TextLayer,
} from '../../engine/types';
import {
  resolveBrandText,
  resolveColor,
  resolveFontFamily,
  resolveLogoUrl,
} from './brandResolvers';

export function applyBrandKit(template: TemplateMeta, brand: Brand): MockupState {
  const base = createInitialMockupState(template);

  // Zones — place the brand's logo into each zone per its hints.
  for (const zone of template.zones) {
    const hint = zone.brandKitHints;
    if (!hint) continue;
    const preferred = hint.preferredAsset ?? 'logo_primary';
    const fallbacks = hint.fallbackAssets ?? [];
    const url = resolveLogoUrl(brand, preferred, fallbacks);
    if (url && base.zones[zone.id]) {
      base.zones[zone.id] = { ...base.zones[zone.id], designUrl: url };
    }
  }

  // Tintable regions — pick from the brand palette per hints.
  for (const region of template.tintableRegions ?? []) {
    const role = region.brandKitHints?.preferredColorRole;
    if (!role) continue;
    const color = resolveColor(brand, role);
    if (color && base.tints[region.id]) {
      base.tints[region.id] = { ...base.tints[region.id], color };
    }
  }

  // Default text slots — realize the hinted brand text + font.
  for (const slot of template.defaultTextSlots ?? []) {
    const textHint = slot.brandKitHints?.preferredField ?? 'brand_name';
    const fontRole = slot.brandKitHints?.preferredFontRole ?? 'heading';
    const text = resolveBrandText(brand, textHint);
    if (!text) continue;
    const fontFamily = resolveFontFamily(brand, fontRole);
    const layer: TextLayer = {
      id: `${slot.id}`,
      text,
      x: slot.x,
      y: slot.y,
      fontFamily,
      fontSize: slot.fontSize,
      fontWeight: 600,
      color: contrastingColor(brand),
      align: slot.align ?? 'center',
      letterSpacing: 0,
      rotation: 0,
    };
    base.textLayers.push(layer);
  }

  return base;
}

/** Pick a high-contrast color against the brand's default light surface. */
function contrastingColor(brand: Brand): string {
  // Neutral dark for default light backgrounds — simple heuristic.
  const dark = resolveColor(brand, 'neutral_dark');
  return dark;
}
