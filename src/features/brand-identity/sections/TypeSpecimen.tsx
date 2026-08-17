/**
 * The typefaces doing their actual job.
 *
 * The rest of the Typography section lists what the faces ARE — family,
 * weights, files, a download. This shows what they DO: a heading at hero size,
 * a heading at section size, running copy, a pull quote, a caption, all set in
 * the brand's own faces at the sizes and colours the brand would really use.
 *
 * ── Why the brand's own words ───────────────────────────────────────────
 *
 * A specimen set in Lorem ipsum tells you about the font. A specimen set in the
 * brand's own sentences tells you about the BRAND — whether its mission
 * survives being set at 60px, whether its voice reads at 15px. That is the
 * question someone opens a guideline to answer, and it is why the sample text
 * here is never invented.
 *
 * A brand that has written nothing gets the pangram instead, which is honest:
 * a pangram is obviously a font sample and could not be mistaken for something
 * the brand said.
 */
import type { ColorScale } from '@/lib/color-engine';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { lines, splitLastWord } from '../brandCopy';
import { useReveal } from '../motion/useReveal';

const PANGRAM = 'Sphinx of black quartz, judge my vow.';

export function TypeSpecimen({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  const reveal = useReveal();
  const p = register.scale.shades;
  const n = register.neutral.shades;

  const display = model.typography.fonts[0];
  const text = model.typography.fonts[1] ?? display;
  if (!display) return null;

  const face = (family: string | undefined) =>
    family ? `'${family}', var(--bi-font-display, sans-serif)` : undefined;

  const written = lines(model);
  const headline = written[0] ?? model.name;
  // The second line, so the specimen's heading and its running copy are not the
  // same sentence set twice at two sizes.
  const body = written.find((l) => l !== headline) ?? PANGRAM;
  const quote = model.voice.examples[0];
  /*
   * The emphasis falls on the headline's own last word.
   *
   * Appending a personality trait after the sentence — which is what this did
   * first — produced "…crafted to be timeless. Bold": a word with no
   * grammatical footing, which reads as a rendering fault rather than as
   * emphasis. Marking a word that is already in the line proves the highlight
   * colour against real running type and invents nothing.
   */
  const { head, tail } = splitLastWord(headline);

  return (
    <div
      className="bi-spec"
      {...reveal}
      style={{ ...reveal.style, background: n[50].hex, borderColor: n[200].hex }}
    >
      <span className="bi-spec-cap" style={{ color: p[700].hex }}>
        {display.token.family}
        {text !== display ? ` + ${text.token.family}` : ''}
      </span>

      <h3 className="bi-spec-h1" style={{ fontFamily: face(display.token.family), color: n[950].hex }}>
        {head && `${head} `}
        {/* The one place the brand's colour touches running type. */}
        <em style={{ background: p[100].hex, color: p[900].hex }}>{tail}</em>
      </h3>

      <hr style={{ borderColor: n[200].hex }} />

      <div className="bi-spec-cols">
        <div>
          <h4 style={{ fontFamily: face(display.token.family), color: n[950].hex }}>
            {model.name}
          </h4>
          <p style={{ fontFamily: face(text.token.family), color: n[700].hex }}>{body}</p>
        </div>
        {quote ? (
          <blockquote
            style={{
              borderColor: p[600].hex,
              background: p[100].hex,
              color: n[950].hex,
              fontFamily: face(text.token.family),
            }}
          >
            <p>{quote.text}</p>
            {quote.context && <cite style={{ color: p[800].hex }}>{quote.context}</cite>}
          </blockquote>
        ) : (
          <div className="bi-spec-pangram" style={{ fontFamily: face(display.token.family), color: n[700].hex }}>
            {PANGRAM}
          </div>
        )}
      </div>

      <hr style={{ borderColor: n[200].hex }} />

      {/* The ladder. Every step the page itself uses, in the brand's face. */}
      <div className="bi-spec-ladder">
        {[
          { size: 60, weight: 700, label: 'Display · 60' },
          { size: 36, weight: 600, label: 'Title · 36' },
          { size: 24, weight: 600, label: 'Card · 24' },
          { size: 16, weight: 500, label: 'Body · 16' },
          { size: 12, weight: 600, label: 'Caption · 12' },
        ].map((step) => (
          <div key={step.label} className="bi-spec-step">
            <span className="bi-spec-step-label" style={{ color: n[500].hex }}>
              {step.label}
            </span>
            <span
              className="bi-spec-step-sample"
              style={{
                fontFamily: face(step.size >= 24 ? display.token.family : text.token.family),
                fontSize: step.size,
                fontWeight: step.weight,
                color: n[950].hex,
              }}
            >
              {model.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
