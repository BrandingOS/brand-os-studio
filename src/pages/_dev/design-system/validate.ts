import type { TokenDef } from './registry';

/**
 * Client-side mirror of scripts/gen-ds-tokens.mjs validation, so drafts
 * fail INLINE at the field — not as a technical server error at Save.
 * The server-side validator remains authoritative; this exists purely
 * for UX. Keep the shapes in sync with gen-ds-tokens.mjs.
 */

const VALUE_RE = /^[\w #%.,()'"/-]+$/;
const VALUE_MAX = 300;

const KIND_RES: Record<string, RegExp> = {
  size: /^\d+(\.\d+)?px$/,
  duration: /^\d+(\.\d+)?ms$/,
  color: /^(#[0-9a-fA-F]{6}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/,
};

/** Server 'kind' for a token (value-shape family) — mirrors tokenKind(). */
function serverKind(cssVar: string): 'size' | 'duration' | 'color' | 'freeform' {
  if (/^--ds-(radius|space)-/.test(cssVar)) return 'size';
  if (/^--ds-duration-/.test(cssVar)) return 'duration';
  if (/^--ds-(shadow-|ease$)/.test(cssVar)) return 'freeform';
  if (/^--ds-font/.test(cssVar)) return 'freeform';
  return 'color';
}

/** Human name for a confusable non-ASCII character, when we know it. */
function describeChar(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  const known: Record<number, string> = {
    0x0430: 'Cyrillic "а" instead of ASCII "a"',
    0x0435: 'Cyrillic "е" instead of ASCII "e"',
    0x043e: 'Cyrillic "о" instead of ASCII "o"',
    0x0440: 'Cyrillic "р" instead of ASCII "p"',
    0x0441: 'Cyrillic "с" instead of ASCII "c"',
    0x0445: 'Cyrillic "х" instead of ASCII "x"',
    0x0455: 'Cyrillic "ѕ" instead of ASCII "s"',
    0x0456: 'Cyrillic "і" instead of ASCII "i"',
    0x00a0: 'a non-breaking space instead of a normal space',
    0x2013: 'an en-dash "–" instead of a hyphen "-"',
    0x2014: 'an em-dash "—" instead of a hyphen "-"',
    0x201c: 'a curly quote instead of a straight quote',
    0x201d: 'a curly quote instead of a straight quote',
    0x2018: 'a curly quote instead of a straight quote',
    0x2019: 'a curly quote instead of a straight quote',
  };
  if (known[cp]) return `${known[cp]} (${hex})`;
  if (cp >= 0x0400 && cp <= 0x04ff) return `Cyrillic "${ch}" (${hex})`;
  if (cp >= 0x0370 && cp <= 0x03ff) return `Greek "${ch}" (${hex})`;
  return `"${ch}" (${hex})`;
}

/** First character in the value that the charset rejects, described. */
function findBadChar(value: string): string | null {
  for (const ch of value) {
    if (!VALUE_RE.test(ch)) return describeChar(ch);
  }
  return null;
}

export interface ValidationResult {
  ok: boolean;
  /** Short human message shown under the field. */
  message?: string;
}

/** Validate one draft value for a token, with human-readable messages. */
export function validateValue(def: TokenDef, raw: string): ValidationResult {
  const value = raw;
  if (value.length === 0) return { ok: false, message: 'Value is empty.' };
  if (value.length > VALUE_MAX) return { ok: false, message: `Too long (max ${VALUE_MAX} characters).` };

  if (!VALUE_RE.test(value)) {
    const bad = findBadChar(value);
    const kind = serverKind(def.cssVar);
    const head = kind === 'color' ? 'Invalid color' : 'Invalid value';
    return {
      ok: false,
      message: bad
        ? `${head} — "${value}" contains ${bad}.`
        : `${head} — "${value}" contains a disallowed character.`,
    };
  }

  const kind = serverKind(def.cssVar);
  const re = KIND_RES[kind];
  if (re && !re.test(value.trim())) {
    if (kind === 'color') {
      // A near-miss hex with a lookalike passes the charset check only if
      // the confusable is in \w… it isn't (non-ASCII fails above). Here the
      // shape itself is wrong.
      return {
        ok: false,
        message: `Not a valid color — use #rrggbb, rgba(…) or hsla(…). Got "${value}".`,
      };
    }
    if (kind === 'size') return { ok: false, message: `Use a px value like "14px". Got "${value}".` };
    if (kind === 'duration') return { ok: false, message: `Use a ms value like "150ms". Got "${value}".` };
  }
  return { ok: true };
}

/** Validate a whole draft; returns cssVar→message for every invalid entry. */
export function validateDraftValues(
  draft: { light: Record<string, string>; dark: Record<string, string>; global: Record<string, string> },
  defs: TokenDef[],
): Record<string, string> {
  const byVar = new Map(defs.map((d) => [d.cssVar, d]));
  const errors: Record<string, string> = {};
  for (const scope of ['light', 'dark', 'global'] as const) {
    for (const [cssVar, value] of Object.entries(draft[scope])) {
      const def = byVar.get(cssVar);
      if (!def) continue;
      const res = validateValue(def, value);
      if (!res.ok) errors[`${scope}:${cssVar}`] = res.message ?? 'Invalid value.';
    }
  }
  return errors;
}
