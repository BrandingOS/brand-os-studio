/**
 * Text that arrives a piece at a time.
 *
 * ── Why a component rather than a CSS class ─────────────────────────────
 *
 * A staggered reveal needs one element per piece, and the pieces have to come
 * from the string itself. Doing that in the sections would put `split(' ')` in
 * six places and, more importantly, would lose the thing that makes it safe:
 * every piece is wrapped in a span that is still ordinary inline text, so the
 * line breaks, hyphenates and is selected and read aloud exactly as the plain
 * string would be. A per-character effect built with absolute positioning
 * breaks all four.
 *
 * ── Words or characters ────────────────────────────────────────────────
 *
 * Characters for short things — a name, a two-word title — where the point is
 * the ripple. Words for anything longer: a sentence split into forty animated
 * characters is forty elements the browser lays out on every frame, and reads
 * as a novelty rather than as craft.
 *
 * Reduced motion is honoured by rendering the plain string. Not a faster
 * animation — no spans at all, because the safest version of this effect is the
 * one that never ran.
 */
import { useMemo } from 'react';
import { useReveal, prefersReducedMotion } from './useReveal';

export interface LettersProps {
  text: string;
  /** `char` ripples; `word` is for anything longer than a few words. */
  mode?: 'char' | 'word';
  /** Milliseconds between pieces. */
  stagger?: number;
  /** Milliseconds before the first piece. */
  delay?: number;
  className?: string;
  /** Rendered element. A heading should still be a heading. */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  /**
   * Styling hooks the caller already keys off — the purpose cards size their
   * statement from `data-size`, and wrapping the text in this component must
   * not cost them that.
   */
  'data-size'?: string;
}

export function Letters({
  text,
  mode = 'char',
  stagger = 26,
  delay = 0,
  className,
  as: Tag = 'span',
  'data-size': dataSize,
}: LettersProps) {
  const reveal = useReveal();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  /*
   * Always split on words FIRST, even in character mode.
   *
   * Adjacent inline-block boxes with no whitespace between them are one
   * unbreakable run — so wrapping a headline's every character in a span
   * removes every line-break opportunity it had, and "Bricolage Grotesque" ran
   * straight out of its card. Grouping the characters inside a per-word box,
   * with the REAL space characters left between the words, restores normal
   * wrapping: the line breaks between words exactly where it always would.
   */
  const words = useMemo(() => text.split(/(\s+)/).filter((s) => s.length > 0), [text]);

  if (reduced) {
    return (
      <Tag className={className} data-size={dataSize}>
        {text}
      </Tag>
    );
  }

  let piece = 0;
  return (
    <Tag
      className={className ? `${className} bi-letters` : 'bi-letters'}
      data-size={dataSize}
      {...reveal}
    >
      {words.map((word, wi) => {
        // Whitespace stays a plain text node: an animated space is an invisible
        // element that can still take a line of its own.
        if (/^\s+$/.test(word)) return word;

        if (mode === 'word') {
          const at = piece++;
          return (
            <span
              key={`${word}-${wi}`}
              className="bi-letter"
              style={{ '--bi-letter-delay': `${delay + at * stagger}ms` } as React.CSSProperties}
            >
              {word}
            </span>
          );
        }

        return (
          <span key={`${word}-${wi}`} className="bi-letter-word">
            {Array.from(word).map((ch, ci) => {
              const at = piece++;
              return (
                <span
                  key={`${ch}-${ci}`}
                  className="bi-letter"
                  style={{ '--bi-letter-delay': `${delay + at * stagger}ms` } as React.CSSProperties}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
