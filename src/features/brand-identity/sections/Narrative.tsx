/**
 * The opening movement: who this brand is, and what it believes.
 *
 * Three sections before a single specification. A brand guideline that opens on
 * a colour swatch is a parts list; the reader needs to know what they are
 * looking at before being told how to use it.
 *
 * The hero itself has moved to `Hero.tsx` — it grew a pinned stage, a colour
 * field and a palette strip, and a screen that ambitious is no longer the same
 * kind of thing as the sections that follow it.
 */
import type { IdentityModel } from '../identityModel';
import { Section, SplitHeader } from '../components/primitives';
import { useReveal } from '../motion/useReveal';

export function Introduction({ model }: { model: IdentityModel }) {
  const { summary } = model.introduction;
  const statement = useReveal();

  return (
    <Section id="introduction">
      {summary && (
        <p className="bi-statement bi-intro-statement" {...statement}>
          {summary}
        </p>
      )}
      {/* Industry and style used to be printed here as a meta row. They are on
          the hero now, beside the name, where someone reads them. */}
    </Section>
  );
}

export function Purpose({ model }: { model: IdentityModel }) {
  const { mission, vision, positioning, audience } = model.purpose;
  /*
   * Only the answers this brand actually gave, each as a card.
   *
   * A fixed four-up grid would leave holes for the ones it did not, and a hole
   * in a grid reads as something the page failed to load rather than something
   * the brand has not decided.
   */
  const cards = [
    { label: 'Why we exist', value: mission },
    { label: 'Where we are going', value: vision },
    { label: 'How we are different', value: positioning },
    { label: 'Who we are for', value: audience },
  ].filter((c): c is { label: string; value: string } => Boolean(c.value));

  return (
    <Section id="purpose">
      <SplitHeader
        eyebrow="What this brand is for"
        title="Purpose"
        body="The decisions everything else answers to. Read these before making anything."
      />
      <div className="bi-purpose-grid">
        {cards.map((card, i) => (
          <PurposeCard key={card.label} label={card.label} value={card.value} delay={i * 70} />
        ))}
      </div>
    </Section>
  );
}

/**
 * How long a statement is decides how big it is set.
 *
 * A mission can be five words or a paragraph, and the same type size cannot
 * serve both: five words at 20px reads timid, a paragraph at 30px becomes a
 * wall taller than the viewport. The size is a function of the content, which
 * is what keeps the page art-directed for THIS brand rather than laid out to a
 * fixed template that only flatters the brands whose copy happens to fit.
 */
function statementSize(value: string): 'sm' | 'md' | 'lg' {
  if (value.length > 220) return 'sm';
  if (value.length > 110) return 'md';
  return 'lg';
}

function PurposeCard({ label, value, delay }: { label: string; value: string; delay: number }) {
  const reveal = useReveal({ delay });
  return (
    <article className="bi-purpose-card" {...reveal}>
      <span className="bi-eyebrow">{label}</span>
      {/* Bottom-aligned: the statement is the card, the label is the caption. */}
      <p className="bi-statement-text" data-size={statementSize(value)}>
        {value}
      </p>
    </article>
  );
}

export function Personality({ model }: { model: IdentityModel }) {
  const { traits, values } = model.personality;

  return (
    <Section id="personality">
      <SplitHeader
        eyebrow="How this brand behaves"
        title="Personality & values"
        body="The character behind every decision — the words to check work against when something feels off but you cannot say why."
      />
      {traits.length > 0 && <WordRow items={traits} caption="Personality" />}
      {values.length > 0 && <WordRow items={values} caption="Values" offset={traits.length} />}
    </Section>
  );
}

function WordRow({
  items,
  caption,
  offset = 0,
}: {
  items: string[];
  caption: string;
  offset?: number;
}) {
  const head = useReveal();
  return (
    <div className="bi-word-row">
      <span className="bi-quiet bi-word-caption" {...head}>
        {caption}
      </span>
      <div className="bi-word-list">
        {items.map((word, i) => (
          <Word key={word} word={word} delay={(offset + i) * 60} />
        ))}
      </div>
    </div>
  );
}

function Word({ word, delay }: { word: string; delay: number }) {
  const reveal = useReveal({ delay });
  return (
    <span className="bi-word" {...reveal}>
      {word}
    </span>
  );
}
