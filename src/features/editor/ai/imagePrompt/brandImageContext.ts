// brandImageContext — the deterministic, pure slice of a Brand that
// matters for IMAGE generation. The compiler (Claude or the
// deterministic fallback) reads only this; nothing here calls network.
//
// Reuses the same chokepoints the rest of the editor uses:
//   • `brandToBrandKit` for the resolved colors / typography
//   • `logoUrl` probing (like `buildBrandCard`) for which logo roles exist

import type { Brand } from '@/shared/types/brand';
import { brandToBrandKit } from '@/features/editor/brand/brandToBrandKit';
import { logoUrl } from '@/shared/brand/logoUrl';

export interface BrandPaletteEntry {
  role: 'primary' | 'secondary' | 'accent' | 'neutral-dark' | 'neutral-light';
  hex: string;
  name?: string;
}

export interface BrandImageContext {
  name: string;
  industry?: string;
  tagline?: string;
  palette: BrandPaletteEntry[];
  /** Brand style words (visualStyle.descriptors), lower-cased, ≤ 6. */
  styleDescriptors: string[];
  personality: string[];
  tone?: string;
  audience?: string;
  positioning?: string;
  headingFont?: string;
  hasLogo: boolean;
  logoRoles: string[];
}

function clean(s: unknown, max = 120): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function isHex(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
}

export function buildBrandImageContext(brand: Brand | null | undefined): BrandImageContext | null {
  if (!brand) return null;
  const kit = brandToBrandKit(brand);
  const cs = brand.colorSystem;

  const palette: BrandPaletteEntry[] = [];
  if (isHex(kit.colors.primary.hex)) {
    palette.push({ role: 'primary', hex: kit.colors.primary.hex.toUpperCase(), name: cs?.primary?.name ?? kit.colors.primary.name });
  }
  if (kit.colors.secondary && isHex(kit.colors.secondary.hex)) {
    palette.push({ role: 'secondary', hex: kit.colors.secondary.hex.toUpperCase(), name: cs?.secondary?.name ?? kit.colors.secondary.name });
  }
  if (kit.colors.accent && isHex(kit.colors.accent.hex)) {
    palette.push({ role: 'accent', hex: kit.colors.accent.hex.toUpperCase(), name: cs?.accent?.name ?? kit.colors.accent.name });
  }
  const neutrals = kit.colors.neutrals.filter(isHex);
  if (neutrals.length >= 2) {
    palette.push({ role: 'neutral-light', hex: neutrals[0].toUpperCase() });
    palette.push({ role: 'neutral-dark', hex: neutrals[neutrals.length - 1].toUpperCase() });
  }

  const strategy = brand.guidelines?.strategy;
  const styleDescriptors = (brand.visualStyle?.descriptors ?? [])
    .map((d) => clean(d, 32)?.toLowerCase())
    .filter((d): d is string => !!d)
    .slice(0, 6);
  const personality = (strategy?.personality ?? [])
    .map((p) => clean(p, 32))
    .filter((p): p is string => !!p)
    .slice(0, 4);

  const logoRoles: string[] = [];
  if (logoUrl(brand, 'primary')) logoRoles.push('primary');
  if (logoUrl(brand, 'iconmark')) logoRoles.push('iconmark');
  if (logoUrl(brand, 'wordmark')) logoRoles.push('wordmark');
  if (logoUrl(brand, 'mono.white')) logoRoles.push('mono.white');
  if (logoUrl(brand, 'mono.black')) logoRoles.push('mono.black');

  return {
    name: brand.name,
    industry: clean(brand.businessInfo?.industry, 60),
    tagline: clean(brand.businessInfo?.tagline, 80),
    palette,
    styleDescriptors,
    personality,
    tone: clean(brand.tone, 80),
    audience: clean(brand.audience ?? strategy?.targetAudience, 80),
    positioning: clean(strategy?.positioning, 120),
    headingFont: kit.typography.heading.family,
    hasLogo: logoRoles.length > 0,
    logoRoles,
  };
}

/** Compact one-paragraph rendering for prompts (~80–150 tokens). */
export function describeBrandForPrompt(ctx: BrandImageContext): string {
  const parts: string[] = [`Brand: ${ctx.name}`];
  if (ctx.industry) parts.push(`industry: ${ctx.industry}`);
  if (ctx.tagline) parts.push(`tagline: "${ctx.tagline}"`);
  if (ctx.palette.length) {
    parts.push(`palette: ${ctx.palette.map((p) => `${p.role} ${p.hex}${p.name ? ` (${p.name})` : ''}`).join(', ')}`);
  }
  if (ctx.styleDescriptors.length) parts.push(`visual style: ${ctx.styleDescriptors.join(', ')}`);
  if (ctx.personality.length) parts.push(`personality: ${ctx.personality.join(', ')}`);
  if (ctx.tone) parts.push(`tone: ${ctx.tone}`);
  if (ctx.audience) parts.push(`audience: ${ctx.audience}`);
  if (ctx.positioning) parts.push(`positioning: ${ctx.positioning}`);
  parts.push(ctx.hasLogo ? `logo available (${ctx.logoRoles.join(', ')})` : 'no logo file');
  return parts.join('; ') + '.';
}
