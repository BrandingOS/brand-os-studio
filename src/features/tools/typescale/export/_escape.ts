// _escape.ts — small helpers used by serializers to keep output valid.

/** Escape a string so it can be placed inside a CSS double-quoted string. */
export function cssString(raw: string): string {
  return raw.replace(/[\\"]/g, '\\$&').replace(/[\r\n]/g, ' ');
}

/** Escape a URL so it can be placed inside a CSS url("...") literal. */
export function cssUrl(raw: string): string {
  // Encode quote/backslash/whitespace that would break the literal.
  return raw.replace(/["\\]/g, '\\$&').replace(/[\r\n\t]/g, '');
}

/** Fallback lists are stored as comma-separated identifier-or-quoted families;
 *  we leave identifiers alone and only wrap individual families with spaces or unsafe chars. */
export function cssFallback(raw: string): string {
  // Treat the fallback as a pre-formatted CSS value string. Strip characters that
  // could terminate a declaration (\r\n\t; and unmatched { }).
  return raw.replace(/[\r\n\t;{}]/g, ' ');
}
