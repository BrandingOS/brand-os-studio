/**
 * BrandingOS Design System — token codegen.
 *
 * src/shared/ds/tokens.json is the ONLY hand-editable token source.
 * This script generates from it, deterministically:
 *   - src/shared/ds/tokens.css  (the stylesheet every DS component reads)
 *   - src/shared/ds/tokens.ts   (the TS mirror for logic + tests)
 *
 * Run: npm run gen:tokens         (or: node scripts/gen-ds-tokens.mjs)
 * CI:  src/shared/ds/tokensSync.test.ts regenerates in-memory and fails if
 *      the committed files are stale.
 *
 * The dev-only Vite endpoint POST /__ds-tokens/apply imports the pure
 * functions below (validate → merge → write json → regenerate) so the
 * Controller's Save uses exactly the same path as a manual edit.
 */

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DS_DIR = join(__dirname, '..', 'src', 'shared', 'ds');
export const TOKENS_JSON_PATH = join(DS_DIR, 'tokens.json');
export const TOKENS_CSS_PATH = join(DS_DIR, 'tokens.css');
export const TOKENS_TS_PATH = join(DS_DIR, 'tokens.ts');

/* ----------------------------- validation ----------------------------- */

const NAME_RE = /^--ds-[a-z0-9-]+$/;
// Whitelist of characters a token value may contain. Blocks anything that
// could escape a CSS declaration ({ } ; ! @ \) or a JS string, and any
// whitespace other than a plain space (newlines would break declarations).
const VALUE_RE = /^[\w #%.,()'"/-]+$/;
const VALUE_MAX = 300;

const KIND_RES = {
  size: /^\d+(\.\d+)?px$/,
  duration: /^\d+(\.\d+)?ms$/,
  color: /^(#[0-9a-fA-F]{6}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/,
};

/** Infer the value shape a token must satisfy from its name. */
export function tokenKind(name) {
  if (/^--ds-(radius|space)-/.test(name)) return 'size';
  if (/^--ds-duration-/.test(name)) return 'duration';
  if (/^--ds-(shadow-|ease$)/.test(name)) return 'freeform';
  if (/^--ds-font/.test(name)) return 'freeform';
  return 'color'; // everything else in the system is a color
}

/** Returns an error string, or null when the pair is valid. */
export function validateTokenValue(name, value) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    return `invalid token name: ${JSON.stringify(name)}`;
  }
  if (typeof value !== 'string' || value.length === 0) {
    return `${name}: value must be a non-empty string`;
  }
  if (value.length > VALUE_MAX) return `${name}: value too long`;
  if (!VALUE_RE.test(value)) return `${name}: value contains disallowed characters`;
  const kind = tokenKind(name);
  const re = KIND_RES[kind];
  if (re && !re.test(value.trim())) return `${name}: not a valid ${kind} value (${value})`;
  return null;
}

/** Validates a full tokens.json object. Returns string[] of errors ([] = ok). */
export function validateTokens(tokens) {
  const errors = [];
  if (!tokens || typeof tokens !== 'object') return ['tokens.json is not an object'];
  if (tokens.version !== 1) errors.push('unsupported tokens.json version');
  const light = tokens.modes?.light;
  const dark = tokens.modes?.dark;
  const global = tokens.global;
  if (!light || !dark || !global) return [...errors, 'missing modes.light / modes.dark / global maps'];
  const lightKeys = Object.keys(light);
  const darkKeys = Object.keys(dark);
  if (lightKeys.join('\n') !== darkKeys.join('\n')) {
    errors.push('modes.light and modes.dark must declare the same tokens in the same order');
  }
  for (const [scopeName, map] of [['light', light], ['dark', dark], ['global', global]]) {
    for (const [name, value] of Object.entries(map)) {
      const err = validateTokenValue(name, value);
      if (err) errors.push(`${scopeName}: ${err}`);
    }
  }
  const globalOverlap = Object.keys(global).filter((k) => k in light);
  if (globalOverlap.length) errors.push(`tokens in both global and modes: ${globalOverlap.join(', ')}`);
  return errors;
}

/**
 * Validates a Controller draft ({light, dark, global} partial maps) against
 * the current tokens: every key must already exist in the matching map (the
 * endpoint can change values, never mint tokens), every value must be valid.
 */
export function validateDraft(draft, tokens) {
  const errors = [];
  if (!draft || typeof draft !== 'object') return ['draft is not an object'];
  const scopes = { light: tokens.modes.light, dark: tokens.modes.dark, global: tokens.global };
  for (const scope of Object.keys(draft)) {
    if (!(scope in scopes)) {
      errors.push(`unknown scope: ${scope}`);
      continue;
    }
    const map = draft[scope];
    if (!map || typeof map !== 'object') {
      errors.push(`${scope}: not an object`);
      continue;
    }
    for (const [name, value] of Object.entries(map)) {
      if (!(name in scopes[scope])) {
        errors.push(`${scope}: unknown token ${name}`);
        continue;
      }
      const err = validateTokenValue(name, value);
      if (err) errors.push(`${scope}: ${err}`);
    }
  }
  return errors;
}

/** Pure merge of a valid draft into a tokens object (new object returned). */
export function applyDraft(tokens, draft) {
  return {
    ...tokens,
    modes: {
      light: { ...tokens.modes.light, ...(draft.light ?? {}) },
      dark: { ...tokens.modes.dark, ...(draft.dark ?? {}) },
    },
    global: { ...tokens.global, ...(draft.global ?? {}) },
  };
}

/* ------------------------------ generators ----------------------------- */

const GENERATED_HEADER = (ext) =>
  `${ext === 'css' ? '/*' : '/*'}
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source of truth: src/shared/ds/tokens.json
 * Regenerate with:  npm run gen:tokens
 * (The /_dev/design-system Controller's Save button runs the same codegen.)
 ${ext === 'css' ? '*/' : '*/'}`;

/** Section banner heuristics keyed off name prefixes, for readable CSS. */
function sectionFor(name) {
  if (/^--ds-radius-/.test(name)) return 'Shape';
  if (/^--ds-space-/.test(name)) return 'Spacing — 4px base';
  if (/^--ds-shadow-/.test(name)) return 'Elevation — warm-neutral shadows, never tinted';
  if (/^--ds-(ease$|duration-)/.test(name)) return 'Motion — one easing, three durations';
  if (/^--ds-font/.test(name)) return 'Type — one product face';
  return null;
}

function declBlock(map, indent = '  ') {
  const lines = [];
  let section = null;
  for (const [name, value] of Object.entries(map)) {
    const next = sectionFor(name);
    if (next && next !== section) {
      if (section !== null || lines.length > 0) lines.push('');
      lines.push(`${indent}/* ${next} */`);
      section = next;
    }
    lines.push(`${indent}${name}: ${value};`);
  }
  return lines.join('\n');
}

const CSS_STATIC_FOOTER = `@keyframes ds-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes ds-mark-dot {
  0%, 70%, 100% { opacity: 0.18; transform: scale(0.82); }
  25% { opacity: 1; transform: scale(1); }
}

@keyframes ds-modal-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes ds-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --ds-duration-state: 1ms;
    --ds-duration-panel: 1ms;
    --ds-duration-modal: 1ms;
  }
}
`;

export function generateCss(tokens) {
  return `${GENERATED_HEADER('css')}

/* BrandingOS Design System v1 — token layer.
 * One token set, two value maps. Light lives on :root; dark overrides under
 * \`.dark\` (next-themes on <html>) and \`[data-theme="dark"]\` (WorkspaceShell
 * div), so the same tokens resolve in both theming systems. Components read
 * tokens only — no hard-coded hex in component styles. */

:root {
  /* Color — light ("printed paper, not screen white") */
${declBlock(tokens.modes.light)}

${declBlock(tokens.global)}
}

.dark,
[data-theme='dark'] {
  /* Color — dark (warm charcoal, never pure black; accent inverts) */
${declBlock(tokens.modes.dark)}
}

/* A nested light island inside a dark scope re-asserts the light map. */
[data-theme='light'] {
${declBlock(tokens.modes.light)}
}

${CSS_STATIC_FOOTER}`;
}

const camel = (name) =>
  name
    .replace(/^--ds-/, '')
    .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function tsRecord(map, indent = '  ') {
  return Object.entries(map)
    .map(([name, value]) => `${indent}${camel(name)}: '${value.replace(/'/g, "\\'")}',`)
    .join('\n');
}

export function generateTs(tokens) {
  const radius = Object.entries(tokens.global)
    .filter(([k]) => k.startsWith('--ds-radius-'))
    .map(([k, v]) => `  ${camel(k).replace(/^radius/, '').replace(/^./, (c) => c.toLowerCase())}: ${parseFloat(v)},`)
    .join('\n');
  const durations = Object.entries(tokens.global)
    .filter(([k]) => k.startsWith('--ds-duration-'))
    .map(([k, v]) => `  ${camel(k)}: ${parseFloat(v)},`)
    .join('\n');
  return `${GENERATED_HEADER('ts')}

/** Light-mode token values, camelCased from tokens.json. */
export const dsLight = {
${tsRecord(tokens.modes.light)}
} as const;

/** Dark-mode token values, camelCased from tokens.json. */
export const dsDark = {
${tsRecord(tokens.modes.dark)}
} as const;

export const dsMotion = {
  ease: '${tokens.global['--ds-ease']}',
${durations}
} as const;

export const dsRadius = {
${radius}
} as const;
`;
}

/* ------------------------------- file io ------------------------------- */

export function readTokens(path = TOKENS_JSON_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function serializeTokens(tokens) {
  return `${JSON.stringify(tokens, null, 2)}\n`;
}

/** Atomic write: temp file in the same directory, then rename. */
export function writeFileAtomic(path, content) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

export function writeGenerated(tokens) {
  writeFileAtomic(TOKENS_CSS_PATH, generateCss(tokens));
  writeFileAtomic(TOKENS_TS_PATH, generateTs(tokens));
}

/* --------------------------------- cli --------------------------------- */

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const tokens = readTokens();
  const errors = validateTokens(tokens);
  if (errors.length) {
    console.error('[gen-ds-tokens] tokens.json is invalid:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const cssStale = readFileSync(TOKENS_CSS_PATH, 'utf8') !== generateCss(tokens);
    const tsStale = readFileSync(TOKENS_TS_PATH, 'utf8') !== generateTs(tokens);
    if (cssStale || tsStale) {
      console.error(
        `[gen-ds-tokens] stale generated files:${cssStale ? ' tokens.css' : ''}${tsStale ? ' tokens.ts' : ''} — run npm run gen:tokens`,
      );
      process.exit(1);
    }
    console.log('[gen-ds-tokens] ✓ generated files are in sync with tokens.json');
  } else {
    writeGenerated(tokens);
    console.log('[gen-ds-tokens] ✓ wrote tokens.css + tokens.ts from tokens.json');
  }
}
