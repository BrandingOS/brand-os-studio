/**
 * The Mockups toolkit — how a brand is drawn ONTO an object.
 *
 * A mockup family is usually a folder of photographs with a logo warped
 * onto them. Ours are VECTOR SCENES: the sign, the tee, the mug, the
 * billboard and the phone are drawn here in SVG, in the brand's own
 * neutrals, and the artwork is composited through the same contrast
 * helpers every other surface in the app uses. Two consequences, both of
 * them the point:
 *
 *   • A scene restyles with the brand instead of ageing into stock art.
 *     Change the palette and the tote's canvas, the sign's wall and the
 *     ink on both move together.
 *   • The defects the audit found in the hidden renderers — white print
 *     on a cream tee at seven indexes, dark text on a black tote at three
 *     — are IMPOSSIBLE here rather than fixed here. A print surface is
 *     chosen first and its ink is `fgOn(thatSurface)`; there is no branch
 *     in which a renderer names both.
 *
 * ## The anatomy of a scene
 *
 *     <Scene ground>            flat, opaque, from the brand's neutrals
 *       <SceneLight/>           SVG: where the light comes from
 *       <CastShadow/>           SVG: what the object sits on
 *       <svg>…object…</svg>     SVG: silhouette, shading, perspective
 *       <Print bg>              flat, opaque — the printable face
 *         <Mark/> <Primary/> …  the artwork; every text is a <Bind>
 *       </Print>
 *     </Scene>
 *
 * The print face is a FLAT opaque colour and the text sits directly on
 * it. That is what makes the contrast sweep meaningful: it climbs from a
 * text node until it finds an opaque background, and a face painted with
 * a gradient would be reported as "skipped" rather than measured. Light
 * and shading are drawn AROUND the face, never through the type.
 *
 * ## Sizes
 *
 * Authored for a 260px-wide card — the `ScaledStage` contract the kit
 * tiles and the offscreen exporter both use (lay out at 260, transform to
 * the tile's width). Geometry is therefore in PERCENTAGES so a scene
 * survives any box it is given; only type is in px, because type is what
 * the 260px reference fixes.
 */
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import type {
  DeliverableContent,
  MockupLabelContent,
  TemplateDesignPicks,
} from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  brandColors,
  contrastOf,
  contrastOk,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';

/* ── What every mockup renderer is handed ─────────────────────────── */

export type MockupRendererProps = {
  brand: Brand;
  templateIndex: number;
  /** Present in the editor and in Quick Edit; absent in the grid. */
  content?: DeliverableContent;
};

/** One design, as this family declares it. */
export type MockupScene = {
  /** The template's id suffix — `ext-3`. A PERSISTENCE KEY: never renumber. */
  idSuffix: string;
  name: string;
  category: string;
  tags: string[];
  render: (ctx: SceneContext) => ReactNode;
};

/**
 * A design before it is given an id.
 *
 * Ids are POSITIONS in a family's list and are persistence keys, so they
 * are assigned in one place (`withIds`) rather than typed out beside each
 * design — which is how a family ends up with two designs claiming
 * `ext-4` after a reorder.
 */
export type MockupSceneDef = Omit<MockupScene, 'idSuffix'>;

/**
 * Number a family's designs. `startAt` exists for the one family whose
 * scenes are authored in three modules but share a single id space.
 */
export function withIds(
  defs: ReadonlyArray<MockupSceneDef>,
  startAt = 1,
): ReadonlyArray<MockupScene> {
  return defs.map((def, i) => ({ ...def, idSuffix: `ext-${startAt + i}` }));
}

export type SceneContext = {
  brand: Brand;
  c: MockupLabelContent;
  p: MockupPalette;
};

/**
 * The content this artifact says, whatever the caller supplied.
 *
 * A grid tile and an offscreen export are rendered with no content at
 * all, so the family paints the kind's own brand-derived defaults; the
 * editor passes the saved object. Either way the renderer reads ONE
 * shape and never a literal.
 */
export function mockupLabelContent(
  brand: Brand,
  content?: DeliverableContent,
): MockupLabelContent {
  if (content && content.kind === 'mockupLabel') return content;
  return hydrateContent('mockupLabel', brand, undefined) as MockupLabelContent;
}

/* ── The scene's colours ──────────────────────────────────────────── */

/**
 * Four grounds and two inks, all of them the brand's.
 *
 * `paper`, `wall` and `dark` come from `surfacePalette` — brand-TINTED
 * neutrals, not grey — so a scene reads as this brand's world rather than
 * a generic studio. `brand` / `brandAlt` are the brand's own colours, and
 * `picks` overrides them when the customer chose differently for THIS
 * template.
 */
export type MockupPalette = {
  /** The brand's primary, or the design pick that replaced it. */
  brand: string;
  brandAlt: string;
  /** Lightest neutral — paper, ceramic, a painted wall in daylight. */
  paper: string;
  /** A mid neutral — raw canvas, a shaded wall, a card's edge. */
  wall: string;
  /** Near-black, tinted with the brand's hue. */
  dark: string;
  heading: string;
  body: string;
  /** `picks.showLogo === false` means draw the monogram instead. */
  showLogo: boolean;
  /** `picks.logoColor`, honoured only where it actually reads. */
  logoInk?: string;
};

function picksOf(c: MockupLabelContent): TemplateDesignPicks {
  return (c as MockupLabelContent & { picks?: TemplateDesignPicks }).picks ?? {};
}

export function mockupPalette(brand: Brand, c: MockupLabelContent): MockupPalette {
  const picks = picksOf(c);
  const colors = brandColors(brand);
  return {
    brand: normalizeHex(picks.primaryColor) ?? colors.primary,
    brandAlt: normalizeHex(picks.secondaryColor) ?? colors.secondary,
    paper: surface(brand, 'page').bg,
    wall: surface(brand, 'subtle').bg,
    dark: surface(brand, 'inverted').bg,
    heading: fontStack(brand, 'heading'),
    body: fontStack(brand, 'body'),
    showLogo: picks.showLogo !== false,
    logoInk: normalizeHex(picks.logoColor),
  };
}

/**
 * The most readable foreground for a face — black or white.
 *
 * The one call every print surface makes. Named separately from `fgOn`
 * only so a scene reads as "ink on this face" rather than as a colour
 * decision the scene made for itself.
 */
export function ink(faceBg: string): string {
  return fgOn(faceBg);
}

/**
 * A BRAND colour on a face, but only when it genuinely reads there.
 *
 * Tries the brand's own colours in order and takes the most readable one
 * that clears WCAG AA; falls back to plain ink. This is what stops an
 * accent line from being the thing that fails a sweep — a brand colour is
 * an ambition, never an override of legibility.
 */
export function accentOn(faceBg: string, p: MockupPalette, large = false): string {
  const candidates = [p.brand, p.brandAlt].filter((hex) => contrastOk(hex, faceBg, large));
  if (candidates.length === 0) return ink(faceBg);
  return candidates.sort((a, b) => contrastOf(b, faceBg) - contrastOf(a, faceBg))[0]!;
}

/** `over` at `alpha` on top of `under`, as an opaque hex. */
function mix(over: string, under: string, alpha: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = rgb(normalizeHex(over) ?? '#000000');
  const [br, bg, bb] = rgb(normalizeHex(under) ?? '#ffffff');
  const ch = (a: number, b: number) =>
    Math.round(a * alpha + b * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(ar!, br!)}${ch(ag!, bg!)}${ch(ab!, bb!)}`;
}

/**
 * A muted ink — the face's own text colour, held back only as far as it
 * can be held back and still read.
 *
 * The obvious implementation is a fixed `rgba(…, 0.62)`, and it is wrong
 * for exactly the case this family is full of: on near-white and
 * near-black it lands around 6:1, but on a MID-TONE brand colour — Raqm's
 * violet, SKAM's red — white at 72% composites to a pale tint that scores
 * 3.7:1 against the colour underneath it. Measured, not guessed: six
 * violations in the first contrast run, every one of them a secondary line
 * on a brand-coloured face.
 *
 * So the hold-back is tried in order and the first value that clears AA on
 * this particular face wins; a face where nothing is quiet enough gets the
 * full ink. Muting is a preference, legibility is not. Returned opaque, so
 * what the sweep measures and what the reader sees are the same colour.
 */
export function mutedOn(faceBg: string, large = false): string {
  const full = ink(faceBg);
  for (const alpha of [0.62, 0.74, 0.86]) {
    const held = mix(full, faceBg, alpha);
    if (contrastOk(held, faceBg, large)) return held;
  }
  return full;
}

/* ── The frame ────────────────────────────────────────────────────── */

export function Scene({
  ground,
  children,
  style,
}: {
  ground: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="bkm-scene"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: ground,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** SVG ids have to be unique per mount and may not carry React's colons. */
function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}

const FULL_BLEED: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

/**
 * Where the light comes from.
 *
 * A soft key from one corner and a floor shade at the bottom. Painted
 * BELOW the object, so the object's own shading reads against it and no
 * text is ever measured through it.
 */
export function SceneLight({
  x = 28,
  y = 16,
  strength = 0.55,
  floor = 0.16,
  tint = '#ffffff',
  shade = '#000000',
}: {
  x?: number;
  y?: number;
  strength?: number;
  floor?: number;
  tint?: string;
  shade?: string;
}) {
  const key = useSvgId('key');
  const bottom = useSvgId('floor');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={FULL_BLEED} aria-hidden="true">
      <defs>
        <radialGradient id={key} cx={`${x}%`} cy={`${y}%`} r="78%">
          <stop offset="0%" stopColor={tint} stopOpacity={strength} />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={bottom} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor={shade} stopOpacity="0" />
          <stop offset="100%" stopColor={shade} stopOpacity={floor} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${key})`} />
      <rect width="100" height="100" fill={`url(#${bottom})`} />
    </svg>
  );
}

/** What the object sits on. Percent coordinates, blurred. */
export function CastShadow({
  cx,
  cy,
  rx,
  ry,
  opacity = 0.3,
  blur = 2.4,
  color = '#000000',
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity?: number;
  blur?: number;
  color?: string;
}) {
  const f = useSvgId('blur');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={FULL_BLEED} aria-hidden="true">
      <defs>
        <filter id={f} x="-40%" y="-60%" width="180%" height="240%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={opacity} filter={`url(#${f})`} />
    </svg>
  );
}

/**
 * An SVG layer in percent coordinates, for an object's own silhouette.
 *
 * `preserveAspectRatio="none"` so the drawing follows whatever box the
 * card gives it — a mockup scene is a composition, not a technical
 * drawing, and a letterboxed object inside a stretched frame is the
 * defect this avoids.
 */
export function SceneSvg({
  children,
  style,
  viewBox = '0 0 100 100',
  preserve = 'none',
}: {
  children: ReactNode;
  /** Position it in the scene. Defaults to full bleed. */
  style?: CSSProperties;
  viewBox?: string;
  /**
   * `none` stretches the drawing to the box, which is right for washes,
   * shadows and flat panels. A curved part — a mug handle, a tote strap,
   * an awning — must keep its proportions, so it gets its OWN small box
   * (positioned in percentages) and `xMidYMid meet`.
   */
  preserve?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={preserve}
      style={{ ...FULL_BLEED, ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * A printable face: flat, opaque, and the only thing type ever sits on.
 *
 * `bg` is the surface; every ink inside is derived from it. `transform`
 * is where a scene's perspective lives — the face is skewed to sit on the
 * object drawn beneath it, and its contents skew with it.
 */
export function Print({
  bg,
  style,
  children,
  className,
  curve,
  curveFrom = 'left',
}: {
  bg: string;
  style?: CSSProperties;
  children: ReactNode;
  className?: string;
  /** Edge shading for a face that wraps — see `FaceCurve`. */
  curve?: number;
  curveFrom?: 'left' | 'top';
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        backgroundColor: bg,
        overflow: 'hidden',
        ...style,
      }}
    >
      {curve ? <FaceCurve strength={curve} from={curveFrom} /> : null}
      {/*
       * Positioned, so the artwork paints ABOVE the curvature pass. An
       * absolutely-positioned sibling otherwise paints over static
       * content in the same stacking context, and the shading would sit
       * on top of the type it is meant to sit behind.
       */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}

/**
 * A curvature / sheen pass for a face that wraps around an object.
 *
 * Sits INSIDE the face and above it, but is drawn only at the EDGES: the
 * middle third is left untouched, which is where every scene puts its
 * type. That keeps the measured background and the perceived one the
 * same colour where it matters.
 */
export function FaceCurve({
  strength = 0.16,
  from = 'left',
}: {
  strength?: number;
  from?: 'left' | 'top';
}) {
  const g = useSvgId('curve');
  const horizontal = from === 'left';
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={FULL_BLEED} aria-hidden="true">
      <defs>
        <linearGradient
          id={g}
          x1="0"
          y1="0"
          x2={horizontal ? '1' : '0'}
          y2={horizontal ? '0' : '1'}
        >
          <stop offset="0%" stopColor="#000000" stopOpacity={strength} />
          <stop offset="22%" stopColor="#000000" stopOpacity="0" />
          <stop offset="78%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={strength * 0.8} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${g})`} />
    </svg>
  );
}

/* ── The artwork ──────────────────────────────────────────────────── */

/** The first letter of what the artifact actually says. */
function initialOf(c: MockupLabelContent): string {
  const word = c.primaryText.trim().replace(/[^\p{L}\p{N}]/gu, '');
  return (word.charAt(0) || '·').toUpperCase();
}

/**
 * The brand's mark, composited so it READS on the face it is placed on.
 *
 * `logoOn` returns the variant that clears the readability floor on this
 * background, or nothing — and nothing is an honest answer, not a reason
 * to draw the primary anyway. When there is no readable variant (or the
 * design pick turned the logo off) the scene falls back to a monogram
 * drawn in the face's own ink, which cannot be invisible.
 */
export function Mark({
  brand,
  c,
  p,
  on,
  size,
  style,
}: {
  brand: Brand;
  c: MockupLabelContent;
  p: MockupPalette;
  /** The face this mark is placed on. */
  on: string;
  /** Height in px at the 260px reference width. */
  size: number;
  style?: CSSProperties;
}) {
  const resolved = p.showLogo ? logoOn(brand, on) : undefined;
  if (resolved) {
    return (
      <img
        src={resolved.url}
        alt=""
        style={{
          height: size,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          ...style,
        }}
      />
    );
  }
  const tint = p.logoInk && contrastOk(p.logoInk, on, size >= 24) ? p.logoInk : ink(on);
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: p.heading,
        fontSize: size,
        lineHeight: 1,
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: tint,
        display: 'block',
        ...style,
      }}
    >
      {initialOf(c)}
    </span>
  );
}

/* ── Bound text ───────────────────────────────────────────────────── */

type LineProps = {
  c: MockupLabelContent;
  style?: CSSProperties;
  className?: string;
};

/** The brand name on the object. Shrinks rather than truncating. */
export function Primary({ c, style, className }: LineProps) {
  return (
    <Bind
      path="primaryText"
      value={c.primaryText}
      fit="shrink"
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
}

/** The line under it — a tagline, a category, a street. */
export function Secondary({ c, style, className, wrap = false }: LineProps & { wrap?: boolean }) {
  return (
    <Bind
      path="secondaryText"
      value={c.secondaryText}
      fit={wrap ? 'wrap' : 'clamp'}
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
}

/** The address the object sends people to. */
export function Url({ c, style, className }: LineProps) {
  return (
    <Bind
      path="url"
      value={c.url}
      fit="clamp"
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
}

/**
 * The badge — a stamp, a swing tag, an opening line.
 *
 * It is the one field of this kind that defaults to EMPTY, because a
 * badge nobody wrote is a claim nobody made. An empty badge takes the
 * pill out of the composition entirely rather than leaving a blank
 * lozenge on the artwork; the field itself stays declared, so the panel
 * still offers it and typing into it brings the pill back.
 */
export function Badge({
  c,
  on,
  p,
  style,
  variant = 'pill',
}: {
  c: MockupLabelContent;
  /** The face the badge sits on. */
  on: string;
  p: MockupPalette;
  style?: CSSProperties;
  variant?: 'pill' | 'plain';
}) {
  const empty = c.badge.trim().length === 0;
  const pill = variant === 'pill';
  const fill = pill ? accentOn(on, p) : 'transparent';
  const fg = pill ? ink(fill) : accentOn(on, p);
  return (
    <span
      style={{
        display: empty ? 'none' : 'inline-flex',
        alignItems: 'center',
        backgroundColor: pill ? fill : undefined,
        color: fg,
        fontFamily: p.body,
        fontSize: 5,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        padding: pill ? '2px 6px' : 0,
        borderRadius: pill ? 999 : 0,
        ...style,
      }}
    >
      <Bind path="badge" value={c.badge} fit="clamp" />
    </span>
  );
}

/**
 * Every field of the kind, declared once.
 *
 * A scene places the fields its surfaces have room for; this renders the
 * REST off-screen so the design still declares the whole model. Without
 * it a customer editing "Badge" on a scene with no badge surface would
 * type into a field that repaints nothing — which is the silent failure
 * the bind sweep exists to catch, and it fails a family that leaves any
 * field undeclared.
 *
 * It is `aria-hidden` and zero-area: no reader reaches it and the
 * contrast sweep skips it as invisible, which is correct — there is
 * nothing to read.
 */
export function DeclareRest({
  c,
  omit,
}: {
  c: MockupLabelContent;
  omit: ReadonlyArray<'primaryText' | 'secondaryText' | 'badge' | 'url'>;
}) {
  const rest = (['primaryText', 'secondaryText', 'badge', 'url'] as const).filter(
    (path) => !omit.includes(path),
  );
  if (rest.length === 0) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {rest.map((path) => (
        <Bind key={path} path={path} value={c[path]} fit="none" />
      ))}
    </span>
  );
}

/* ── Dispatch ─────────────────────────────────────────────────────── */

/**
 * The scene an index names — BY ID, not by position.
 *
 * `templateIndex` is the dispatcher's reading of `…-ext-N`, so the scene
 * it means is the one whose `idSuffix` is `ext-${N}`. Resolving by
 * position instead would be the same answer only while a module's designs
 * start at 1 and none is ever culled — and Signage, Business Card Stack
 * and Device Screen share ONE id space (`mockups-ext-21…38`) across three
 * modules, so their positions and their ids differ by construction.
 * Looking the id up is also what makes culling a design in the middle of
 * a family safe: the survivors keep their keys.
 */
export function sceneAtIndex(
  scenes: ReadonlyArray<MockupScene>,
  templateIndex: number,
): MockupScene | undefined {
  const wanted = `ext-${templateIndex + 1}`;
  return scenes.find((s) => s.idSuffix === wanted) ?? scenes[0];
}

/** Render the scene an index names, falling back to the first. */
export function renderScene(
  scenes: ReadonlyArray<MockupScene>,
  { brand, templateIndex, content }: MockupRendererProps,
): ReactNode {
  const c = mockupLabelContent(brand, content);
  const p = mockupPalette(brand, c);
  const scene = sceneAtIndex(scenes, templateIndex);
  if (!scene) return null;
  return scene.render({ brand, c, p });
}

/** The template list a family exposes to `legacy-mapping`. */
export function templateList(
  scenes: ReadonlyArray<MockupScene>,
): ReadonlyArray<{ idSuffix: string; name: string; category: string }> {
  return scenes.map(({ idSuffix, name, category }) => ({ idSuffix, name, category }));
}

/** The curation a family declares, derived from its own scenes. */
export function curationFor(
  prefix: string,
  scenes: ReadonlyArray<MockupScene>,
): { names: Record<string, string>; tags: Record<string, string[]> } {
  const names: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  for (const s of scenes) {
    names[`${prefix}-${s.idSuffix}`] = s.name;
    tags[`${prefix}-${s.idSuffix}`] = s.tags;
  }
  return { names, tags };
}
