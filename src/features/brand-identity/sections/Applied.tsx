/**
 * The identity, applied — social, web, product.
 *
 * ── What changed, and why ────────────────────────────────────────────────
 *
 * This section used to render the Brand Kit's own social templates through
 * `ScalingStage`. They were the real exports, which was the honest choice, and
 * they looked like template thumbnails on a page meant to look like a finished
 * brand site. The layouts here follow the UI colour system tool's showcases
 * instead — Instagram frames, a landing page, a product screen — because those
 * are the compositions this codebase already knows how to make look good.
 *
 * ── The line this section will not cross ─────────────────────────────────
 *
 * The tool's showcases are full of editorial filler: "Join the movement",
 * "Design is the silent ambassador of your brand — P. Rand", "84% of brand
 * leaders…". In the tool that is fine — nobody mistakes a colour-picker preview
 * for a claim. On a page an owner sends to a client it is not, because nothing
 * tells the reader the brand did not say it.
 *
 * So the rule is: STRUCTURAL UI CHROME may be invented — a nav that says
 * "Pricing", a button that says "Get started", an action bar of social icons.
 * Anything that reads as the BRAND SPEAKING must come from the brand: its
 * tagline, its own recorded voice examples, its values, its photographs. A
 * cover with nothing real to say is not rendered.
 *
 * That is also why every cover here is a function of the model rather than a
 * fixed list: a brand with three voice examples gets a different set of posts
 * from a brand with none, and neither gets a blank.
 */
import type { ReactNode } from 'react';
import type { ColorScale } from '@/lib/color-engine';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { saysName, useArtworkShape } from '../artworkShape';
import { Section, SplitHeader } from '../components/primitives';
import { useReveal } from '../motion/useReveal';

type Shades = ColorScale['shades'];

/** Readable ink for a ground, through the one helper that decides that. */
const on = (bg: string, light: string, dark: string) => pickFgOnBackground(bg, [light, dark]);

/**
 * Every line the brand has written that could carry a headline, shortest first.
 *
 * A headline is a line you take in at a glance, and of the things a brand
 * records only a tagline is written to be one. Where there is no tagline the
 * candidates are a positioning statement, a mission and a summary — all written
 * to be READ — so the shortest is the closest thing to a headline the brand
 * owns. Taking them in field order instead gave SKAM a 150-character
 * positioning statement as a hero, set as a twelve-line wall of 60px type.
 *
 * Returned as a LIST, because two surfaces sitting on the same screen must not
 * print the same sentence: the site hero and its own supporting paragraph did
 * exactly that, and it reads as a page that lost track of itself.
 *
 * Nothing is ever truncated. A long line is set smaller; it is not cut, because
 * half a sentence attributed to a brand is a sentence the brand did not write.
 */
function lines(model: IdentityModel): string[] {
  const seen = new Set<string>();
  return [
    model.tagline,
    model.purpose.positioning,
    model.purpose.mission,
    model.introduction.summary,
  ]
    .filter((v): v is string => Boolean(v))
    .filter((v) => (seen.has(v) ? false : (seen.add(v), true)))
    .sort((a, b) => a.length - b.length);
}

export function SocialApplications({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;

  const mark = model.hero.logo?.url;
  const handle = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '');

  // The shortest line goes on the post; the site takes the next one, so the two
  // mockups on one screen are not the same sentence twice.
  const headline = lines(model)[0];
  const quote = model.voice.examples[0];
  const word = model.personality.traits[0] ?? model.personality.values[0];
  const photo = model.photography.images[0];

  /*
   * Strongest first, then cut to four.
   *
   * The covers a brand can fill depend on what it has written, so the count is
   * anything from two to six — and five in a four-column grid is four posts and
   * an orphan, which reads as a row that failed rather than a campaign. A tight
   * row of four is the better document, so the order below is a priority: the
   * brand's own words beat a palette we can always draw.
   */
  const posts: ReactNode[] = [];
  if (headline) posts.push(<HeadlineCover text={headline} p={p} n={n} />);
  if (mark) posts.push(<MarkCover mark={mark} name={model.name} p={p} n={n} />);
  if (quote) posts.push(<QuoteCover quote={quote} p={s} n={n} />);
  if (photo) posts.push(<PhotoCover url={photo.url} name={photo.name} n={n} />);
  if (word) posts.push(<OrbCover word={word} name={model.name} p={s} n={n} />);
  posts.push(<PaletteCover chips={register.chips} p={p} n={n} />);
  const shown = posts.slice(0, 4);

  return (
    <Section id="social">
      <SplitHeader
        eyebrow="The identity, applied"
        title="In the world"
        body="The same marks and colours in the places people actually meet this brand. Every word in these is the brand's own — the layouts around them are empty until it fills them."
      />

      <div className="bi-ig-grid" data-count={shown.length}>
        {shown.map((cover, i) => (
          <IgFrame key={i} handle={handle} mark={mark} n={n} delay={i * 70}>
            {cover}
          </IgFrame>
        ))}
      </div>

      <SiteMock model={model} register={register} />
      <PhoneMock model={model} register={register} />
    </Section>
  );
}

/* ── The Instagram frame ─────────────────────────────────────────────── */

function IgFrame({
  handle,
  mark,
  n,
  delay,
  children,
}: {
  handle: string;
  mark?: string;
  n: Shades;
  delay: number;
  children: ReactNode;
}) {
  const reveal = useReveal({ delay });
  return (
    <article
      className="bi-ig"
      {...reveal}
      style={{ ...reveal.style, background: n[50].hex, borderColor: n[200].hex }}
    >
      <header className="bi-ig-head" style={{ borderColor: n[200].hex }}>
        <span
          className="bi-ig-avatar"
          style={{ background: n[100].hex, borderColor: n[200].hex }}
        >
          {mark && <img src={mark} alt="" />}
        </span>
        <span className="bi-ig-handle" style={{ color: n[900].hex }}>
          {handle}
        </span>
        <span className="bi-ig-dots" style={{ color: n[500].hex }} aria-hidden>
          •••
        </span>
      </header>
      <div className="bi-ig-cover">{children}</div>
      {/* Chrome, not content — the same three glyphs every post carries. */}
      <footer className="bi-ig-foot" style={{ color: n[800].hex }} aria-hidden>
        <Glyph d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
        <Glyph d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l2-4a8.4 8.4 0 0 1-1-4 8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 7.4z" />
        <Glyph d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <span className="bi-ig-spacer" />
        <Glyph d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </footer>
    </article>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ── Covers. Each one is a real thing the brand owns. ─────────────────── */

/**
 * How large a line is set is a function of how long it is.
 *
 * A tagline of four words and a positioning statement of forty cannot share a
 * size: the first reads timid, the second overflows the square. This is the
 * same rule the purpose cards use.
 */
function coverSize(text: string): number {
  if (text.length > 150) return 15;
  if (text.length > 90) return 19;
  if (text.length > 45) return 24;
  return 31;
}

function HeadlineCover({ text, p, n }: { text: string; p: Shades; n: Shades }) {
  const ink = on(p[600].hex, n[50].hex, n[950].hex);
  return (
    <div className="bi-cover bi-cover--headline" style={{ background: p[600].hex, color: ink }}>
      <span
        aria-hidden
        className="bi-cover-orb"
        style={{
          background: `radial-gradient(circle, ${p[400].hex}, ${p[700].hex} 60%, transparent 80%)`,
        }}
      />
      <p className="bi-cover-line" style={{ fontSize: coverSize(text) }}>
        {text}
      </p>
    </div>
  );
}

function MarkCover({
  mark,
  name,
  p,
  n,
}: {
  mark: string;
  name: string;
  p: Shades;
  n: Shades;
}) {
  // A logotype already carries the name; setting the name beside it printed
  // "Vector Vector" on the card.
  const speaks = saysName(useArtworkShape(mark));
  return (
    <div
      className="bi-cover bi-cover--mark"
      style={{ background: `linear-gradient(135deg, ${p[400].hex}, ${p[700].hex})` }}
    >
      <span className="bi-cover-grid" style={{ color: n[50].hex }} aria-hidden />
      <span
        className="bi-cover-lockup"
        data-speaks={speaks ? '' : undefined}
        style={{ background: n[50].hex, color: n[950].hex }}
      >
        <img src={mark} alt={speaks ? name : ''} />
        {!speaks && <span>{name}</span>}
      </span>
    </div>
  );
}

function OrbCover({ word, name, p, n }: { word: string; name: string; p: Shades; n: Shades }) {
  return (
    <div
      className="bi-cover bi-cover--orb"
      style={{ background: n[950].hex, color: n[50].hex }}
    >
      <span
        aria-hidden
        className="bi-cover-orb bi-cover-orb--tight"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${p[300].hex}, ${p[500].hex} 40%, ${p[800].hex} 70%, ${n[950].hex} 95%)`,
        }}
      />
      <span className="bi-cover-kicker" style={{ color: n[400].hex }}>
        {name}
      </span>
      <p className="bi-cover-line" style={{ fontSize: 34 }}>
        {word}
      </p>
    </div>
  );
}

/**
 * The palette, as a post.
 *
 * It replaces the tool's statistic card, which printed an invented figure about
 * brand leaders. A colour stack says something true, needs no copy at all, and
 * is the one post a brand with nothing written can still publish.
 */
function PaletteCover({
  chips,
  p,
  n,
}: {
  chips: IdentityRegister['chips'];
  p: Shades;
  n: Shades;
}) {
  const steps = [p[200], p[400], p[600], p[800]].map((v) => v.hex);
  const shown = chips.length >= 3 ? chips.slice(0, 5).map((c) => c.hex) : steps;
  return (
    <div className="bi-cover bi-cover--palette" style={{ background: n[50].hex }}>
      <div className="bi-cover-stack">
        {shown.map((hex, i) => (
          <span key={`${hex}-${i}`} style={{ background: hex }} />
        ))}
      </div>
      <span className="bi-cover-hex" style={{ color: n[900].hex }}>
        {shown[0]}
      </span>
    </div>
  );
}

function QuoteCover({
  quote,
  p,
  n,
}: {
  quote: { context: string; text: string };
  p: Shades;
  n: Shades;
}) {
  return (
    <div className="bi-cover bi-cover--quote" style={{ background: p[100].hex, color: n[950].hex }}>
      <span className="bi-cover-mark" style={{ color: p[300].hex }} aria-hidden>
        &ldquo;
      </span>
      <p className="bi-cover-quote" style={{ fontSize: coverSize(quote.text) }}>
        {quote.text}
      </p>
      {quote.context && (
        <span className="bi-cover-kicker" style={{ color: p[800].hex }}>
          {quote.context}
        </span>
      )}
    </div>
  );
}

function PhotoCover({ url, name, n }: { url: string; name: string; n: Shades }) {
  return (
    <div className="bi-cover bi-cover--photo">
      <img src={url} alt={name} loading="lazy" />
      <span
        aria-hidden
        className="bi-cover-scrim"
        style={{ background: `linear-gradient(180deg, transparent 45%, ${n[950].hex}cc 100%)` }}
      />
    </div>
  );
}

/* ── The site ────────────────────────────────────────────────────────── */

/**
 * A landing page in the brand's colours.
 *
 * The nav labels and the buttons are chrome — every site has them and nobody
 * reads them as a claim. The headline is the brand's own, and when the brand
 * has not written one the hero carries its name instead of a sentence we made
 * up for it.
 */
function SiteMock({ model, register }: { model: IdentityModel; register: IdentityRegister }) {
  const reveal = useReveal();
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;
  const onDark = on(n[950].hex, n[50].hex, n[950].hex);
  const mark = model.hero.logo?.url;
  const speaks = saysName(useArtworkShape(mark));

  const written = lines(model);
  // The second line when the brand has one — the shortest is on the post above.
  const headline = written[1] ?? written[0] ?? model.name;
  // Never the headline again. A hero whose subtitle repeats its own headline
  // word for word is the most obvious kind of broken.
  const support = written.find((l) => l !== headline);
  /*
   * The measure follows the headline, not the other way round.
   *
   * A 22ch column is right for four words and catastrophic for forty — the
   * positioning statement set at 60px in one ran twelve lines down the page and
   * out of the mock. Longer copy gets a smaller size AND a wider column, which
   * is what a designer would do with the same sentence.
   */
  const long = headline.length > 90;
  const mid = headline.length > 45;
  const features = (
    model.personality.values.length ? model.personality.values : model.personality.traits
  ).slice(0, 3);

  return (
    <figure className="bi-applied" {...reveal}>
      <figcaption className="bi-applied-cap bi-quiet">Website</figcaption>
      <div className="bi-site" style={{ background: n[50].hex, borderColor: n[200].hex }}>
        <nav className="bi-site-nav" style={{ borderColor: n[200].hex, background: '#fff' }}>
          {/* A logotype IS the nav logo — boxed into a 26px square beside its
              own name it was both illegible and redundant. */}
          <span className="bi-site-brand" data-speaks={speaks ? '' : undefined} style={{ color: n[900].hex }}>
            {mark ? (
              <span className="bi-site-mark" style={{ borderColor: speaks ? 'transparent' : n[200].hex }}>
                <img src={mark} alt={speaks ? model.name : ''} />
              </span>
            ) : null}
            {!speaks && model.name}
          </span>
          <span className="bi-site-links" style={{ color: n[600].hex }} aria-hidden>
            <span>Product</span>
            <span>Work</span>
            <span>About</span>
            <span>Contact</span>
          </span>
          <span className="bi-site-cta" style={{ background: n[950].hex, color: onDark }} aria-hidden>
            Get started
          </span>
        </nav>

        <div className="bi-site-hero">
          <span
            aria-hidden
            className="bi-site-blob bi-site-blob--a"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${p[400].hex}, ${p[700].hex} 55%, transparent 72%)`,
            }}
          />
          <span
            aria-hidden
            className="bi-site-blob bi-site-blob--b"
            style={{
              background: `radial-gradient(circle at 60% 60%, ${s[300].hex}, ${s[600].hex} 60%, transparent 75%)`,
            }}
          />
          <span className="bi-cover-grid bi-site-grid" style={{ color: n[900].hex }} aria-hidden />

          <div className="bi-site-copy" data-len={long ? 'long' : mid ? 'mid' : 'short'}>
            {model.introduction.industry && (
              <span
                className="bi-site-chip"
                style={{ borderColor: n[300].hex, color: n[700].hex, background: '#ffffffaa' }}
              >
                {model.introduction.industry}
              </span>
            )}
            <h3 className="bi-site-h1" style={{ color: n[950].hex }}>
              {headline}
            </h3>
            {support && (
              <p className="bi-site-sub" style={{ color: n[700].hex }}>
                {support}
              </p>
            )}
            <span className="bi-site-actions" aria-hidden>
              <span style={{ background: p[600].hex, color: on(p[600].hex, n[50].hex, n[950].hex) }}>
                Get started
              </span>
              <span style={{ borderColor: n[300].hex, color: n[800].hex }}>See the work</span>
            </span>
          </div>
        </div>

        {features.length > 0 && (
          <div className="bi-site-features" style={{ borderColor: n[200].hex }}>
            {features.map((f, i) => (
              <div key={f} className="bi-site-feature" style={{ background: '#fff', borderColor: n[200].hex }}>
                <span
                  className="bi-site-dot"
                  style={{ background: [p[600], s[500], p[300]][i % 3].hex }}
                />
                <span style={{ color: n[900].hex }}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

/* ── The product ─────────────────────────────────────────────────────── */

/**
 * One screen, in the brand's colours.
 *
 * Deliberately the brand's OWN screen — its mark, its name, its palette — and
 * not a wallet or a chat app with invented balances and messages in it. A
 * product mock is here to show the colours holding up at interface scale, and
 * inventing a product the brand does not have is not part of that.
 */
function PhoneMock({ model, register }: { model: IdentityModel; register: IdentityRegister }) {
  const reveal = useReveal({ delay: 80 });
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const mark = model.hero.logo?.url;
  const speaks = saysName(useArtworkShape(mark));
  const ink = on(p[600].hex, n[50].hex, n[950].hex);
  const rows = (
    model.personality.values.length ? model.personality.values : model.personality.traits
  ).slice(0, 4);

  return (
    <figure className="bi-applied" {...reveal}>
      <figcaption className="bi-applied-cap bi-quiet">Product</figcaption>
      <div className="bi-phones">
        <div className="bi-phone" style={{ background: n[50].hex, borderColor: n[300].hex }}>
          <div className="bi-phone-top" style={{ background: p[600].hex, color: ink }}>
            <span className="bi-phone-status" aria-hidden>
              <span>9:41</span>
              <span>▂▄▆</span>
            </span>
            {mark && (
              <span className="bi-phone-mark">
                <img src={mark} alt="" />
              </span>
            )}
            {!speaks && <span className="bi-phone-name">{model.name}</span>}
            {model.tagline && <span className="bi-phone-tag">{model.tagline}</span>}
          </div>
          <div className="bi-phone-body">
            {rows.map((row, i) => (
              <div key={row} className="bi-phone-row" style={{ borderColor: n[200].hex }}>
                <span className="bi-phone-swatch" style={{ background: [p[500], p[300], p[700], p[200]][i % 4].hex }} />
                <span style={{ color: n[900].hex }}>{row}</span>
              </div>
            ))}
          </div>
          <div className="bi-phone-bar" style={{ background: '#fff', borderColor: n[200].hex }} aria-hidden>
            <span style={{ background: p[600].hex }} />
            <span style={{ background: n[300].hex }} />
            <span style={{ background: n[300].hex }} />
          </div>
        </div>

        {/* The palette at interface scale, beside the screen that uses it. */}
        <div className="bi-ramp">
          {([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const).map((stop) => (
            <span key={stop} style={{ background: p[stop].hex }} title={`${stop} · ${p[stop].hex}`} />
          ))}
        </div>
      </div>
    </figure>
  );
}
