/**
 * The Animations family — Logo Reveal · Slide In · Fade · Rotate.
 *
 * ## What this file used to be
 *
 * Thirty "designs" per card, which were ten designs written out three
 * times (`[...stills, ...stills, ...stills]`), and not one of them moved:
 * the file declared no `@keyframes` and its single `transitionDelay` sat
 * on an element with no transition (`.audit/CODE.md` §7). A card called
 * "Logo Reveal" showed a static picture of a logo, three times over.
 *
 * ## What it is now
 *
 * Forty real CSS animations — ten per family — over the brand's own logo
 * and the `motion` content kind's text. The motion is in
 * `animations.css`; this file decides the CAST (which layers, which
 * ground, which stagger) and nothing about colour or type is written
 * down here as a value: grounds come from `brandStyle.surface`, ink from
 * `fgOn`, the logo variant from `logoOn`, the typeface from `fontStack`.
 *
 * ## Three rules this family lives by
 *
 * 1. **The last frame is the finished lockup.** Every keyframe list ends
 *    on the resting artwork, and a looping design returns to identity at
 *    100% so the loop seam and the rest frame are the same picture. That
 *    is what makes a one-frame capture safe: `templateSnapshot` mounts a
 *    renderer offscreen and rasterises whatever it finds, and a wipe
 *    caught at 40% is a logo with a bite out of it. For the one path that
 *    snapshots a LIVE, playing host — the card editor's own Download —
 *    call `pauseAtEnd(host)` first.
 * 2. **Nothing is random.** Every delay is a fraction of the content's
 *    own `durationMs`, and every stagger is derived from a layer index.
 *    Two runs of a design are the same film, which is what a later
 *    GIF/MP4 frame-capture exporter needs to be able to assume.
 * 3. **Duration and loop are content, not constants.** `durationMs`
 *    drives `animation-duration` and `loop` drives
 *    `animation-iteration-count`, both through custom properties, so an
 *    edit in Quick Edit changes the MOTION and not just a caption.
 *
 * ## Ten designs, thirty ids
 *
 * The tripled ids (`-ext-11` … `-ext-30`) are ARCHIVED in
 * `curation/animations.ts` rather than deleted: a template id is a
 * persistence key, and a customer who saved `anim-fade-ext-23` must not
 * find their saved card gone. `variantsForCard` filters archived ids out
 * of every surface. The `-ext-N` → index arithmetic is untouched.
 *
 * ## One pick this family cannot honour
 *
 * `picks.fontId` names an entry in the Setup-shaped `MockBrand.fonts`,
 * which a renderer is never handed — the editor applies that pick over
 * the whole preview through `ScalingStage`'s `--bk-preview-font`. Colour,
 * logo tone and `showLogo` are honoured here.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import {
  Bind,
  defaultMotionContent,
  type DeliverableContent,
  type MotionContent,
} from '@/features/brandkit/content';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  brandColors,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';
import './animations.css';

/* ── The scene a design is handed ─────────────────────────────────── */

/** Which of the brand's grounds a design is staged on. */
type GroundKind = 'paper' | 'ink' | 'brand' | 'subtle';

type Scene = {
  /** The stage's own ground. */
  bg: string;
  /** The colour behind the lockup at the FINAL frame — usually `bg`,
   *  but a design that ends under a panel ends on the panel. */
  end: string;
  /** Readable ink for the final frame. */
  ink: string;
  /** The brand's primary, after `picks.primaryColor`. */
  brand: string;
  /** Readable ink on `brand`. */
  onBrand: string;
  /** The brand's secondary, after `picks.secondaryColor`. */
  second: string;
  border: string;
  heading: string;
  body: string;
  /** The logo variant that reads on `end`, if the brand has one. */
  logo?: string;
  /** A mono filter for the mark when `picks.logoColor` asks for one. */
  logoFilter?: string;
  showLogo: boolean;
  text: string;
};

/**
 * The mono filters `BrandLogo` uses, and the only two a raster mark can
 * be honestly recoloured to. A `logoColor` pick that is neither white nor
 * black is left alone rather than approximated — an approximated brand
 * mark is worse than the brand's own.
 */
function monoFilter(color: string | undefined): string | undefined {
  const hex = normalizeHex(color);
  if (!hex) return undefined;
  if (hex === '#ffffff') return 'brightness(0) invert(1)';
  if (hex === '#000000') return 'grayscale(1) brightness(0)';
  return undefined;
}

function buildScene(
  brand: Brand,
  content: MotionContent & { picks?: TemplateDesignPicks },
  ground: GroundKind,
  endGround?: GroundKind,
): Scene {
  const picks = content.picks;
  const colors = brandColors(brand);
  const primary = normalizeHex(picks?.primaryColor) ?? colors.primary;
  const secondary = normalizeHex(picks?.secondaryColor) ?? colors.secondary;

  const groundOf = (kind: GroundKind): { bg: string; border: string } => {
    if (kind === 'brand') {
      return { bg: primary, border: fgOn(primary) };
    }
    const tokens = surface(brand, kind === 'paper' ? 'card' : kind === 'ink' ? 'inverted' : 'subtle');
    return { bg: tokens.bg, border: tokens.border };
  };

  const base = groundOf(ground);
  const final = endGround ? groundOf(endGround) : base;
  const ink = fgOn(final.bg);

  return {
    bg: base.bg,
    end: final.bg,
    ink,
    brand: primary,
    onBrand: fgOn(primary),
    second: secondary,
    border: final.border,
    heading: fontStack(brand, 'heading'),
    body: fontStack(brand, 'body'),
    logo: picks?.showLogo === false ? undefined : logoOn(brand, final.bg)?.url,
    logoFilter: monoFilter(picks?.logoColor),
    showLogo: picks?.showLogo !== false,
    text: content.text,
  };
}

/* ── Layer + lockup primitives ────────────────────────────────────── */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * One animated layer.
 *
 * The delay is set as `--bka-delay`, never as `animation-delay` — an
 * inline `animation-delay` would beat the stylesheet's rest rule, and the
 * tile would sit permanently at frame 0 instead of the finished frame.
 */
function A({
  name,
  delay = 0,
  ease,
  className,
  style,
  children,
}: {
  name: string;
  /** Fraction of the content's duration. */
  delay?: number;
  ease?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const vars: Vars = { ...(style as Vars), animationName: name };
  if (delay) vars['--bka-delay'] = `calc(var(--bka-dur) * ${delay})`;
  if (ease) vars['--bka-ease'] = ease;
  return (
    <div className={['bka-anim', className].filter(Boolean).join(' ')} style={vars}>
      {children}
    </div>
  );
}

/** The overshoot curve. Named once so nine designs cannot disagree. */
const BACK_OUT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * The mark over the bound word.
 *
 * When the brand has no variant that READS on this ground (`logoOn`
 * answers undefined, which is also every MockBrand-only preview) the word
 * becomes the lockup at display size, rather than a mark nobody can see
 * with a caption under it.
 */
function Lockup({
  scene,
  ink,
  row = false,
  size,
}: {
  scene: Scene;
  /** Overrides the scene's ink where a design paints its own ground. */
  ink?: string;
  row?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const color = ink ?? scene.ink;
  const hasMark = scene.showLogo && Boolean(scene.logo);
  const wordSize = size ?? (row ? 'sm' : hasMark ? 'md' : 'lg');
  return (
    <div className={row ? 'bka-lockup bka-lockup--row' : 'bka-lockup'}>
      {hasMark ? (
        <img className="bka-mark" src={scene.logo} alt="" style={{ filter: scene.logoFilter }} />
      ) : null}
      <Bind
        path="text"
        value={scene.text}
        fit="shrink"
        className={`bka-word${wordSize === 'lg' ? ' bka-word--lg' : wordSize === 'sm' ? ' bka-word--sm' : ''}`}
        style={{ color, fontFamily: scene.heading }}
      />
    </div>
  );
}

/* ── The stage ────────────────────────────────────────────────────── */

/** `1600` → `1600`. The unit is a static label beside the bound number,
 *  so an inline edit commits a plain integer the number field accepts. */
function AnimStage({
  scene,
  content,
  children,
}: {
  scene: Scene;
  content: MotionContent;
  children: ReactNode;
}) {
  const duration = Number.isFinite(content.durationMs) && content.durationMs > 0
    ? Math.round(content.durationMs)
    : 1600;
  const vars: Vars = {
    backgroundColor: scene.bg,
    fontFamily: scene.body,
    '--bka-dur': `${duration}ms`,
    '--bka-iter': looping(content.loop) ? 'infinite' : '1',
  };
  return (
    <div className="bka-stage" style={vars}>
      {children}
      <div className="bka-slate" style={{ backgroundColor: scene.end, color: scene.ink }}>
        <Bind path="durationMs" value={String(duration)} fit="none" />
        <span className="bka-slate-unit">ms</span>
        <span aria-hidden>·</span>
        <Bind path="loop" value={looping(content.loop) ? 'Loop' : 'Once'} fit="none" />
      </div>
    </div>
  );
}

/**
 * Is this animation looping?
 *
 * `loop` is a boolean in the model and a boolean in the panel, but the
 * slate is an inline-editable region and `coerceToPathType` hands a
 * non-numeric field back the raw string — so a user who types "Once" over
 * "Loop" must actually stop the loop rather than set it to a truthy
 * string. Reading it defensively is what makes the inline control honest.
 */
function looping(loop: unknown): boolean {
  if (typeof loop === 'boolean') return loop;
  return /^(loop|yes|true|on|repeat)$/i.test(String(loop ?? '').trim());
}

/* ── Design tables ────────────────────────────────────────────────── */

type Design = {
  name: string;
  tags: string[];
  ground: GroundKind;
  /** The ground the design ENDS on, when a panel covers the stage. */
  endGround?: GroundKind;
  render: (s: Scene) => ReactNode;
};

/** A full-bleed fill in one of the brand's colours. */
function panelStyle(color: string): CSSProperties {
  return { backgroundColor: color };
}

/* ── Logo Reveal ──────────────────────────────────────────────────── */

const REVEAL: Design[] = [
  {
    name: 'Curtain Wipe',
    tags: ['Minimal', 'Corporate', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <A name="bka-wipe-right" className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A name="bka-sweep-across" className="bka-bar" style={panelStyle(s.brand)} />
      </>
    ),
  },
  {
    name: 'Mask Up',
    tags: ['Editorial', 'Bold', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <>
        <A name="bka-mask-up" className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A
          name="bka-build-bar"
          delay={0.55}
          className="bka-rule"
          style={{ ...panelStyle(s.brand), left: '22%', right: '22%', bottom: '24%', transformOrigin: 'left center' }}
        />
      </>
    ),
  },
  {
    name: 'Scale In',
    tags: ['Bold', 'Startup', 'Intro'],
    ground: 'brand',
    render: (s) => (
      <A name="bka-scale-in" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Stroke Draw',
    tags: ['Craft', 'Minimal', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <svg className="bka-svg" viewBox="0 0 100 100" aria-hidden>
          <circle
            className="bka-draw-path bka-anim"
            style={{ animationName: 'bka-draw', strokeDasharray: 1 }}
            pathLength={1}
            cx="50"
            cy="50"
            r="45"
            stroke={s.brand}
          />
        </svg>
        <A name="bka-fade-in" delay={0.6} className="bka-layer">
          <Lockup scene={s} />
        </A>
      </>
    ),
  },
  {
    name: 'Split Reveal',
    tags: ['Bold', 'Retail', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <>
        <A name="bka-fade-in" delay={0.35} className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A
          name="bka-split-left"
          className="bka-panel"
          style={{ ...panelStyle(s.brand), right: '50%' }}
        />
        <A
          name="bka-split-right"
          className="bka-panel"
          style={{ ...panelStyle(s.second), left: '50%' }}
        />
      </>
    ),
  },
  {
    name: 'Iris Open',
    tags: ['Bold', 'Hospitality', 'Intro'],
    ground: 'paper',
    endGround: 'brand',
    render: (s) => (
      <A name="bka-iris" className="bka-panel" style={panelStyle(s.brand)}>
        <div className="bka-layer">
          <Lockup scene={s} ink={s.onBrand} />
        </div>
      </A>
    ),
  },
  {
    name: 'Type Rise',
    tags: ['Editorial', 'Minimal', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <div className="bka-layer">
          <div className="bka-clipper" style={{ maxWidth: '80%' }}>
            <A name="bka-rise">
              <Lockup scene={s} />
            </A>
          </div>
        </div>
        <A
          name="bka-build-bar"
          className="bka-rule"
          style={{ ...panelStyle(s.brand), left: '26%', right: '26%', top: '76%', transformOrigin: 'left center' }}
        />
      </>
    ),
  },
  {
    name: 'Flash Bar',
    tags: ['Bold', 'Sports', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <>
        <A name="bka-through" className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A name="bka-sweep-across" delay={0.15} className="bka-bar" style={{ ...panelStyle(s.brand), width: '18%' }} />
      </>
    ),
  },
  {
    name: 'Stack Build',
    tags: ['Corporate', 'Minimal', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <div className="bka-stack" style={{ top: '18%' }}>
          {[0, 1, 2].map((i) => (
            <A
              key={i}
              name="bka-build-bar"
              delay={i * 0.14}
              className="bka-stack-bar"
              style={panelStyle(i === 1 ? s.second : s.brand)}
            />
          ))}
        </div>
        <A name="bka-fade-up" delay={0.5} className="bka-layer" style={{ top: '16%' }}>
          <Lockup scene={s} />
        </A>
      </>
    ),
  },
  {
    name: 'Focus In',
    tags: ['Luxury', 'Bold', 'Intro'],
    ground: 'brand',
    render: (s) => (
      <A name="bka-focus-in" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
];

/* ── Slide In ─────────────────────────────────────────────────────── */

const SLIDE: Design[] = [
  {
    name: 'From the Left',
    tags: ['Minimal', 'Corporate', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <>
        <A name="bka-in-left" className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A
          name="bka-build-bar"
          delay={0.4}
          className="bka-rule"
          style={{ ...panelStyle(s.brand), left: '18%', width: '28%', top: '78%', transformOrigin: 'left center' }}
        />
      </>
    ),
  },
  {
    name: 'From the Right',
    tags: ['Bold', 'Retail', 'Loop'],
    ground: 'ink',
    render: (s) => (
      <A name="bka-in-right" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'From the Top',
    tags: ['Minimal', 'Editorial', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-in-top" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'From the Bottom',
    tags: ['Bold', 'Startup', 'Loop'],
    ground: 'brand',
    render: (s) => (
      <A name="bka-in-bottom" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Overshoot',
    tags: ['Playful', 'Startup', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-in-left" ease={BACK_OUT} className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Mark then Word',
    tags: ['Craft', 'Minimal', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <div className="bka-layer">
        <div className="bka-lockup bka-lockup--row">
          {s.showLogo && s.logo ? (
            <A name="bka-in-left">
              <img className="bka-mark" src={s.logo} alt="" style={{ filter: s.logoFilter }} />
            </A>
          ) : null}
          <A name="bka-in-right" delay={0.2}>
            <Bind
              path="text"
              value={s.text}
              fit="shrink"
              className="bka-word bka-word--sm"
              style={{ color: s.ink, fontFamily: s.heading }}
            />
          </A>
        </div>
      </div>
    ),
  },
  {
    name: 'Push Across',
    tags: ['Bold', 'Sports', 'Intro'],
    ground: 'paper',
    endGround: 'brand',
    render: (s) => (
      <A name="bka-push-panel" className="bka-panel" style={panelStyle(s.brand)}>
        <A name="bka-in-left" delay={0.25} className="bka-layer">
          <Lockup scene={s} ink={s.onBrand} />
        </A>
      </A>
    ),
  },
  {
    name: 'Diagonal Drift',
    tags: ['Playful', 'Hospitality', 'Loop'],
    ground: 'ink',
    render: (s) => (
      <A name="bka-in-diagonal" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Cascade',
    tags: ['Editorial', 'Corporate', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <div className="bka-stack" style={{ bottom: '16%' }}>
          {[0, 1, 2].map((i) => (
            <A
              key={i}
              name="bka-in-left"
              delay={0.18 * i}
              className="bka-stack-bar"
              style={panelStyle(i === 1 ? s.second : s.brand)}
            />
          ))}
        </div>
        <A name="bka-in-left" className="bka-layer" style={{ bottom: '26%' }}>
          <Lockup scene={s} />
        </A>
      </>
    ),
  },
  {
    name: 'Bar Swipe',
    tags: ['Minimal', 'Retail', 'Loop'],
    ground: 'subtle',
    render: (s) => (
      <>
        <A
          name="bka-in-right"
          className="bka-panel"
          style={{ ...panelStyle(s.brand), left: '76%' }}
        />
        <A name="bka-in-left" delay={0.18} className="bka-layer" style={{ right: '24%' }}>
          <Lockup scene={s} />
        </A>
      </>
    ),
  },
];

/* ── Fade ─────────────────────────────────────────────────────────── */

const FADE: Design[] = [
  {
    name: 'Fade In',
    tags: ['Minimal', 'Corporate', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-fade-in" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Fade Up',
    tags: ['Editorial', 'Startup', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <A name="bka-fade-up" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Cross Dissolve',
    tags: ['Luxury', 'Minimal', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
        <A name="bka-fade-out" className="bka-panel" style={panelStyle(s.brand)} />
      </>
    ),
  },
  {
    name: 'Pulse',
    tags: ['Playful', 'Sports', 'Loop'],
    ground: 'brand',
    render: (s) => (
      <A name="bka-pulse" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Soft Glow',
    tags: ['Luxury', 'Hospitality', 'Loop'],
    ground: 'ink',
    render: (s) => (
      <>
        <A name="bka-halo" className="bka-disc" style={panelStyle(s.brand)} />
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
      </>
    ),
  },
  {
    name: 'Fade Through',
    tags: ['Minimal', 'Editorial', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-through" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Stagger Fade',
    tags: ['Craft', 'Corporate', 'Intro'],
    ground: 'subtle',
    render: (s) => (
      <div className="bka-layer">
        <div className="bka-lockup">
          {s.showLogo && s.logo ? (
            <A name="bka-fade-in">
              <img className="bka-mark" src={s.logo} alt="" style={{ filter: s.logoFilter }} />
            </A>
          ) : null}
          <A name="bka-fade-up" delay={0.28}>
            <Bind
              path="text"
              value={s.text}
              fit="shrink"
              className="bka-word"
              style={{ color: s.ink, fontFamily: s.heading }}
            />
          </A>
          <A
            name="bka-build-bar"
            delay={0.55}
            style={{ ...panelStyle(s.brand), height: 2, width: 46, transformOrigin: 'left center' }}
          />
        </div>
      </div>
    ),
  },
  {
    name: 'Dissolve Grid',
    tags: ['Bold', 'Retail', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
        <div className="bka-grid">
          {Array.from({ length: 16 }, (_, i) => (
            <A
              key={i}
              name="bka-fade-out"
              delay={((i % 4) + Math.floor(i / 4)) * 0.09}
              style={panelStyle(i % 2 === 0 ? s.brand : s.second)}
            />
          ))}
        </div>
      </>
    ),
  },
  {
    name: 'Breathe',
    tags: ['Luxury', 'Wellness', 'Loop'],
    ground: 'ink',
    render: (s) => (
      <A name="bka-breathe" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Veil Lift',
    tags: ['Luxury', 'Editorial', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <>
        <A name="bka-fade-up" delay={0.3} className="bka-layer">
          <Lockup scene={s} />
        </A>
        <A name="bka-fade-out" className="bka-panel" style={panelStyle(s.second)} />
      </>
    ),
  },
];

/* ── Rotate ───────────────────────────────────────────────────────── */

const ROTATE: Design[] = [
  {
    name: 'Spin In',
    tags: ['Playful', 'Startup', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-spin-in" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Flip Horizontal',
    tags: ['Bold', 'Corporate', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <div className="bka-layer bka-3d">
        <A name="bka-flip-x" className="bka-layer">
          <Lockup scene={s} />
        </A>
      </div>
    ),
  },
  {
    name: 'Flip Vertical',
    tags: ['Bold', 'Retail', 'Intro'],
    ground: 'paper',
    render: (s) => (
      <div className="bka-layer bka-3d">
        <A name="bka-flip-y" className="bka-layer">
          <Lockup scene={s} />
        </A>
      </div>
    ),
  },
  {
    name: 'Tilt Settle',
    tags: ['Playful', 'Hospitality', 'Intro'],
    ground: 'brand',
    render: (s) => (
      <A name="bka-tilt" ease={BACK_OUT} className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Orbit',
    tags: ['Craft', 'Startup', 'Loop'],
    ground: 'ink',
    render: (s) => (
      <>
        <A name="bka-turn" className="bka-orbit">
          <div className="bka-orbit-dot" style={panelStyle(s.brand)} />
        </A>
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
      </>
    ),
  },
  {
    name: 'Ring Spin',
    tags: ['Minimal', 'Corporate', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <>
        <A name="bka-turn" className="bka-ring" style={{ borderColor: s.brand }} />
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
      </>
    ),
  },
  {
    name: 'Coin Flip',
    tags: ['Playful', 'Sports', 'Loop'],
    ground: 'subtle',
    render: (s) => (
      <div className="bka-layer bka-3d">
        <A name="bka-coin" className="bka-layer">
          <Lockup scene={s} />
        </A>
      </div>
    ),
  },
  {
    name: 'Swing',
    tags: ['Playful', 'Wellness', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <A name="bka-swing" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Turn & Reveal',
    tags: ['Bold', 'Editorial', 'Intro'],
    ground: 'ink',
    render: (s) => (
      <A name="bka-turn-reveal" className="bka-layer">
        <Lockup scene={s} />
      </A>
    ),
  },
  {
    name: 'Sweep Dial',
    tags: ['Craft', 'Luxury', 'Loop'],
    ground: 'paper',
    render: (s) => (
      <>
        <A name="bka-turn" className="bka-orbit">
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: 2,
              height: '50%',
              marginLeft: -1,
              backgroundColor: s.brand,
            }}
          />
        </A>
        <A name="bka-turn" delay={0.5} className="bka-ring" style={{ borderColor: s.second, borderStyle: 'solid', opacity: 0.5 }} />
        <div className="bka-layer">
          <Lockup scene={s} />
        </div>
      </>
    ),
  },
];

/* ── Renderers ────────────────────────────────────────────────────── */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

/** The content this design paints — the caller's, or the brand's own. */
function motionOf(brand: Brand, content?: DeliverableContent): MotionContent & { picks?: TemplateDesignPicks } {
  if (content && content.kind === 'motion') return content;
  return defaultMotionContent(brand);
}

function renderFamily(designs: Design[], { brand, templateIndex, content }: Props) {
  const motion = motionOf(brand, content);
  const design = designs[templateIndex] ?? designs[0]!;
  const scene = buildScene(brand, motion, design.ground, design.endGround);
  return (
    <AnimStage scene={scene} content={motion}>
      {design.render(scene)}
    </AnimStage>
  );
}

export function LogoRevealRenderer(props: Props) {
  return renderFamily(REVEAL, props);
}
export function SlideInRenderer(props: Props) {
  return renderFamily(SLIDE, props);
}
export function FadeRenderer(props: Props) {
  return renderFamily(FADE, props);
}
export function RotateRenderer(props: Props) {
  return renderFamily(ROTATE, props);
}

/* ── The export seam ──────────────────────────────────────────────── */

/**
 * Freeze every animation under `root` on its FINAL frame.
 *
 * The offscreen export path already gets this for free — a stage outside
 * `.bk-preview-host` is at rest, which is the finished lockup. The one
 * path that does not is the card editor's own Download, which rasterises
 * the LIVE preview host where the animation is deliberately playing; a
 * capture taken there without this lands mid-wipe. Call it on the host
 * immediately before `snapshotElementPng`.
 *
 * Idempotent, and safe on a root that contains no animation at all.
 */
export function pauseAtEnd(root: HTMLElement | null | undefined): void {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const stages: Element[] = [];
  if (root.classList?.contains('bka-stage')) stages.push(root);
  stages.push(...Array.from(root.querySelectorAll('.bka-stage')));
  for (const stage of stages) stage.setAttribute('data-anim-frame', 'end');
}

/* ── Template metadata ────────────────────────────────────────────── */

/**
 * Thirty ids, ten designs.
 *
 * The list stays thirty long because a template id is a persistence key:
 * `variantsForCard` filters `-ext-11` … `-ext-30` out through
 * `curation/animations.ts`, so they show nowhere while a customer who
 * saved one can still open it. Shortening this array instead would make
 * those saves unresolvable.
 */
function meta(designs: Design[], prefix: string) {
  return Array.from({ length: 30 }, (_, i) => ({
    idSuffix: `ext-${i + 1}`,
    name: designs[i]?.name ?? `${prefix} ${i + 1}`,
    category: 'Modern',
  }));
}

export const LOGO_REVEAL_EXTENDED = meta(REVEAL, 'Reveal');
export const SLIDE_IN_EXTENDED = meta(SLIDE, 'Slide');
export const FADE_EXTENDED = meta(FADE, 'Fade');
export const ROTATE_EXTENDED = meta(ROTATE, 'Rotate');

/**
 * The kept designs, as curation sees them.
 *
 * `curation/animations.ts` builds its names, tags and archived list from
 * THIS, rather than repeating forty names in a second file — a name that
 * exists twice is a name that will disagree with itself.
 */
export type AnimationDesignRef = { name: string; tags: string[] };

export const ANIMATION_FAMILIES: ReadonlyArray<{
  type: string;
  designs: AnimationDesignRef[];
}> = [
  { type: 'anim-reveal', designs: REVEAL.map(({ name, tags }) => ({ name, tags })) },
  { type: 'anim-slide', designs: SLIDE.map(({ name, tags }) => ({ name, tags })) },
  { type: 'anim-fade', designs: FADE.map(({ name, tags }) => ({ name, tags })) },
  { type: 'anim-rotate', designs: ROTATE.map(({ name, tags }) => ({ name, tags })) },
];

/** How many ids each family reserves — kept plus archived. */
export const ANIMATION_ID_COUNT = 30;
