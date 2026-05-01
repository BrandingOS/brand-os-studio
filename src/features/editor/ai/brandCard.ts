/**
 * Brand Card — compressed, handle-based brand context for AI prompts.
 *
 * Design goal: give the model enough to design ON-brand without dumping the
 * entire Brand JSON every turn (which would burn tokens). We emit a compact
 * XML-ish block the model can reference by handle:
 *
 *   <brand handle="@raqm">
 *     name="Raqm" tone="bold, direct" audience="Gen-Z creators"
 *     colors=[#6B46FF, #0B0B12] fonts=[Inter, JetBrains Mono]
 *     personality=[confident, technical, playful]
 *     logo=@raqm.logo.full
 *   </brand>
 *
 * The block is ~60-120 tokens regardless of how rich the brand is, and the
 * model is instructed to reference assets by handle (e.g. `@raqm.logo.full`,
 * `@raqm.colors.primary`) rather than re-describing them. The canvas
 * renderer resolves handles to real values at render time.
 */
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';

export interface BrandHandles {
  /** `@slug` — root handle; all other handles are relative. */
  brand: string;
  /** Logo variant keys that actually exist on this brand. */
  logos: Array<'full' | 'icon' | 'wordmark' | 'dark' | 'light'>;
  /** Colors keyed by role. */
  colors: Record<string, string>;
  /** Font handles → family names. */
  fonts: Record<string, string>;
}

export interface BrandCardResult {
  /** Short XML-ish block to embed in the system prompt. */
  block: string;
  /** Resolution table the renderer uses to expand handles. */
  handles: BrandHandles;
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildBrandCard(brand: Brand | undefined | null): BrandCardResult {
  if (!brand) {
    return {
      block: '<brand handle="@none">no brand selected</brand>',
      handles: { brand: '@none', logos: [], colors: {}, fonts: {} },
    };
  }

  const handle = `@${brand.slug}`;
  const strategy = brand.guidelines?.strategy;
  const personality = strategy?.personality?.slice(0, 4).join(', ');

  // Logo variants that actually exist.
  const logoKeys: Array<'full' | 'icon' | 'wordmark' | 'dark' | 'light'> = [];
  if (logoUrl(brand)) logoKeys.push('full');
  if (logoUrl(brand, 'iconmark')) logoKeys.push('icon');
  if (logoUrl(brand, 'wordmark')) logoKeys.push('wordmark');
  if (logoUrl(brand, 'mono.black')) logoKeys.push('dark');
  if (logoUrl(brand, 'mono.white')) logoKeys.push('light');

  const colors: Record<string, string> = {};
  if (brand.primaryColor) colors.primary = brand.primaryColor;
  if (brand.secondaryColor) colors.secondary = brand.secondaryColor;

  const fonts: Record<string, string> = {};
  if (brand.fonts?.primary) fonts.primary = brand.fonts.primary;
  if (brand.fonts?.secondary) fonts.secondary = brand.fonts.secondary;

  const lines: string[] = [];
  lines.push(`<brand handle="${handle}">`);
  lines.push(`  name="${brand.name}"`);
  if (brand.tone) lines.push(`  tone="${truncate(brand.tone, 80)}"`);
  if (brand.audience) lines.push(`  audience="${truncate(brand.audience, 80)}"`);
  if (personality) lines.push(`  personality=[${personality}]`);
  if (strategy?.positioning) {
    lines.push(`  positioning="${truncate(strategy.positioning, 120)}"`);
  }
  const colorList = Object.entries(colors).map(([k, v]) => `${k}:${v}`).join(', ');
  if (colorList) lines.push(`  colors={${colorList}}`);
  const fontList = Object.entries(fonts).map(([k, v]) => `${k}:"${v}"`).join(', ');
  if (fontList) lines.push(`  fonts={${fontList}}`);
  if (logoKeys.length) {
    const logoHandles = logoKeys.map((k) => `${handle}.logo.${k}`).join(' ');
    lines.push(`  logos=[${logoHandles}]`);
  }
  lines.push(`</brand>`);

  return {
    block: lines.join('\n'),
    handles: { brand: handle, logos: logoKeys, colors, fonts },
  };
}

/**
 * Resolve a handle like `@raqm.colors.primary` or `@raqm.logo.full` against
 * the live brand. Used by the canvas renderer.
 */
export function resolveHandle(brand: Brand | undefined | null, handle: string): string | undefined {
  if (!brand || !handle.startsWith(`@${brand.slug}`)) return undefined;
  const path = handle.slice(`@${brand.slug}`.length).replace(/^\./, '').split('.');
  const [group, key] = path;
  if (group === 'colors') {
    if (key === 'primary') return brand.primaryColor;
    if (key === 'secondary') return brand.secondaryColor;
  }
  if (group === 'fonts') {
    if (key === 'primary') return brand.fonts?.primary;
    if (key === 'secondary') return brand.fonts?.secondary;
  }
  if (group === 'logo') {
    if (key === 'full') return logoUrl(brand, 'primary');
    if (key === 'icon') return logoUrl(brand, 'iconmark');
    if (key === 'wordmark') return logoUrl(brand, 'wordmark');
    if (key === 'dark') return logoUrl(brand, 'mono.black');
    if (key === 'light') return logoUrl(brand, 'mono.white');
  }
  return undefined;
}
