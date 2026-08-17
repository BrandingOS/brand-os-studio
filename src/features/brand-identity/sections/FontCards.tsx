/**
 * The typefaces, before anything is set in them.
 *
 * ── Why this comes first ────────────────────────────────────────────────
 *
 * The section used to open on the faces already at work — a headline, running
 * copy, a pull quote. That is the right SECOND thing to show and the wrong
 * first: you cannot judge how a face performs in a layout until you have seen
 * the face. So the order is now the face, then the face applied, then the
 * specification.
 *
 * ── What a specimen card has to contain ─────────────────────────────────
 *
 * Its own name, set in itself, at a size where the letterforms are actually
 * legible as drawings — that is the whole point, and a card that shows only a
 * name in a corner is an empty card. Then the three runs every type specimen
 * has carried for a century: capitals, lowercase, figures and punctuation. Then
 * one sentence, so the face is seen setting words rather than an alphabet.
 *
 * ── Nothing leaves the card ─────────────────────────────────────────────
 *
 * Every size is a `clamp()` against the viewport, the card clips its own
 * overflow, and the name wraps at any character. A brand may name a face
 * "IBM Plex Sans Arabic" or "Bricolage Grotesque"; neither may push a letter
 * past the edge.
 *
 * ── Why a pangram and not the brand's words ─────────────────────────────
 *
 * A pangram is unmistakably a font sample — nobody reads "Sphinx of black
 * quartz, judge my vow." as something the brand said. The brand's own line
 * appears on the card BELOW this one, where it is the brand talking. Keeping
 * them apart is the same rule the rest of the page runs on.
 */
import type { IdentityFont, IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import { Letters } from '../motion/Letters';
import { useReveal } from '../motion/useReveal';
import { useScrollVar } from '../motion/useScrollVar';

/** Correct, complete, and obviously a specimen rather than a claim. */
const PANGRAM = 'Sphinx of black quartz, judge my vow.';
const CAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const FIGURES = '0123456789 & ? ! @ # % ( ) — “ ”';

/** The grounds the cards run through, so two faces never look like one. */
const GROUNDS = ['brand', 'deep', 'tint'] as const;

export function FontCards({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  if (model.typography.fonts.length === 0) return null;
  return (
    <div className="bi-fonts">
      {model.typography.fonts.map((font, i) => (
        <FontCard
          key={font.token.family}
          font={font}
          register={register}
          ground={GROUNDS[i % GROUNDS.length]}
          index={i}
        />
      ))}
    </div>
  );
}

function FontCard({
  font,
  register,
  ground,
  index,
}: {
  font: IdentityFont;
  register: IdentityRegister;
  ground: (typeof GROUNDS)[number];
  index: number;
}) {
  const reveal = useReveal({ delay: index * 80 });
  // The runs drift a little against the scroll — the card breathes without
  // anything moving far enough to leave it.
  const drift = useScrollVar('travel');

  const tokens = register.tokens as unknown as Record<string, string>;
  const bg =
    ground === 'brand' ? tokens['--bi-brand'] : ground === 'deep' ? tokens['--bi-deep'] : tokens['--bi-panel'];
  const ink = pickFgOnBackground(bg ?? '#FFFFFF', ['#FFFFFF', '#0B0B0C']);

  const family = `'${font.token.family}', var(--bi-font-display, system-ui), sans-serif`;
  const weights = font.token.weights ?? [];

  return (
    <article
      className="bi-font"
      data-ground={ground}
      {...reveal}
      // The face as a custom property, so every run inside the card is set in
      // it without threading the family through five inline styles.
      style={{ ...reveal.style, background: bg, color: ink, '--bi-face': family } as React.CSSProperties}
    >
      <header className="bi-font-meta">
        <span>{font.role}</span>
        {weights.length > 0 && <span>{weights.join(' · ')}</span>}
        <span>{font.files.length > 0 ? `${font.files.length} files` : 'System / web'}</span>
      </header>

      {/*
        The name, set in itself, one character at a time.

        `mode="char"` is safe here and only here: a family name is a handful of
        letters, and the ripple across them is the moment the card exists for.
      */}
      <Letters
        as="h3"
        text={font.token.family}
        mode="char"
        stagger={34}
        className="bi-font-name"
      />

      <div className="bi-font-runs" {...drift}>
        <p className="bi-font-run" style={{ fontWeight: 600 }}>
          {CAPS}
        </p>
        <p className="bi-font-run">{LOWER}</p>
        <p className="bi-font-run bi-font-run--small">{FIGURES}</p>
      </div>

      <p className="bi-font-pangram">{PANGRAM}</p>
    </article>
  );
}
