import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  cachedRecoloredLogo,
  contrastRatio,
  cssUrl,
  extractWrappedImageUrl,
  logoCombosFor,
  logoInkOf,
  recolorLogoPng,
  recolorLogoSvg,
  stripLogoBackground,
} from '../data/recolorLogo';
import {
  bestTextOn,
  contrast,
  contrastReport,
  formatCmyk,
  formatHsl,
  formatRgb,
  normalizeHex,
  paletteFromMockBrand,
  usageProportions,
  wcagLevel,
  type PaletteColor,
  type WcagLevel,
} from '../data/colorPaletteExport';
import { fgOn, fontStack, surface } from './brandStyle';
import { FLATICON_RR_NAMES } from '../data/flaticonNames';
import {
  UPLOAD_HINT,
  canonicalGoogleFamily,
  fontSource,
  isGoogleFontFamily,
  parseWeights,
  weightLabel,
} from '../data/fontExport';
import {
  loadFontFamily,
  registerUploadedFontFamily,
} from '@/shared/design-system/fonts';

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

// Neutral surfaces for the "Original" tiles — light and dark chips the
// unrecoloured artwork sits on. Which one wins is decided per logo from
// its measured/declared ink via `contrastRatio`, never fresh luminance
// math.
const ORIGINAL_BG_LIGHT = '#F4F4F5';
const ORIGINAL_BG_DARK = '#18181B';

/* ─── The logo system ──────────────────────────────────────── */

/**
 * The Logos drilldown is the brand's LOGO SYSTEM, not a wall of colour
 * combinations. Its tiles come from `logoCombosFor` — one ordered list,
 * shared with `data/logoExport.ts`, so a tile and the file it downloads
 * are the same decision:
 *
 *   originals → contrast-checked pairings → mono treatments →
 *   clear space · minimum size · three misuses
 *
 * ### Why nothing here paints a CSS mask if it can help it
 *
 * The old combo tile filled a `mask-image` with the mark colour. On screen
 * that is correct and cheap. In an export it is blank: html2canvas has no
 * mask support, and every colour-combo PNG in the Logos zip came out a
 * coloured rectangle with no logo in it (`.audit/OURS.md` D4). A pairing
 * therefore draws the REAL artwork (`<img>` for an uploaded raster, inline
 * SVG for a vector), and a treatment draws a canvas-recoloured PNG. The
 * mask survives only as the last fallback, for a raster whose canvas is
 * tainted — right on screen, degraded in a file, never silently blank for
 * the common case.
 */

/** `hex` at `alpha`, for construction lines drawn in the logo's own ink. */
function rgba(hex: string, alpha: number): string {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * The artwork, drawn once.
 *
 * `recolor` null keeps the file exactly as uploaded — the only honest way
 * to show a variant the brand owns. A colour flat-fills the silhouette:
 * by regex for a true inline vector (synchronous, and it exports), by
 * canvas for a raster (cached, so the offscreen twin of a tile the user is
 * already looking at needs no await).
 */
function LogoArt({
  logo,
  recolor,
  style,
}: {
  logo: { svg: string; label: string };
  recolor: string | null;
  style?: CSSProperties;
}) {
  const wrappedUrl = extractWrappedImageUrl(logo.svg);
  const key = wrappedUrl && recolor ? `${recolor}|${wrappedUrl}` : null;
  const [recolored, setRecolored] = useState<string | null>(() =>
    wrappedUrl && recolor ? cachedRecoloredLogo(wrappedUrl, recolor) ?? null : null,
  );
  useEffect(() => {
    if (!wrappedUrl || !recolor) {
      setRecolored(null);
      return;
    }
    const hit = cachedRecoloredLogo(wrappedUrl, recolor);
    if (hit) {
      setRecolored(hit);
      return;
    }
    let alive = true;
    void recolorLogoPng(wrappedUrl, recolor).then((data) => {
      if (alive && data) setRecolored(data);
    });
    return () => {
      alive = false;
    };
    // `key` collapses the pair; both parts are read above.
  }, [key, wrappedUrl, recolor]);

  const box: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
    ...style,
  };

  if (!recolor) {
    if (wrappedUrl) return <img src={wrappedUrl} alt="" style={box} />;
    return (
      <span
        style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: sizedSvg(stripLogoBackground(logo.svg)) }}
      />
    );
  }
  if (!wrappedUrl) {
    return (
      <span
        style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{
          __html: sizedSvg(recolorLogoSvg(stripLogoBackground(logo.svg), recolor)),
        }}
      />
    );
  }
  if (recolored) return <img src={recolored} alt="" style={box} />;
  const maskUrl = cssUrl(wrappedUrl);
  return (
    <span
      style={{
        ...box,
        backgroundColor: recolor,
        maskImage: maskUrl,
        WebkitMaskImage: maskUrl,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

/** Force an inline SVG to fill its box — most brand SVGs carry no size. */
function sizedSvg(svg: string): string {
  return svg.replace(
    /<svg\b/i,
    '<svg style="width:100%;height:100%;display:block"',
  );
}

function TileFrame({
  bg,
  children,
  padding = '13% 15%',
  column,
}: {
  bg: string;
  children: ReactNode;
  padding?: string;
  column?: boolean;
}) {
  return (
    <div
      className="brand-asset-render brand-asset-render--logo"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: column ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: column ? '6%' : 0,
        padding,
        backgroundColor: bg,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export function BrandAssetLogoRenderer({ brand, templateIndex }: Props) {
  const body = fontStack(brand, 'body');
  const originalCount = brand.logos.length;

  // The first `logos.length` tiles are the brand's own artwork, unaltered
  // — `brandAssetTemplates` emits one Original per logo ahead of the
  // system tiles. The ground is the one the variant was DRAWN for, which
  // the record states (`variant`), measured rather than guessed where the
  // artwork is a real vector.
  if (templateIndex < originalCount) {
    const original = brand.logos[templateIndex];
    if (!original) return null;
    const ink = logoInkOf(original, brand.colors.core[0]?.hex ?? '#111113');
    const bg =
      contrastRatio(ink, ORIGINAL_BG_DARK) > contrastRatio(ink, ORIGINAL_BG_LIGHT)
        ? ORIGINAL_BG_DARK
        : ORIGINAL_BG_LIGHT;
    return (
      <TileFrame bg={bg}>
        <LogoArt logo={original} recolor={null} />
      </TileFrame>
    );
  }

  const tile = logoCombosFor(brand)[templateIndex - originalCount];
  if (!tile) return null;
  const logo = brand.logos[tile.sourceIndex];
  if (!logo) return null;
  const fg = fgOn(tile.bg.hex);

  if (tile.kind === 'pairing' || tile.kind === 'treatment') {
    return (
      <TileFrame bg={tile.bg.hex}>
        <LogoArt logo={logo} recolor={tile.recolor} />
      </TileFrame>
    );
  }

  const caption = (text: string) => (
    <span
      style={{
        fontFamily: body,
        fontSize: 7,
        letterSpacing: '0.02em',
        lineHeight: 1.3,
        color: rgba(fg, 0.72),
        textAlign: 'center',
      }}
    >
      {text}
    </span>
  );

  if (tile.kind === 'clear-space') {
    // The reference kit states the rule as a formula and draws it: the
    // logo's own box, and a margin of R on every side. Everything here is
    // a fraction of the tile, so the diagram survives any mount width.
    return (
      <TileFrame bg={tile.bg.hex} padding="10% 11%" column>
        <div
          style={{
            position: 'relative',
            width: '76%',
            border: `1px dashed ${rgba(fg, 0.45)}`,
            padding: '11%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              outline: `1px solid ${rgba(fg, 0.28)}`,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoArt logo={logo} recolor={null} />
          </div>
          {(
            [
              { top: '3%', left: '50%', transform: 'translateX(-50%)' },
              { bottom: '3%', left: '50%', transform: 'translateX(-50%)' },
              { left: '3%', top: '50%', transform: 'translateY(-50%)' },
              { right: '3%', top: '50%', transform: 'translateY(-50%)' },
            ] as CSSProperties[]
          ).map((pos, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontFamily: body,
                fontSize: 7,
                fontWeight: 600,
                color: rgba(fg, 0.6),
                ...pos,
              }}
            >
              R
            </span>
          ))}
        </div>
        {caption(tile.note ?? '')}
      </TileFrame>
    );
  }

  if (tile.kind === 'min-size') {
    // Three steps, drawn in proportion, each labelled with the size it
    // stands for. The smallest one IS the floor — a tile that only said
    // "24 px" would leave the reader guessing what that looks like.
    const steps: Array<{ h: number; label: string }> = [
      { h: 10, label: '24 px' },
      { h: 18, label: '48 px' },
      { h: 30, label: '96 px' },
    ];
    return (
      <TileFrame bg={tile.bg.hex} padding="11% 9%" column>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '9%',
            width: '100%',
          }}
        >
          {steps.map((step) => (
            <span
              key={step.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: '0 1 auto',
                minWidth: 0,
              }}
            >
              <span style={{ height: step.h, width: step.h * 2.4, display: 'block' }}>
                <LogoArt logo={logo} recolor={null} />
              </span>
              <span
                style={{
                  fontFamily: body,
                  fontSize: 6,
                  color: rgba(fg, 0.6),
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </span>
          ))}
        </div>
        {caption(tile.note ?? '')}
      </TileFrame>
    );
  }

  // Misuse. Every one of these is a thing the kit has to say OUT LOUD,
  // because a gallery that only ever shows correct usage reads as a menu
  // of options rather than a rule.
  const stretched = tile.misuse === 'stretch';
  return (
    <TileFrame bg={tile.bg.hex} padding="12% 12%" column>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '7%',
          right: '7%',
          width: 13,
          height: 13,
          borderRadius: '50%',
          border: `1px solid ${rgba(fg, 0.55)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: body,
          fontSize: 8,
          lineHeight: 1,
          color: rgba(fg, 0.8),
        }}
      >
        ✕
      </span>
      <span
        style={{
          height: 34,
          width: '68%',
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <LogoArt
          logo={logo}
          recolor={tile.recolor}
          style={stretched ? { transform: 'scaleX(1.55)', transformOrigin: 'center' } : undefined}
        />
      </span>
      {caption(tile.note ?? '')}
    </TileFrame>
  );
}

/* ─── Color swatch ─────────────────────────────────────────── */

/**
 * The Colors drilldown.
 *
 * Three kinds of tile come out of here, indexed off the same palette:
 *
 *   0 … n-1   one tile per brand colour — role, name, HEX, RGB, CMYK,
 *             HSL and how it behaves on white and on black
 *   n         the proportion bar (the 60 / 30 / 10 usage split)
 *   n + 1     the contrast matrix (every pair, pass or fail)
 *
 * The role is what the colour DOES (`paletteFromMockBrand`), never the
 * slot it sits in — the page used to print "CORE 4 … CORE 7", which
 * tells a customer nothing (D40). Neutrals stay out: the grey ladder is
 * generated for every brand and belongs to none of them.
 *
 * The two extra tiles need two extra entries in `brandAssetTemplates`
 * (`data/legacy-mapping.ts`), which this wave does not own; until those
 * land the indices simply never arrive and nothing renders differently.
 */
export function BrandAssetColorRenderer({ brand, templateIndex }: Props) {
  const palette = paletteFromMockBrand(brand);
  if (palette.length === 0) return null;
  if (templateIndex < palette.length) {
    return <ColorSwatchTile color={palette[templateIndex]} />;
  }
  if (templateIndex === palette.length) {
    return <ColorProportionTile colors={palette} />;
  }
  if (templateIndex === palette.length + 1) {
    return <ColorContrastMatrixTile colors={palette} />;
  }
  return null;
}

/** Short code for a WCAG level — the matrix has ~40px per cell. */
function levelCode(level: WcagLevel): string {
  if (level === 'AAA') return 'AAA';
  if (level === 'AA') return 'AA';
  if (level === 'AA Large') return '18';
  return '×';
}

/** One brand colour, fully specified. Everything a print shop, a
 *  stylesheet or an accessibility review asks for is on the tile. */
function ColorSwatchTile({ color }: { color: PaletteColor }) {
  const hex = normalizeHex(color.hex);
  const fg = bestTextOn(hex);
  const report = contrastReport(hex);
  const spec = (label: string, value: string) => (
    <span key={label} style={{ whiteSpace: 'nowrap' }}>
      <span style={{ opacity: 0.6 }}>{label}</span> {value}
    </span>
  );
  return (
    <div
      className="brand-asset-render brand-asset-render--color"
      data-color-role={color.role}
      style={{
        backgroundColor: hex,
        color: fg,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '11px 13px',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          {color.role}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          <ContrastPill ground="#FFFFFF" ink="#111113" level={report.onWhite.level} />
          <ContrastPill ground="#111113" ink="#FFFFFF" level={report.onBlack.level} />
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
        <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
          {color.name}
        </span>
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.06em',
            fontFamily: fontStack(undefined, 'mono'),
            opacity: 0.9,
          }}
        >
          {hex}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px 10px',
          fontSize: 8,
          lineHeight: 1.4,
          letterSpacing: '0.02em',
          fontFamily: fontStack(undefined, 'mono'),
          opacity: 0.88,
        }}
      >
        {spec('RGB', formatRgb(hex))}
        {spec('CMYK', formatCmyk(hex))}
        {spec('HSL', formatHsl(hex))}
      </div>
    </div>
  );
}

/** "AA on white" as a chip you can actually see: the chip IS the ground
 *  being tested, so the badge demonstrates the claim it makes. */
function ContrastPill({
  ground,
  ink,
  level,
}: {
  ground: string;
  ink: string;
  level: WcagLevel;
}) {
  return (
    <span
      style={{
        backgroundColor: ground,
        color: ink,
        border: '1px solid currentColor',
        borderRadius: 3,
        padding: '1px 4px',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.06em',
        lineHeight: 1.5,
      }}
    >
      {levelCode(level)}
    </span>
  );
}

/** The proportional usage bar — how much of a layout each colour should
 *  hold. 60 / 30 / 10, extended for palettes that are not three deep. */
function ColorProportionTile({ colors }: { colors: PaletteColor[] }) {
  const segments = usageProportions(colors).filter((s) => s.pct > 0);
  if (segments.length === 0) return null;
  return (
    <div
      className="brand-asset-render brand-asset-render--color"
      style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'stretch', padding: 0 }}
    >
      {segments.map(({ color, pct }) => {
        const hex = normalizeHex(color.hex);
        const fg = bestTextOn(hex);
        return (
          <div
            key={`${hex}-${color.name}`}
            style={{
              flexGrow: pct,
              flexBasis: 0,
              backgroundColor: hex,
              color: fg,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              gap: 1,
              padding: '10px 8px',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{pct}%</span>
            {pct >= 20 ? (
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {color.name}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Every pair of brand colours, measured. Each cell is the row colour
 *  as a ground with the column colour laid on it, so the reader SEES
 *  the pairing and reads its WCAG level at the same time. */
function ColorContrastMatrixTile({ colors }: { colors: PaletteColor[] }) {
  // Five is the most that stays legible at a 260px mount: six columns of
  // ~40px. Past that the matrix becomes a texture, not a table.
  const shown = colors.slice(0, 5);
  if (shown.length < 2) return null;
  const ground = shown.find((c) => c.role === 'Background')?.hex ?? '#FFFFFF';
  const groundHex = normalizeHex(ground);
  const groundFg = bestTextOn(groundHex);
  const cell: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 0,
  };
  return (
    <div
      className="brand-asset-render brand-asset-render--color"
      style={{
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        backgroundColor: groundHex,
        color: groundFg,
        padding: '9px 10px',
        gap: 5,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `14px repeat(${shown.length}, minmax(0, 1fr))`,
          gridAutoRows: 'minmax(0, 1fr)',
          gap: 2,
          flex: 1,
          minHeight: 0,
        }}
      >
        <span style={cell} />
        {shown.map((c) => (
          <span
            key={`h-${c.name}`}
            style={{ ...cell, backgroundColor: normalizeHex(c.hex), borderRadius: 2 }}
          />
        ))}
        {shown.map((row) => (
          <Fragment key={`r-${row.name}`}>
            <span
              style={{ ...cell, backgroundColor: normalizeHex(row.hex), borderRadius: 2 }}
            />
            {shown.map((col) => {
              const rowHex = normalizeHex(row.hex);
              const colHex = normalizeHex(col.hex);
              const same = rowHex === colHex;
              const level = wcagLevel(contrast(rowHex, colHex));
              return (
                <span
                  key={`c-${row.name}-${col.name}`}
                  style={{ ...cell, backgroundColor: rowHex, borderRadius: 2 }}
                  title={`${col.name} on ${row.name}`}
                >
                  <span
                    style={{
                      backgroundColor: colHex,
                      color: bestTextOn(colHex),
                      borderRadius: 2,
                      padding: '2px 3px',
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {same ? '—' : levelCode(level)}
                  </span>
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <span
        style={{
          fontSize: 7.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0.7,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {'AAA 7:1 · AA 4.5:1 · 18 = 3:1 large · × fails'}
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
