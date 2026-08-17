/**
 * The lines a brand has actually written, shortest first.
 *
 * Three surfaces need a headline — a social post, a site hero, a type specimen
 * — and all three want the same thing: a line short enough to be taken in at a
 * glance. Of what a brand records, only a tagline is written to be one; a
 * positioning statement and a mission are written to be READ. So the shortest
 * is the closest thing to a headline the brand owns, and taking the candidates
 * in field order instead gave SKAM a 150-character statement as a hero, set as
 * a twelve-line wall of 60px type.
 *
 * A LIST rather than one answer, because two surfaces on the same screen must
 * not print the same sentence: the site hero and its own supporting paragraph
 * did exactly that, and it reads as a page that lost track of itself.
 *
 * Nothing here is ever truncated. A long line is set smaller; it is not cut,
 * because half a sentence attributed to a brand is a sentence the brand did not
 * write.
 */
import type { IdentityModel } from './identityModel';

export function lines(model: IdentityModel): string[] {
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

/**
 * A line split so its last word can be emphasised.
 *
 * Marking a word inside real running type is how a specimen proves a highlight
 * colour works; appending a personality trait after the sentence instead
 * produced "…crafted to be timeless. Bold", which reads as a rendering fault
 * rather than as emphasis.
 */
export function splitLastWord(text: string): { head: string; tail: string } {
  const trimmed = text.trim();
  const at = trimmed.lastIndexOf(' ');
  if (at <= 0) return { head: '', tail: trimmed };
  return { head: trimmed.slice(0, at), tail: trimmed.slice(at + 1) };
}
