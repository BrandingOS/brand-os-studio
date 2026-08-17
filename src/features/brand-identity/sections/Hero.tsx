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
import { useState } from 'react';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
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
  /*
   * Does the artwork already say the name?
   *
   * Answered from the artwork's own proportions once it has loaded, because
   * nothing stored says it: a "primary" logo is a symbol for one brand and a
   * logotype for the next. A run much wider than it is tall is letters — the
   * same reasoning the onboarding classifier uses, at a fraction of the cost,
   * because here it only has to decide whether to print a heading.
   */
  const [speaksName, setSpeaksName] = useState(false);
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
          The mark again, enormous, bleeding off the right edge.

          The name sits bottom-left and a brand without a tagline leaves two
          thirds of the screen empty — and the only thing allowed to fill it is
          something the brand already owns. So it is the same artwork at scale,
          held back to a whisper and drifting as the hero unpins. Decoration,
          hence `aria-hidden`; the readable mark is the one beside the name.
        */}
        {heroMark && <img className="bi-hero-ghost" src={heroMark} alt="" aria-hidden />}

        <div className="bi-container bi-hero-inner">
          <div className="bi-hero-body">
            {heroMark && (
              <div className="bi-hero-mark" {...mark}>
                <img
                  src={heroMark}
                  alt={`${model.name} logo`}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setSpeaksName(img.naturalWidth / img.naturalHeight > 2.6);
                    }
                  }}
                />
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
 * How wide each tile sits, in a six-column grid.
 *
 * The tile COUNT belongs to the brand, and every layout that does not divide
 * leaves a hole — or, with flex, one orphan tile stretched across the whole
 * page, which is worse because it looks deliberate. So the spans are chosen per
 * count, and every row sums to six at every count the grid can have.
 */
function spans(count: number): number[] {
  switch (count) {
    case 2:
      return [3, 3];
    case 3:
      return [2, 2, 2];
    case 4:
      return [3, 3, 3, 3];
    case 5:
      return [4, 2, 2, 2, 2];
    default:
      return [2, 2, 2, 2, 2, 2];
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

  const tiles: React.ReactNode[] = [];
  if (mark) {
    tiles.push(
      <>
        <img src={mark} alt="" />
        <span className="bi-tile-label">The mark</span>
      </>,
    );
  }
  if (register.chips.length > 0) {
    tiles.push(
      <>
        <span className="bi-tile-swatches">
          {register.chips.slice(0, 6).map((c) => (
            <span key={c.hex} style={{ background: c.hex }} />
          ))}
        </span>
        <span className="bi-tile-label">
          {register.chips.length} {register.chips.length === 1 ? 'colour' : 'colours'}
        </span>
      </>,
    );
  }
  if (font) {
    tiles.push(
      <>
        <span className="bi-tile-aa">Aa</span>
        <span className="bi-tile-label">{font.token.family}</span>
      </>,
    );
  }
  if (model.personality.traits.length > 0) {
    tiles.push(
      <>
        <span className="bi-tile-words">{model.personality.traits.slice(0, 3).join(' · ')}</span>
        <span className="bi-tile-label">Personality</span>
      </>,
    );
  }
  if (model.logo.variants.length > 1) {
    tiles.push(
      <>
        <span className="bi-tile-number">{model.logo.variants.length}</span>
        <span className="bi-tile-label">Logo variants</span>
      </>,
    );
  }
  if (model.voice.tone) {
    tiles.push(
      <>
        <span className="bi-tile-words bi-tile-words--accent">{model.voice.tone}</span>
        <span className="bi-tile-label">Voice</span>
      </>,
    );
  }

  /*
   * Nothing to glance at is not an empty grid — it is no grid.
   *
   * A brand with a name and nothing else would otherwise get a band of empty
   * boxes, which reads as a page that failed to load rather than as a brand
   * that has not decided yet.
   */
  if (tiles.length < 2) return null;

  const targets = ['logo', 'colour', 'typography', 'personality', 'logo', 'voice'];
  const kinds = ['mark', 'colour', 'type', 'words', 'count', 'voice'];
  // The target and kind lists are parallel to the PUSH ORDER above, so they are
  // filtered by the same conditions in the same sequence.
  const present = [
    Boolean(mark),
    register.chips.length > 0,
    Boolean(font),
    model.personality.traits.length > 0,
    model.logo.variants.length > 1,
    Boolean(model.voice.tone),
  ];
  const chosen = present.map((yes, i) => (yes ? i : -1)).filter((i) => i >= 0);
  const width = spans(tiles.length);

  return (
    <div className="bi-glance">
      <div className="bi-glance-grid" {...head}>
        {tiles.map((content, i) => (
          <button
            key={kinds[chosen[i]]}
            type="button"
            className={`bi-tile bi-tile--${kinds[chosen[i]]}`}
            style={{ gridColumn: `span ${width[i]}` }}
            onClick={() => jump(targets[chosen[i]])}
          >
            {content}
          </button>
        ))}
      </div>
    </div>
  );
}
