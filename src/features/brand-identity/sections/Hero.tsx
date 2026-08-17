/**
 * The opening.
 *
 * ── What the hero has to do ───────────────────────────────────────────────
 *
 * Someone opening this link has one question — whose brand is this — and the
 * first screen has to answer it before they read a word. So the hero is not a
 * title card: it is the brand's colour on the ground, the brand's mark at size,
 * the brand's name in the brand's own typeface, and the brand's actual palette
 * laid across the foot of the screen as a strip. Every one of those is data
 * this brand owns. Nothing on this screen is ours.
 *
 * ── The pin ──────────────────────────────────────────────────────────────
 *
 * The hero stands in a stage taller than the viewport and sticks to the top of
 * it, so scrolling drives it away rather than simply moving past it: the mark
 * and the name lift and fade while the colour field opens out. It is the one
 * genuinely cinematic moment on the page, and it is bought with `position:
 * sticky` and one CSS variable — no scroll hijacking, no library, and the
 * scrollbar keeps telling the truth about how long the document is.
 *
 * ── Which mark ───────────────────────────────────────────────────────────
 *
 * The ground here is dark, so the variant shown is chosen by
 * `pickLogoOnBackground` rather than assumed. A brand whose only mark is dark
 * artwork gets no mark here and its name carries the screen — which is correct,
 * and far better than a black logo invisible on a black ground.
 */
import type { ReactNode } from 'react';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { saysName, useArtworkShape } from '../artworkShape';
import { CountUp } from '../motion/CountUp';
import { useReveal } from '../motion/useReveal';
import { useScrollVar } from '../motion/useScrollVar';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';

export function IdentityHero({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  const stage = useScrollVar('pin');
  const mark = useReveal();
  const name = useReveal({ delay: 90 });
  const sub = useReveal({ delay: 180 });
  const meta = useReveal({ delay: 260 });
  const cue = useReveal({ delay: 900 });

  const deep = (register.tokens as Record<string, string>)['--bi-deep'] ?? '#0B0B0C';
  // The mark that reads on THIS ground — not `hero.logo`, which was chosen for
  // a white page. Falls back to nothing rather than to something invisible.
  const onDeep = pickLogoOnBackground(model.brand, deep);
  const heroMark = onDeep?.url ?? undefined;
  // Shared with the mockups, the site nav and the product header — the answer
  // has to be the same everywhere or the page contradicts itself.
  const speaksName = saysName(useArtworkShape(heroMark));

  /*
   * The ghost is a DIFFERENT mark, and by preference the icon.
   *
   * Printing the same artwork twice — once at reading size, once enormous
   * behind it — is not a composition, it is the same picture at two scales. The
   * brand icon is what belongs back there: it is the part of the identity built
   * to work as a shape rather than as a word, which is exactly what a
   * background wants. Falling back in order: the icon, then any other variant
   * that is not the mark already on screen, and only then the mark again —
   * because a hero with one repeated logo still beats a hero with a hole in it.
   */
  const ghost =
    model.logo.variants.find((v) => v.def.role === 'iconmark')?.url ??
    model.logo.variants.find((v) => v.url !== heroMark)?.url ??
    heroMark;
  // A symbol and a logotype want different room back there.
  const ghostShape = useArtworkShape(ghost);

  const descriptors = model.introduction.descriptors;
  const industry = model.introduction.industry;

  return (
    <div className="bi-hero-stage" {...stage}>
      <section
        className="bi-section bi-hero"
        id="hero"
        data-ground="deep"
        data-mark={speaksName ? 'name' : 'symbol'}
      >
        {/*
          The colour field: the brand's OWN colours as slow blooms.
          A gradient we invented would be decoration; these are the palette.
        */}
        <div className="bi-hero-field" aria-hidden>
          {register.blooms.map((hex, i) => (
            <span key={`${hex}-${i}`} className="bi-hero-bloom" data-i={i} style={{ background: hex }} />
          ))}
        </div>

        {/*
          A mark, enormous, bleeding off the right edge.

          The name sits bottom-left and a brand without a tagline leaves two
          thirds of the screen empty — and the only thing allowed to fill it is
          something the brand already owns. Held back to a whisper and drifting
          as the hero unpins. Decoration, hence `aria-hidden`; the readable mark
          is the one beside the name.
        */}
        {ghost && (
          <img className="bi-hero-ghost" data-shape={ghostShape} src={ghost} alt="" aria-hidden />
        )}

        <div className="bi-container bi-hero-inner">
          <div className="bi-hero-body">
            {heroMark && (
              <div className="bi-hero-mark" {...mark}>
                <img src={heroMark} alt={`${model.name} logo`} />
              </div>
            )}
            {/*
              When the mark IS the name, the name is not printed under it.

              A brand whose primary artwork is a wordmark otherwise opens on its
              own name twice, one above the other, which reads as a bug. The
              heading still exists for screen readers and for the document
              outline — it is only the second visible copy that goes.
            */}
            <h1 className={speaksName ? 'bi-hero-name bi-sr' : 'bi-hero-name'} {...name}>
              {model.name}
            </h1>
            {(model.tagline || industry) && (
              <p className="bi-hero-sub" {...sub}>
                {model.tagline ?? industry}
              </p>
            )}
            {(industry || descriptors.length > 0) && (
              <div className="bi-hero-meta" {...meta}>
                {industry && <span>{industry}</span>}
                {descriptors.slice(0, 4).map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/*
          The palette across the foot of the screen, weighted.

          A brand's proportions are part of its identity, and an equal-width
          strip claims all five colours matter equally — which is never true.
          The lead gets the most room, the other brand colours next, and the
          neutrals a sliver: a brand whose palette is one red and four greys
          should read as a red brand, because it is one.
        */}
        {register.chips.length > 0 && (
          <div className="bi-hero-strip" aria-hidden>
            {register.chips.map((chip) => (
              <span
                key={chip.hex}
                style={{
                  background: chip.hex,
                  flexGrow: chip.lead ? 5 : register.blooms.includes(chip.hex) ? 3 : 1,
                }}
              />
            ))}
          </div>
        )}

        <span className="bi-hero-cue" {...cue}>
          Scroll
        </span>
      </section>
    </div>
  );
}

/**
 * The brand at a glance — everything in one screen, before the document begins.
 *
 * A reader who came for one value should not have to scroll eleven sections to
 * find it, and a reader who came to look should get the whole character in one
 * frame. Every tile is a section's headline, and a tile only exists when its
 * section does, so this grid can never advertise something the page does not
 * contain.
 */
/**
 * Where each tile sits, in a six-column grid.
 *
 * The tile COUNT belongs to the brand, and every layout that does not divide
 * leaves a hole — or, with flex, one orphan stretched across the whole page,
 * which is worse because it looks deliberate. So the shape is chosen per count
 * and every row sums to six at every count the grid can have.
 *
 * The first tile is the mark, and from four tiles up it takes two rows: a brand
 * shown at postage-stamp size next to five siblings is not an opening, and this
 * band is the first thing after the hero.
 */
function layout(count: number): Array<{ col: number; row: number }> {
  const wide = (col: number) => ({ col, row: 1 });
  switch (count) {
    case 2:
      return [wide(3), wide(3)];
    case 3:
      return [wide(2), wide(2), wide(2)];
    case 4:
      // mark 2×2 | t2 2 | t3 2 / (mark) | t4 4
      return [{ col: 2, row: 2 }, wide(2), wide(2), wide(4)];
    case 5:
      // mark 2×2 | t2 2 | t3 2 / (mark) | t4 2 | t5 2
      return [{ col: 2, row: 2 }, wide(2), wide(2), wide(2), wide(2)];
    default:
      // …and the sixth takes the full width beneath.
      return [{ col: 2, row: 2 }, wide(2), wide(2), wide(2), wide(2), wide(6)];
  }
}

export function Glance({ model, register }: { model: IdentityModel; register: IdentityRegister }) {
  const head = useReveal();
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const font = model.typography.fonts[0];
  // The tile is a white card, so the mark that belongs on it is the one that
  // reads on white — not whichever variant happens to be primary. A brand whose
  // primary artwork is white would otherwise get an empty tile.
  const mark = pickLogoOnBackground(model.brand, '#FFFFFF')?.url;

  const traits = model.personality.traits.length
    ? model.personality.traits
    : model.personality.values;
  const deep = (register.tokens as Record<string, string>)['--bi-deep'] ?? '#0B0B0C';
  const p = register.scale.shades;

  /*
   * One descriptor per tile, and each carries its own GROUND.
   *
   * The band used to be six white cards with a hairline round each, and it read
   * as a form rather than as a brand: the one screen that should say "this is
   * what this brand looks like" said "here are some fields". Every tile now
   * stands on a different surface from the brand's own ramp, and each shows its
   * content in the shape that content actually has — a mark centred, colours
   * full-bleed, a typeface at display size.
   */
  const tiles: Array<{
    kind: string;
    target: string;
    ground: 'deep' | 'brand' | 'tint' | 'surface';
    label: string;
    body: ReactNode;
  }> = [];

  if (mark) {
    tiles.push({
      kind: 'mark',
      target: 'logo',
      ground: 'deep',
      label: 'The mark',
      // Chosen for the ground it lands on, like every other placement here.
      body: (
        <>
          <span
            className="bi-tile-glow"
            aria-hidden
            style={{
              background: `radial-gradient(circle at 50% 45%, ${p[500].hex}, ${p[800].hex} 55%, transparent 72%)`,
            }}
          />
          <img
            className="bi-tile-mark"
            src={pickLogoOnBackground(model.brand, deep)?.url ?? mark}
            alt=""
          />
        </>
      ),
    });
  }

  if (register.chips.length > 0) {
    tiles.push({
      kind: 'colour',
      target: 'colour',
      ground: 'surface',
      label: `${register.chips.length} ${register.chips.length === 1 ? 'colour' : 'colours'}`,
      // Edge to edge. A colour in a box with a margin round it is a sample of a
      // colour; a colour filling its tile is the colour.
      body: (
        <span className="bi-tile-bars" aria-hidden>
          {register.chips.slice(0, 6).map((c) => (
            <span key={c.hex} style={{ background: c.hex }} />
          ))}
        </span>
      ),
    });
  }

  if (font) {
    tiles.push({
      kind: 'type',
      target: 'typography',
      ground: 'tint',
      label: font.token.family,
      body: (
        <span
          className="bi-tile-aa"
          style={{ fontFamily: `'${font.token.family}', var(--bi-font-display, sans-serif)` }}
        >
          Aa
        </span>
      ),
    });
  }

  if (traits.length > 0) {
    tiles.push({
      kind: 'words',
      target: 'personality',
      ground: 'surface',
      label: 'Personality',
      body: (
        <span className="bi-tile-stack">
          {traits.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </span>
      ),
    });
  }

  if (model.logo.variants.length > 1) {
    tiles.push({
      kind: 'count',
      target: 'logo',
      ground: 'brand',
      label: 'Logo variants',
      body: <CountUp className="bi-tile-number" value={model.logo.variants.length} />,
    });
  }

  if (model.voice.tone) {
    tiles.push({
      kind: 'voice',
      target: 'voice',
      ground: 'tint',
      label: 'Voice',
      body: <span className="bi-tile-tone">{model.voice.tone}</span>,
    });
  }

  /*
   * Nothing to glance at is not an empty grid — it is no grid.
   *
   * A brand with a name and nothing else would otherwise get a band of empty
   * boxes, which reads as a page that failed to load rather than as a brand
   * that has not decided yet.
   */
  if (tiles.length < 2) return null;
  const shape = layout(tiles.length);

  return (
    <div className="bi-glance">
      <div className="bi-glance-grid" {...head}>
        {tiles.map((tile, i) => (
          <button
            key={tile.kind}
            type="button"
            className={`bi-tile bi-tile--${tile.kind}`}
            data-ground={tile.ground}
            // A tile the full width of the grid is a different shape of tile:
            // label and content sit side by side rather than stacked, or the
            // content floats in a metre of empty space.
            data-wide={shape[i].col >= 5 ? '' : undefined}
            style={{
              gridColumn: `span ${shape[i].col}`,
              gridRow: `span ${shape[i].row}`,
              '--bi-tile-delay': `${i * 70}ms`,
            } as React.CSSProperties}
            onClick={() => jump(tile.target)}
          >
            <span className="bi-tile-body">{tile.body}</span>
            <span className="bi-tile-label">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
