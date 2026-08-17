/**
 * Four more surfaces the identity has to survive: a bento wall, editorial
 * cards, an interface kit and a data ramp.
 *
 * Same rule as the rest of the applied section (see `Applied.tsx`): structural
 * UI chrome may be invented — a button that says "Save", a field labelled
 * "Email" — because nobody reads a control label as something the brand said.
 * Anything that reads as the brand SPEAKING comes from the brand.
 *
 * ── The charts are the interesting case ──────────────────────────────────
 *
 * The tool's chart showcase plots "Monthly revenue · Q2 2026" and "84% of
 * brand leaders…". A brand has no revenue we know of, and a guideline page
 * inventing one is the worst thing on the page. But a chart's real job here is
 * to show the colour ramp holding up as a SERIES, and there is data we
 * genuinely have: what this brand is made of. Logo variants, colours,
 * typefaces, values, photographs. Every bar is a number the reader can verify
 * by scrolling up.
 */
import type { ReactNode } from 'react';
import type { ColorScale } from '@/lib/color-engine';
import { pickFgOnBackground, pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { saysName, useArtworkShape } from '../artworkShape';
import { lines } from '../brandCopy';
import { useReveal } from '../motion/useReveal';

type Shades = ColorScale['shades'];
const on = (bg: string, light: string, dark: string) => pickFgOnBackground(bg, [light, dark]);

/** Real steps of the ramp. Anything between them does not exist. */
const SPARK = [200, 300, 400, 500, 600, 700, 800, 900] as const;

interface SurfaceProps {
  model: IdentityModel;
  register: IdentityRegister;
}

/** A captioned block, matching the site and product mockups above. */
function Applied({ label, delay, children }: { label: string; delay?: number; children: ReactNode }) {
  const reveal = useReveal({ delay });
  return (
    <figure className="bi-applied" {...reveal}>
      <figcaption className="bi-applied-cap bi-quiet">{label}</figcaption>
      {children}
    </figure>
  );
}

/* ── Bento ───────────────────────────────────────────────────────────── */

/**
 * The wall.
 *
 * Six tiles at six columns, and every tile is a different SHAPE of content —
 * a picture, a number, a colour stack, a list, a line, a call to action — so
 * the identity is tested against all of them at once rather than against six
 * variations of a card. Tiles whose content the brand does not have collapse
 * out and the grid closes up, which is why the spans are declared per tile
 * rather than as a fixed template.
 */
export function BentoWall({ model, register }: SurfaceProps) {
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;
  /*
   * The mark that reads on THIS tile, not the primary one.
   *
   * The hero tile is a deep brand gradient, and `hero.logo` is the variant
   * drawn for a white page — SKAM's red mark on a red tile, which is the exact
   * collision `pickLogoOnBackground` exists to catch.
   */
  const mark = pickLogoOnBackground(model.brand, p[700].hex)?.url;
  const speaks = saysName(useArtworkShape(mark));

  const photo = model.photography.images[0];
  const quote = model.voice.examples[0] ?? model.voice.examples[1];
  const values = (
    model.personality.values.length ? model.personality.values : model.personality.traits
  ).slice(0, 4);
  // The shortest line the brand owns — a tile two rows tall cannot hold a
  // 150-character positioning statement and a mark without them colliding.
  const line = lines(model)[0];

  const tiles: Array<{ span: string; node: ReactNode }> = [];

  // Hero — the brand's own photograph when it has one, its colour when it does
  // not. Never a stock photograph, which would be a picture of someone else's
  // brand sitting at the top of this one's wall.
  tiles.push({
    span: '3 / span 2',
    node: (
      <div
        className="bi-bento-hero"
        style={{
          background: photo
            ? undefined
            : `linear-gradient(140deg, ${p[500].hex}, ${p[800].hex})`,
          color: n[50].hex,
        }}
      >
        {photo && <img src={photo.url} alt={photo.name} loading="lazy" />}
        <span
          className="bi-bento-scrim"
          aria-hidden
          style={{
            background: photo
              ? `linear-gradient(180deg, ${p[700].hex}55 0%, ${n[950].hex}dd 100%)`
              : 'none',
          }}
        />
        <span className="bi-cover-grid" style={{ color: n[50].hex, opacity: 0.1 }} aria-hidden />
        <div className="bi-bento-hero-copy">
          {mark && (
            <img className="bi-bento-mark" src={mark} alt="" data-speaks={speaks ? '' : undefined} />
          )}
          {line && <p className="bi-bento-line">{line}</p>}
        </div>
      </div>
    ),
  });

  // The count that is easiest to verify: how many marks this brand keeps.
  tiles.push({
    span: '2 / span 1',
    node: (
      <div className="bi-bento-stat" style={{ background: n[50].hex, borderColor: n[200].hex }}>
        <span className="bi-bento-num" style={{ color: p[600].hex }}>
          {model.logo.variants.length}
        </span>
        <span className="bi-bento-cap" style={{ color: n[600].hex }}>
          {model.logo.variants.length === 1 ? 'logo variant' : 'logo variants'}
        </span>
        {/* One rising bar per variant. The stops are named, never computed —
            `300 + i * 150` produced `p[450]`, which is not a step of the ramp
            and read as `undefined.hex`. */}
        <span className="bi-bento-spark" aria-hidden>
          {model.logo.variants.map((_, i) => (
            <span key={i} style={{ background: p[SPARK[i % SPARK.length]].hex }} />
          ))}
        </span>
      </div>
    ),
  });

  tiles.push({
    span: '1 / span 2',
    node: (
      <div className="bi-bento-chips">
        {register.chips.slice(0, 6).map((c) => (
          <span key={c.hex} style={{ background: c.hex }} />
        ))}
      </div>
    ),
  });

  if (values.length > 0) {
    tiles.push({
      span: '2 / span 1',
      node: (
        <div className="bi-bento-features" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          {values.map((v, i) => (
            <span key={v} style={{ color: n[900].hex }}>
              <i style={{ background: [p[600], s[500], p[300], p[800]][i % 4].hex }} />
              {v}
            </span>
          ))}
        </div>
      ),
    });
  }

  if (quote) {
    tiles.push({
      span: '3 / span 1',
      node: (
        <div className="bi-bento-quote" style={{ background: p[100].hex, color: n[950].hex }}>
          <p>{quote.text}</p>
          {quote.context && <span style={{ color: p[800].hex }}>{quote.context}</span>}
        </div>
      ),
    });
  }

  tiles.push({
    span: '2 / span 1',
    node: (
      <div
        className="bi-bento-cta"
        style={{ background: s[600].hex, color: on(s[600].hex, n[50].hex, n[950].hex) }}
      >
        <span className="bi-bento-cta-name">{model.name}</span>
        <span className="bi-bento-cta-go" aria-hidden>
          →
        </span>
      </div>
    ),
  });

  return (
    <Applied label="Bento">
      <div className="bi-bento">
        {tiles.map((t, i) => (
          <BentoCell key={i} span={t.span} delay={i * 60}>
            {t.node}
          </BentoCell>
        ))}
      </div>
    </Applied>
  );
}

function BentoCell({ span, delay, children }: { span: string; delay: number; children: ReactNode }) {
  const reveal = useReveal({ delay });
  return (
    <div
      className="bi-bento-cell"
      {...reveal}
      style={{ ...reveal.style, gridColumn: `span ${span.split(' / ')[0]}`, gridRow: `span ${span.split('span ')[1]}` }}
    >
      {children}
    </div>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────── */

/**
 * Editorial cards — the shape most brand work actually ships as.
 *
 * Three kinds, because three is where a card system stops being a card: one
 * that is mostly picture, one that is mostly colour, one that is mostly type.
 * A brand with no photographs gets a duotone panel drawn from its own ramp
 * instead of an empty frame.
 */
export function CardRow({ model, register }: SurfaceProps) {
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;
  const photos = model.photography.images;
  const traits = model.personality.traits.length
    ? model.personality.traits
    : model.personality.values;
  const line = model.purpose.mission ?? model.tagline ?? model.purpose.positioning;

  return (
    <Applied label="Cards" delay={60}>
      <div className="bi-cards">
        {/* Picture, or the ramp standing in for one. */}
        <article className="bi-card bi-card--photo" style={{ borderColor: n[200].hex }}>
          {photos[0] ? (
            <img src={photos[0].url} alt={photos[0].name} loading="lazy" />
          ) : (
            <span
              className="bi-card-fill"
              style={{ background: `linear-gradient(160deg, ${p[300].hex}, ${p[700].hex})` }}
            />
          )}
          <span
            className="bi-card-scrim"
            aria-hidden
            style={{ background: `linear-gradient(180deg, transparent 40%, ${n[950].hex}e6 100%)` }}
          />
          <div className="bi-card-copy" style={{ color: n[50].hex }}>
            <span className="bi-card-eyebrow">{model.name}</span>
            {traits[0] && <p className="bi-card-title-lg">{traits[0]}</p>}
          </div>
        </article>

        {/* Colour. The lead shade at full bleed, with the ramp beneath it. */}
        <article
          className="bi-card bi-card--colour"
          style={{ background: p[600].hex, color: on(p[600].hex, n[50].hex, n[950].hex) }}
        >
          <span className="bi-cover-grid" style={{ opacity: 0.14 }} aria-hidden />
          <div className="bi-card-copy">
            <span className="bi-card-eyebrow">Primary</span>
            <p className="bi-card-title-lg">{register.chips[0]?.hex ?? p[600].hex}</p>
          </div>
          <span className="bi-card-ramp" aria-hidden>
            {([300, 400, 500, 600, 700, 800] as const).map((k) => (
              <span key={k} style={{ background: p[k].hex }} />
            ))}
          </span>
        </article>

        {/* Type. The brand's own line, set the way an article would set it. */}
        <article
          className="bi-card bi-card--type"
          style={{ background: n[50].hex, borderColor: n[200].hex }}
        >
          <div className="bi-card-copy">
            <span className="bi-card-eyebrow" style={{ color: p[700].hex }}>
              {model.introduction.industry ?? model.name}
            </span>
            {line && (
              <p className="bi-card-body" style={{ color: n[900].hex }}>
                {line}
              </p>
            )}
          </div>
          <span className="bi-card-tags" aria-hidden>
            {traits.slice(0, 3).map((t, i) => (
              <span
                key={t}
                style={{
                  background: [p[100], s[100], n[100]][i % 3].hex,
                  color: [p[800], s[800], n[700]][i % 3].hex,
                }}
              >
                {t}
              </span>
            ))}
          </span>
        </article>
      </div>
    </Applied>
  );
}

/* ── Interface ───────────────────────────────────────────────────────── */

/**
 * The controls.
 *
 * The one block on this page with no brand copy in it at all, and that is
 * correct: a button labelled "Save" is not the brand talking, it is the thing a
 * designer needs to see before they trust a colour. This is where a palette
 * either survives contact with a disabled state and a focus ring or does not.
 */
export function InterfaceKit({ register }: SurfaceProps) {
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;
  const onP = on(p[600].hex, n[50].hex, n[950].hex);
  const onS = on(s[600].hex, n[50].hex, n[950].hex);

  return (
    <Applied label="Interface" delay={120}>
      <div className="bi-kit">
        <div className="bi-kit-panel" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          <h4 style={{ color: n[900].hex }}>Buttons</h4>
          <div className="bi-kit-row">
            <span className="bi-kit-btn" style={{ background: p[600].hex, color: onP }}>
              Primary
            </span>
            <span className="bi-kit-btn" style={{ background: s[600].hex, color: onS }}>
              Secondary
            </span>
            <span
              className="bi-kit-btn bi-kit-btn--out"
              style={{ borderColor: n[300].hex, color: n[900].hex }}
            >
              Outline
            </span>
            <span className="bi-kit-btn" style={{ color: p[700].hex }}>
              Ghost
            </span>
            <span className="bi-kit-btn" style={{ background: n[200].hex, color: n[500].hex }}>
              Disabled
            </span>
          </div>
          <div className="bi-kit-row">
            <span className="bi-kit-pill" style={{ background: p[900].hex, color: n[50].hex }}>
              Deep
            </span>
            <span className="bi-kit-pill" style={{ background: p[100].hex, color: p[900].hex }}>
              Soft
            </span>
            <span
              className="bi-kit-pill"
              style={{ background: n[50].hex, color: p[700].hex, boxShadow: `0 0 0 3px ${p[200].hex}` }}
            >
              Focused
            </span>
          </div>
        </div>

        <div className="bi-kit-panel" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          <h4 style={{ color: n[900].hex }}>Fields</h4>
          <span className="bi-kit-field" style={{ borderColor: n[300].hex, color: n[500].hex }}>
            Email address
          </span>
          <span
            className="bi-kit-field"
            style={{ borderColor: p[600].hex, color: n[900].hex, boxShadow: `0 0 0 3px ${p[200].hex}` }}
          >
            you@studio.com
          </span>
          <div className="bi-kit-row">
            <span className="bi-kit-toggle" style={{ background: p[600].hex }} aria-hidden>
              <i style={{ background: n[50].hex }} />
            </span>
            <span className="bi-kit-toggle bi-kit-toggle--off" style={{ background: n[300].hex }} aria-hidden>
              <i style={{ background: n[50].hex }} />
            </span>
            <span className="bi-kit-check" style={{ background: p[600].hex, color: onP }} aria-hidden>
              ✓
            </span>
            <span
              className="bi-kit-check bi-kit-check--off"
              style={{ borderColor: n[300].hex }}
              aria-hidden
            />
          </div>
        </div>

        <div className="bi-kit-panel" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          <h4 style={{ color: n[900].hex }}>Badges &amp; notices</h4>
          <div className="bi-kit-row">
            <span className="bi-kit-badge" style={{ background: p[100].hex, color: p[900].hex }}>
              New
            </span>
            <span className="bi-kit-badge" style={{ background: s[100].hex, color: s[900].hex }}>
              Beta
            </span>
            <span className="bi-kit-badge" style={{ background: n[200].hex, color: n[800].hex }}>
              Archived
            </span>
            <span className="bi-kit-badge" style={{ background: p[600].hex, color: onP }}>
              Live
            </span>
          </div>
          <span
            className="bi-kit-note"
            style={{ background: p[100].hex, color: p[900].hex, borderColor: p[300].hex }}
          >
            The palette carries information as well as mood.
          </span>
          <span
            className="bi-kit-note"
            style={{ background: n[100].hex, color: n[800].hex, borderColor: n[300].hex }}
          >
            Neutral notices stay quiet beside it.
          </span>
        </div>
      </div>
    </Applied>
  );
}

/* ── Data ────────────────────────────────────────────────────────────── */

/**
 * The ramp as a series — plotted against something true.
 *
 * The bars are what this brand is MADE OF, counted from the model: variants,
 * colours, typefaces, values, photographs. A reader can check every number by
 * scrolling. That is the whole reason this chart is allowed to exist on a
 * document about one brand.
 */
export function DataRamp({ model, register }: SurfaceProps) {
  const p = register.scale.shades;
  const n = register.neutral.shades;

  const bars = [
    { label: 'Logo variants', value: model.logo.variants.length },
    { label: 'Colours', value: model.colour.colours.length },
    { label: 'Typefaces', value: model.typography.fonts.length },
    {
      label: 'Values',
      value: model.personality.values.length + model.personality.traits.length,
    },
    { label: 'Photographs', value: model.photography.images.length },
  ].filter((b) => b.value > 0);

  if (bars.length < 2) return null;
  const max = Math.max(...bars.map((b) => b.value));
  const steps = [600, 500, 400, 700, 300] as const;

  const total = bars.reduce((sum, b) => sum + b.value, 0);
  let sweep = 0;

  return (
    <Applied label="Data" delay={180}>
      <div className="bi-data">
        <div className="bi-data-card" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          <span className="bi-data-cap" style={{ color: n[500].hex }}>
            Everything on this page
          </span>
          <h4 style={{ color: n[900].hex }}>What this brand is made of</h4>
          <div className="bi-bars">
            {bars.map((b, i) => (
              <div key={b.label} className="bi-bar">
                <span className="bi-bar-label" style={{ color: n[700].hex }}>
                  {b.label}
                </span>
                <span className="bi-bar-track" style={{ background: n[100].hex }}>
                  <span
                    style={{ width: `${(b.value / max) * 100}%`, background: p[steps[i % 5]].hex }}
                  />
                </span>
                <span className="bi-bar-value" style={{ color: n[900].hex }}>
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bi-data-card" style={{ background: n[50].hex, borderColor: n[200].hex }}>
          <span className="bi-data-cap" style={{ color: n[500].hex }}>
            The same counts, as a share
          </span>
          <h4 style={{ color: n[900].hex }}>Composition</h4>
          <div className="bi-donut-wrap">
            <svg viewBox="0 0 42 42" className="bi-donut" role="img" aria-label="Composition of this brand">
              {bars.map((b, i) => {
                const frac = b.value / total;
                const dash = frac * 100;
                const el = (
                  <circle
                    key={b.label}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke={p[steps[i % 5]].hex}
                    strokeWidth="7"
                    strokeDasharray={`${dash} ${100 - dash}`}
                    strokeDashoffset={`${25 - sweep}`}
                  />
                );
                sweep += dash;
                return el;
              })}
            </svg>
            <ul className="bi-donut-key">
              {bars.map((b, i) => (
                <li key={b.label} style={{ color: n[700].hex }}>
                  <i style={{ background: p[steps[i % 5]].hex }} />
                  {b.label}
                  <b style={{ color: n[900].hex }}>{Math.round((b.value / total) * 100)}%</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Applied>
  );
}
