import type { CSSProperties } from 'react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  contrastRatio,
  cssUrl,
  extractWrappedImageUrl,
  firstLogoColor,
  logoCombosFor,
  logoToMaskSvg,
  svgToCssUrl,
} from '../data/recolorLogo';
import { FLATICON_RR_NAMES } from '../data/flaticonNames';

/**
 * Renderers for the Brand Assets drilldown tiles.
 *
 * Each renderer receives the user's MockBrand and a `templateIndex`
 * — same shape as the other cosmos extended renderers — and paints
 * a single drilldown tile from real Setup data. The dispatcher in
 * `renderers/index.tsx` routes brand-asset template types here.
 *
 * Indices come from `brandAssetTemplates()` in `legacy-mapping.ts`,
 * which emits one template per actual asset (or per logo×color
 * combo). If the index falls outside the live data the renderer
 * returns null so the empty tile still slots cleanly into the grid.
 */

type Props = { brand: MockBrand; templateIndex: number };

/* ─── Logo combo (mark color × bg color) ───────────────────── */

// Neutral surfaces for the "Original" tiles — light and dark chips
// the unrecolored artwork sits on. Which one wins is decided per
// logo via `contrastRatio`, never by fresh luminance math.
const ORIGINAL_BG_LIGHT = '#F4F4F5';
const ORIGINAL_BG_DARK = '#18181B';

export function BrandAssetLogoRenderer({ brand, templateIndex }: Props) {
  // The first `logos.length` tiles show the ORIGINAL uploaded artwork
  // unrecolored — mirrors the template list in `brandAssetTemplates`,
  // which emits one Original entry per logo ahead of the combos.
  const originalCount = brand.logos.length;
  if (templateIndex < originalCount) {
    const original = brand.logos[templateIndex];
    if (!original) return null;
    // Pick the neutral the artwork reads on: sample the logo's first
    // painted color and keep whichever chip contrasts harder against
    // it. Wrapped `<image>` uploads expose no color — default to the
    // light chip (uploads are overwhelmingly dark-on-transparent).
    const sample = firstLogoColor(original.svg);
    const bg =
      sample && contrastRatio(sample, ORIGINAL_BG_DARK) > contrastRatio(sample, ORIGINAL_BG_LIGHT)
        ? ORIGINAL_BG_DARK
        : ORIGINAL_BG_LIGHT;
    const originalUrl = extractWrappedImageUrl(original.svg);
    return (
      <div
        className="brand-asset-render brand-asset-render--logo"
        style={{ backgroundColor: bg }}
      >
        {originalUrl ? (
          <img src={originalUrl} alt="" className="brand-asset-render-logo-img" />
        ) : (
          <span
            className="brand-asset-render-logo-svg"
            dangerouslySetInnerHTML={{ __html: original.svg }}
          />
        )}
      </div>
    );
  }
  const combos = logoCombosFor(brand);
  const combo = combos[templateIndex - originalCount];
  if (!combo) return null;
  const logo = brand.logos[combo.logoIndex];
  if (!logo) return null;
  // Render the logo as a CSS mask so the silhouette paints in the
  // chosen mark color regardless of how the source asset is shaped.
  //
  // Two paths:
  //   • brandToMockBrand-style SVGs wrap the user's asset in
  //     `<svg><image href="URL"/></svg>`. Browsers refuse to load
  //     external resources from inside an SVG used as a mask, so the
  //     wrapper renders blank — we extract the inner URL and use it
  //     directly as the mask source instead.
  //   • Pure inline-vector SVGs (text/shape logos) get their fills
  //     forced to white, then the whole SVG becomes the mask.
  const wrappedUrl = extractWrappedImageUrl(logo.svg);
  const maskUrl = wrappedUrl ? cssUrl(wrappedUrl) : svgToCssUrl(logoToMaskSvg(logo.svg));
  const maskStyle: CSSProperties = {
    backgroundColor: combo.mark.hex,
    maskImage: maskUrl,
    WebkitMaskImage: maskUrl,
  };
  return (
    <div
      className="brand-asset-render brand-asset-render--logo"
      style={{ backgroundColor: combo.bg.hex }}
    >
      <span className="brand-asset-render-logo-mask" style={maskStyle} />
    </div>
  );
}

/* ─── Color swatch ─────────────────────────────────────────── */

export function BrandAssetColorRenderer({ brand, templateIndex }: Props) {
  const core = brand.colors.core;
  const accent = brand.colors.accent;
  // Neutrals are intentionally excluded from the Colors drilldown —
  // keep the renderer's color array in sync with the template list.
  const colors = [...core, ...accent];
  const c = colors[templateIndex];
  if (!c) return null;
  // Resolve the usage role for the small-caps label above the name.
  // Mirrors the editor's mapping: core slots are Primary / Secondary
  // / Background; accents get the bucket-level "Accent" label.
  const CORE_ROLES = ['Primary', 'Secondary', 'Background'] as const;
  const role =
    templateIndex < core.length
      ? CORE_ROLES[templateIndex] ?? `Core ${templateIndex + 1}`
      : 'Accent';
  return (
    <div
      className="brand-asset-render brand-asset-render--color"
      style={{ backgroundColor: c.hex, color: readableOn(c.hex) }}
    >
      <span className="brand-asset-render-color-meta">
        <span className="brand-asset-render-color-role">{role}</span>
        <span className="brand-asset-render-color-name">{c.name}</span>
        <span className="brand-asset-render-color-hex">{c.hex.toUpperCase()}</span>
      </span>
    </div>
  );
}

/** Pick black / white text per swatch luminance — same heuristic the
 *  editor uses so the drilldown tiles stay readable on every hue. */
function readableOn(hex: string): '#111113' | '#ffffff' {
  const m = hex.replace('#', '');
  const expanded = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  // Standard luminance formula. >150 → use dark text, else light.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#111113' : '#ffffff';
}

/* ─── Font preview ─────────────────────────────────────────── */

export function BrandAssetFontRenderer({ brand, templateIndex }: Props) {
  const f = brand.fonts[templateIndex];
  if (!f) return null;
  const stack = `${f.family}, ${f.fallback ?? 'sans-serif'}`;
  return (
    <div className="brand-asset-render brand-asset-render--font">
      <span className="brand-asset-render-font-sample" style={{ fontFamily: stack }}>
        Aa
      </span>
      <span className="brand-asset-render-font-meta">
        <span className="brand-asset-render-font-role">{f.role}</span>
        <span className="brand-asset-render-font-family" style={{ fontFamily: stack }}>
          {f.family}
        </span>
      </span>
    </div>
  );
}

/* ─── Icon ─────────────────────────────────────────────────── */

/** Detect a Flaticon UICONS class name (e.g. "fi-rr-camera"). The
 *  picker stores these as plain strings in `brand.icons`; the
 *  renderer paints them with the package's webfont via `<i>`. */
function isFlaticonClass(value: string): boolean {
  return /^fi-(rr|br|sr|rs|bs|ss|tr|ts|brands)-[a-z0-9-]+$/i.test(value.trim());
}

const FLATICON_RR_SET = new Set(FLATICON_RR_NAMES);

/** If a bare name (e.g. 'camera') matches a Flaticon RR icon, return
 *  its full class name. Lets `mockBrand.icons` keep its original
 *  bare-string shape (which Setup's ICON_MAP also reads) while still
 *  rendering nicely via the webfont in the cosmos brand kit. */
function bareNameToFlaticon(value: string): string | null {
  const candidate = `fi-rr-${value.trim().toLowerCase()}`;
  return FLATICON_RR_SET.has(candidate) ? candidate : null;
}

export function BrandAssetIconRenderer({ brand, templateIndex }: Props) {
  const src = brand.icons[templateIndex];
  if (!src) return null;
  const trimmed = src.trim();
  const flaticonClass = isFlaticonClass(trimmed) ? trimmed : bareNameToFlaticon(trimmed);
  // Paint the glyph in the brand's primary color so the Icons drilldown
  // reads as part of the brand identity. We resolve color through the
  // CSS custom property `--bk-icon-tint` first so an ancestor (the
  // drilldown's global Edit popover) can swap the kit's tint without
  // each renderer holding its own state.
  const tintColor = brand.colors.core[0]?.hex;
  const tintStyle: CSSProperties | undefined = tintColor
    ? { color: `var(--bk-icon-tint, ${tintColor})` }
    : { color: 'var(--bk-icon-tint, currentColor)' };
  if (flaticonClass) {
    return (
      <div className="brand-asset-render brand-asset-render--icon" style={tintStyle}>
        <i
          className={`fi ${flaticonClass} brand-asset-render-icon-glyph`}
          aria-hidden
        />
      </div>
    );
  }
  const isInlineSvg = trimmed.startsWith('<svg');
  return (
    <div className="brand-asset-render brand-asset-render--icon" style={tintStyle}>
      {isInlineSvg ? (
        <span
          className="brand-asset-render-icon-glyph"
          dangerouslySetInnerHTML={{ __html: src }}
        />
      ) : (
        <img src={src} alt="" className="brand-asset-render-icon-img" />
      )}
    </div>
  );
}

/* ─── Photo ────────────────────────────────────────────────── */

export function BrandAssetPhotoRenderer({ brand, templateIndex }: Props) {
  const p = brand.photos[templateIndex];
  if (!p) return null;
  return (
    <div
      className="brand-asset-render brand-asset-render--photo"
      style={{ backgroundImage: `url(${p.src})` }}
    >
      <span className="brand-asset-render-photo-slot">Slot {p.slot}</span>
    </div>
  );
}

/* ─── About entry ──────────────────────────────────────────── */

export function BrandAssetAboutRenderer({ brand, templateIndex }: Props) {
  const a = brand.about[templateIndex];
  if (!a) return null;
  return (
    <div className="brand-asset-render brand-asset-render--about">
      <span className="brand-asset-render-about-title">{a.title}</span>
      <p className="brand-asset-render-about-body">{a.content}</p>
    </div>
  );
}
