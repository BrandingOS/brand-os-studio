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
  isNearWhite,
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
  type FontSource,
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
  fit = 'box',
}: {
  logo: { svg: string; label: string };
  recolor: string | null;
  style?: CSSProperties;
  /**
   * `box` fills the parent and centres inside it — right for a tile whose
   * ground is the subject. `natural` takes its HEIGHT from the parent and
   * lets the width follow the artwork, which is the only way a box drawn
   * around the logo can hug it: a clear-space diagram whose frame is wider
   * than the drawing states the wrong margin, and a minimum-size ladder of
   * fixed-aspect slots leaves a square mark floating in a landscape box.
   */
  fit?: 'box' | 'natural';
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

  const natural = fit === 'natural';
  const box: CSSProperties = {
    width: natural ? 'auto' : '100%',
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
        dangerouslySetInnerHTML={{ __html: sizedSvg(stripLogoBackground(logo.svg), fit) }}
      />
    );
  }
  if (!wrappedUrl) {
    return (
      <span
        style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{
          __html: sizedSvg(recolorLogoSvg(stripLogoBackground(logo.svg), recolor), fit),
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

/** Force an inline SVG to take a size — most brand SVGs carry none. In
 *  `natural` mode the height leads and the viewBox decides the width, which
 *  is what lets a frame drawn around the artwork hug it. */
function sizedSvg(svg: string, fit: 'box' | 'natural' = 'box'): string {
  const size = fit === 'natural' ? 'height:100%;width:auto' : 'width:100%;height:100%';
  return svg.replace(/<svg\b/i, `<svg style="${size};display:block"`);
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
        // Full-strength ink, not 72%. The low-contrast MISUSE tile is drawn
        // on a ground chosen to defeat the logo, and a held-back caption on
        // it fell under the floor — so the tile that names the rule was
        // breaking it. The rule is illustrated by the ARTWORK; the words
        // explaining it must always be readable.
        color: fg,
        textAlign: 'center',
      }}
    >
      {text}
    </span>
  );

  if (tile.kind === 'clear-space') {
    // The rule is a FORMULA, so the diagram has to obey it: the inner frame
    // hugs the artwork (`fit="natural"` — a frame wider than the drawing
    // states a margin the brand never set), and the dashed margin around it
    // is exactly a third of the frame's height on every side. The four R's
    // sit IN that margin, so the letter and the space it names are the same
    // measurement.
    const LOGO_H = 44;
    const R = Math.round(LOGO_H / 3);
    return (
      <TileFrame bg={tile.bg.hex} padding="10% 11%" column>
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            border: `1px dashed ${rgba(fg, 0.45)}`,
            padding: R,
            boxSizing: 'content-box',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              height: LOGO_H,
              outline: `1px solid ${rgba(fg, 0.3)}`,
            }}
          >
            <LogoArt logo={logo} recolor={null} fit="natural" />
          </span>
          {(
            [
              { top: 1, left: '50%', transform: 'translateX(-50%)' },
              { bottom: 1, left: '50%', transform: 'translateX(-50%)' },
              { left: 1, top: '50%', transform: 'translateY(-50%)' },
              { right: 1, top: '50%', transform: 'translateY(-50%)' },
            ] as CSSProperties[]
          ).map((pos, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontFamily: body,
                fontSize: 7,
                lineHeight: 1,
                fontWeight: 600,
                color: rgba(fg, 0.65),
                ...pos,
              }}
            >
              R
            </span>
          ))}
        </span>
        {caption(tile.note ?? '')}
      </TileFrame>
    );
  }

  if (tile.kind === 'min-size') {
    // Three steps, in proportion, each labelled with the size it stands for.
    // The smallest one IS the floor — a tile that only said "24 px" would
    // leave the reader guessing what that looks like. Each step takes its
    // HEIGHT from the ladder and its width from the artwork, so a square mark
    // and a wide wordmark both step evenly instead of one of them floating in
    // a landscape slot.
    const steps: Array<{ h: number; label: string }> = [
      { h: 13, label: '24 px' },
      { h: 24, label: '48 px' },
      { h: 40, label: '96 px' },
    ];
    return (
      <TileFrame bg={tile.bg.hex} padding="11% 9%" column>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '10%',
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
                gap: 4,
                flex: '0 1 auto',
                minWidth: 0,
              }}
            >
              <span style={{ display: 'inline-flex', height: step.h }}>
                <LogoArt logo={logo} recolor={null} fit="natural" />
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
          // Full strength for the same reason the caption is: this mark is
          // the tile's verdict, on a ground picked to defeat contrast.
          color: fg,
        }}
      >
        ✕
      </span>
      {/* The stretch tile has to SHOW a stretched logo. Clipping it at the
          frame edge reads as a broken export rather than as the mistake being
          named, so the artwork is laid out narrow enough that 1.5× still
          lands inside the tile, and nothing is hidden. */}
      <span style={{ height: 46, width: stretched ? '44%' : '64%', display: 'block' }}>
        <LogoArt
          logo={logo}
          recolor={tile.recolor}
          style={stretched ? { transform: 'scaleX(1.5)', transformOrigin: 'center' } : undefined}
        />
      </span>
      {caption(tile.note ?? '')}
    </TileFrame>
  );
}

/* ─── Color swatch ─────────────────────────────────────────── */

/**
 * The Colors drilldown — the palette as a SYSTEM, not a wall of squares.
 *
 * `variantsForCard` emits exactly one entry per brand colour
 * (`brandAssetTemplates` in `data/legacy-mapping.ts`, which this wave
 * does not own), so there is no list slot for a proportion bar or a
 * contrast matrix. Rather than leave both invisible, the information
 * they carry rides on the tiles that DO exist:
 *
 *   • every tile carries its own ROW of the contrast matrix — the other
 *     brand colours set on this colour's ground, each with its WCAG
 *     level. n tiles therefore hold the whole n × n matrix, and every
 *     row is drawn on the ground it actually describes;
 *   • tile 0 (the Primary) additionally carries the usage split as a
 *     full-bleed companion strip along its foot, because the 60 % of a
 *     60 / 30 / 10 layout IS the primary.
 *
 * `ColorProportionTile` and `ColorContrastMatrixTile` remain reachable at
 * `templateIndex >= palette.length`: the moment two entries are added to
 * `brandAssetTemplates` they become tiles of their own and the companions
 * can be dropped.
 *
 * The role is what the colour DOES (`paletteFromMockBrand`), never the
 * slot it sits in — the page used to print "CORE 4 … CORE 7", which
 * tells a customer nothing (D40). The generated grey ladder stays out:
 * it is drawn for every brand and belongs to none of them.
 */
export function BrandAssetColorRenderer({ brand, templateIndex }: Props) {
  const palette = paletteFromMockBrand(brand);
  if (palette.length === 0) return null;
  if (templateIndex < palette.length) {
    const color = palette[templateIndex];
    const others = palette.filter((_, i) => i !== templateIndex);
    return (
      <ColorSwatchTile
        color={color}
        others={others}
        proportions={templateIndex === 0 ? palette : undefined}
      />
    );
  }
  if (templateIndex === palette.length) {
    return <ColorProportionTile colors={palette} />;
  }
  if (templateIndex === palette.length + 1) {
    return <ColorContrastMatrixTile colors={palette} />;
  }
  return null;
}

/** Short code for a WCAG level — a matrix cell has ~40px, a pair chip
 *  half that, so the level travels as a code rather than a sentence. */
function levelCode(level: WcagLevel): string {
  if (level === 'AAA') return 'AAA';
  if (level === 'AA') return 'AA';
  if (level === 'AA Large') return '18';
  return '×';
}

/**
 * One brand colour, fully specified. Everything a print shop, a
 * stylesheet or an accessibility review asks for is on the tile:
 * role, name, HEX, RGB, CMYK, HSL, how it behaves on white and on
 * black, and which of its siblings can be set on it.
 */
function ColorSwatchTile({
  color,
  others = [],
  proportions,
}: {
  color: PaletteColor;
  others?: PaletteColor[];
  proportions?: PaletteColor[];
}) {
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
        // A near-white swatch has no edge of its own against a light
        // page, so the tile would read as a hole rather than a colour.
        boxShadow: isNearWhite(hex) ? `inset 0 0 0 1px ${rgba(fg, 0.16)}` : undefined,
        padding: 0,
        gap: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          flex: 1,
          minHeight: 0,
          padding: '11px 13px',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
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
        {others.length > 0 ? <PairsRow ground={hex} fg={fg} others={others} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
          <span
            style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.05 }}
          >
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
      {proportions ? <ProportionStrip colors={proportions} /> : null}
    </div>
  );
}

/**
 * This colour's row of the contrast matrix: each sibling set ON this
 * ground, with the level it reaches.
 *
 * The specimen is a SWATCH, not the word "Aa". A letterform painted in
 * the sibling's colour demonstrates the pairing beautifully and is, for
 * every failing pair, a 3:1 text node on our own surface — the exact
 * thing the contrast sweep exists to forbid. So the pairing is shown as
 * a chip of the colour itself (ringed, so a sibling that all but matches
 * the ground still has an edge) and the LEVEL is the only text, drawn in
 * the tile's own readable ink.
 */
function PairsRow({
  ground,
  fg,
  others,
}: {
  ground: string;
  fg: string;
  others: PaletteColor[];
}) {
  // Six siblings is what fits on two lines at a 260px mount; past that
  // the row becomes texture. The matrix tile carries the rest.
  const shown = others.slice(0, 6);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '3px 4px',
        marginTop: 2,
      }}
    >
      <span
        style={{
          fontSize: 7,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginRight: 1,
        }}
      >
        On this
      </span>
      {shown.map((other) => {
        const otherHex = normalizeHex(other.hex);
        const level = wcagLevel(contrast(ground, otherHex));
        return (
          <span
            key={`${other.name}-${otherHex}`}
            title={`${other.name} on this colour — ${level}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              border: `1px solid ${rgba(fg, 0.28)}`,
              borderRadius: 3,
              padding: '1px 4px',
              lineHeight: 1.4,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                alignSelf: 'center',
                backgroundColor: otherHex,
                boxShadow: `inset 0 0 0 1px ${rgba(fg, 0.35)}`,
              }}
            />
            <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.04em' }}>
              {levelCode(level)}
            </span>
          </span>
        );
      })}
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

/** The usage split as a full-bleed strip along a swatch's foot — the
 *  companion the Primary tile carries while the palette has no list
 *  slot of its own. */
function ProportionStrip({ colors }: { colors: PaletteColor[] }) {
  const segments = usageProportions(colors).filter((s) => s.pct > 0);
  if (segments.length < 2) return null;
  return (
    <div
      data-color-proportion
      style={{ display: 'flex', alignItems: 'stretch', height: 22, flexShrink: 0 }}
    >
      {segments.map(({ color, pct }) => {
        const hex = normalizeHex(color.hex);
        return (
          <span
            key={`${hex}-${color.name}`}
            title={`${color.name} — ${pct}%`}
            style={{
              flexGrow: pct,
              flexBasis: 0,
              minWidth: 0,
              backgroundColor: hex,
              color: bestTextOn(hex),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.04em',
              boxShadow: isNearWhite(hex) ? `inset 0 0 0 1px ${rgba(bestTextOn(hex), 0.16)}` : undefined,
            }}
          >
            {pct >= 10 ? `${pct}%` : ''}
          </span>
        );
      })}
    </div>
  );
}

/** The proportional usage bar as a tile of its own — how much of a
 *  layout each colour should hold. 60 / 30 / 10, extended for palettes
 *  that are not three deep. Reachable once `brandAssetTemplates` emits
 *  an entry for it. */
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

/* ─── Typeface specimen ────────────────────────────────────── */

/**
 * One TYPEFACE, drawn in itself.
 *
 * The tile this replaces was an "Aa" and a family name set in the UI's own
 * Inter (audit D35) — a specimen of the product, not of the brand. A
 * typeface tile has one job: prove what the brand's type looks like. So
 * every glyph on it is set in the family it names, at the weight it
 * names, and the tile says four things the old one did not:
 *
 *   • which weights the brand DECLARED, each drawn at that weight, so a
 *     brand claiming 400·500·600·700 shows four visibly different cuts;
 *   • the type SCALE, H1 down to caption, with the sizes, so the family
 *     is judged at the sizes it will be used at rather than at one;
 *   • the PAIRING — what this face is for and what the other one does —
 *     because a typeface decision is never about one face;
 *   • where the files come from, and a NOTICE when they cannot be had.
 *     `GT Super` is a foundry family: it is not on Google Fonts, the
 *     download can only ship a README for it, and until now nothing on
 *     screen said so (audit D32).
 *
 * Sizes are in `cqw` against the tile's own inline size, so the same
 * component is right at the 260px card, the 333px drilldown tile and a
 * 4× offscreen export. No `px` literal decides how big anything is.
 */

/**
 * The scale, as a share of the tile's width.
 *
 * `size` is `px * SCALE_UNIT` — the steps keep their TRUE ratios (48 is
 * three times 16 on the tile as well as in the label), because a specimen
 * that flattens the ratios is showing a scale the brand does not have.
 * `SCALE_UNIT` is the largest value at which all four steps plus the
 * header, the weight row and the footer fit a 1.6-aspect tile.
 */
const SCALE_UNIT = 0.173;
const TYPE_SCALE_STEPS: ReadonlyArray<{ label: string; px: number; weight: 'heading' | 'body' }> = [
  { label: 'H1', px: 48, weight: 'heading' },
  { label: 'H2', px: 32, weight: 'heading' },
  { label: 'Body', px: 16, weight: 'body' },
  { label: 'Caption', px: 12, weight: 'body' },
];

/** The specimen string. Short enough not to wrap at 260px, wide enough to
 *  show ascenders, descenders, a round and a diagonal. */
const SPECIMEN_WORD = 'Handgloves';

/**
 * The CSS stack for ONE declared family.
 *
 * `fontStack(brand, role)` answers for a ROLE; this tile is about a
 * specific entry in `brand.fonts`, which may be the third one. The family
 * comes first, the brand's own declared fallback second, and a generic
 * ladder last — chosen from the name, because a serif that falls back to
 * Helvetica is a different specimen.
 */
function specimenStack(font: { family: string; fallback?: string }): string {
  const name = font.family.trim().replace(/^['"]|['"]$/g, '');
  const quoted = /^[A-Za-z][A-Za-z0-9-]*$/.test(name) ? name : `'${name}'`;
  const lower = name.toLowerCase();
  const generic = /\b(mono|code|courier|consol)/.test(lower)
    ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
    : /\bsans\b|sans-/.test(lower)
      ? 'system-ui, -apple-system, Helvetica, Arial, sans-serif'
      : /serif|slab|garamond|georgia|times|playfair|baskerville|didot|bodoni|caslon|lora|spectral|cormorant|tiempos|canela|recoleta|super/.test(
            lower,
          )
        ? "Georgia, 'Times New Roman', Times, serif"
        : 'system-ui, -apple-system, Helvetica, Arial, sans-serif';
  const declared = font.fallback?.trim();
  return [quoted, declared, generic].filter(Boolean).join(', ');
}

/** What this face is FOR — read off the role the brand gave it. */
function usageLine(role: string): string {
  const r = (role ?? '').toLowerCase();
  if (/mono|code/.test(r)) return 'Code, data and tabular figures.';
  if (/display|head|title|primary/.test(r)) return 'Headlines and titles. Tighten tracking above 32px.';
  if (/text|body|para|secondary/.test(r)) return 'Body copy, labels and UI. 16px floor, 1.5 line height.';
  return 'Everything the brand sets in type.';
}

/** The other half of the pairing, in one sentence. */
function pairingLine(
  fonts: MockBrand['fonts'],
  index: number,
): string {
  const self = fonts[index];
  const other = fonts.find((f, i) => i !== index && f.family !== self?.family);
  if (!other) return 'The brand sets everything in this one face.';
  return `Pairs with ${other.family} for ${(other.role || 'the rest').toLowerCase()}.`;
}

/** What the download can actually ship for this family. */
const SOURCE_BADGE: Record<FontSource, string> = {
  uploaded: 'Your files',
  google: 'Google Fonts',
  unavailable: 'Not bundled',
};

export function BrandAssetFontRenderer({ brand, templateIndex }: Props) {
  const f = brand.fonts[templateIndex];
  const family = f?.family ?? '';
  const files = f?.files;
  // Load the face the tile is a specimen OF. Uploaded bytes win — they are
  // the cut the user owns. A family that is not on Google is never asked
  // for: the request 400s and Chrome reports it as an error the user can
  // see, which is exactly what this tile is here to explain in words
  // instead (see `isGoogleFontFamily`).
  useEffect(() => {
    if (!family) return;
    if (files && files.length > 0) registerUploadedFontFamily(family, files);
    else if (isGoogleFontFamily(family)) loadFontFamily(family);
  }, [family, files]);

  if (!f) return null;

  const tokens = surface(brand, 'card');
  const source = fontSource(f);
  const weights = parseWeights(f.weights);
  const heaviest = weights[weights.length - 1] ?? 400;
  const lightest = weights[0] ?? 400;
  const stack = specimenStack(f);
  const label = canonicalGoogleFamily(family) ?? family;

  const eyebrow: CSSProperties = {
    fontSize: '2.5cqw',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    lineHeight: 1,
    color: tokens.textMuted,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="brand-asset-render brand-asset-render--font"
      // The OUTER box only declares the container. Nothing on it may be
      // sized in `cqw`: a container's own properties cannot query itself,
      // so the unit silently resolves against the next container out — the
      // viewport — and a 5cqw padding on a 333px tile came out 79px. The
      // padding, the gaps and every type size live on the inner box, which
      // is a normal descendant and resolves against this one.
      style={{
        containerType: 'inline-size',
        display: 'block',
        padding: 0,
        background: tokens.bg,
        color: tokens.text,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: '1.4cqw',
          padding: '4.4cqw 5cqw',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
      {/* Role + where the files come from. */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2cqw' }}>
        <span style={eyebrow}>{f.role || 'Typeface'}</span>
        <span style={{ ...eyebrow, opacity: 0.85 }}>{SOURCE_BADGE[source]}</span>
      </div>

      {/* The family, set in itself, at the heaviest weight it declares. */}
      <span
        style={{
          fontFamily: stack,
          fontWeight: heaviest,
          fontSize: '5.6cqw',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: tokens.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>

      {/* Every declared weight, each drawn at that weight. */}
      <div style={{ display: 'flex', gap: '2.6cqw', alignItems: 'baseline', flexWrap: 'nowrap', overflow: 'hidden' }}>
        {weights.map((w) => (
          <span
            key={w}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.4cqw',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: stack,
                fontWeight: w,
                fontSize: '4cqw',
                lineHeight: 1,
                color: tokens.text,
              }}
            >
              Aa
            </span>
            <span style={{ ...eyebrow, fontSize: '1.9cqw', letterSpacing: '0.08em' }}>{w}</span>
          </span>
        ))}
      </div>

      {/* The scale — the family judged at the sizes it will be used at. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6cqw',
          borderTop: `0.35cqw solid ${tokens.border}`,
          paddingTop: '1.8cqw',
        }}
      >
        {TYPE_SCALE_STEPS.map((step) => (
          <span
            key={step.label}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '2cqw',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontFamily: stack,
                fontWeight: step.weight === 'heading' ? heaviest : lightest,
                fontSize: `${(step.px * SCALE_UNIT).toFixed(2)}cqw`,
                lineHeight: 1.1,
                letterSpacing: step.px >= 32 ? '-0.02em' : '0',
                color: tokens.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {SPECIMEN_WORD}
            </span>
            <span style={{ ...eyebrow, fontSize: '1.9cqw', letterSpacing: '0.06em', flex: '0 0 auto' }}>
              {step.label} {step.px}
            </span>
          </span>
        ))}
      </div>

      {/* The pairing rule, and — when we cannot get the files — why. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6cqw' }}>
        <span style={{ fontSize: '2.3cqw', lineHeight: 1.35, color: tokens.textMuted }}>
          {pairingLine(brand.fonts, templateIndex)}
        </span>
        <span style={{ fontSize: '2.3cqw', lineHeight: 1.35, color: tokens.textMuted }}>
          {source === 'unavailable' ? UPLOAD_HINT : usageLine(f.role)}
        </span>
        </div>
      </div>
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
