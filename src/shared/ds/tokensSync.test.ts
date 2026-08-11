import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// The codegen script is plain ESM — imported directly so the test exercises
// the exact functions the CLI and the /__ds-tokens/apply endpoint run.
import {
  applyDraft,
  generateCss,
  generateTs,
  validateDraft,
  validateTokens,
  validateTokenValue,
} from '../../../scripts/gen-ds-tokens.mjs';

const dsDir = resolve(__dirname);
const tokens = JSON.parse(readFileSync(resolve(dsDir, 'tokens.json'), 'utf8'));

describe('tokens.json → generated files sync (CI staleness guard)', () => {
  it('tokens.json itself is valid', () => {
    expect(validateTokens(tokens)).toEqual([]);
  });

  it('tokens.css matches what the generator produces — run `npm run gen:tokens` if this fails', () => {
    const onDisk = readFileSync(resolve(dsDir, 'tokens.css'), 'utf8');
    expect(onDisk).toBe(generateCss(tokens));
  });

  it('tokens.ts matches what the generator produces — run `npm run gen:tokens` if this fails', () => {
    const onDisk = readFileSync(resolve(dsDir, 'tokens.ts'), 'utf8');
    expect(onDisk).toBe(generateTs(tokens));
  });

  it('generated files carry the DO NOT EDIT header', () => {
    expect(generateCss(tokens)).toContain('GENERATED FILE — DO NOT EDIT');
    expect(generateTs(tokens)).toContain('GENERATED FILE — DO NOT EDIT');
  });
});

describe('token validation (endpoint input guards)', () => {
  it('accepts valid values per kind', () => {
    expect(validateTokenValue('--ds-bg', '#a1b2c3')).toBeNull();
    expect(validateTokenValue('--ds-focus-ring', 'rgba(17, 17, 19, 0.16)')).toBeNull();
    expect(validateTokenValue('--ds-radius-card', '14px')).toBeNull();
    expect(validateTokenValue('--ds-duration-state', '150ms')).toBeNull();
    expect(validateTokenValue('--ds-shadow-sm', '0 2px 8px rgba(20, 18, 14, 0.08)')).toBeNull();
    expect(validateTokenValue('--ds-font', "'Plus Jakarta Sans', sans-serif")).toBeNull();
  });

  it('rejects malformed names and values', () => {
    expect(validateTokenValue('--evil', '#ffffff')).toBeTruthy();
    expect(validateTokenValue('--ds-bg', 'notacolor')).toBeTruthy();
    expect(validateTokenValue('--ds-bg', '#fff')).toBeTruthy();
    expect(validateTokenValue('--ds-radius-card', '14')).toBeTruthy();
    expect(validateTokenValue('--ds-duration-state', '150')).toBeTruthy();
    expect(validateTokenValue('--ds-bg', '')).toBeTruthy();
  });

  it('rejects CSS-injection attempts', () => {
    expect(validateTokenValue('--ds-shadow-sm', 'red; } body { display: none')).toBeTruthy();
    expect(validateTokenValue('--ds-font', 'x} @import "evil.css"; {')).toBeTruthy();
    expect(validateTokenValue('--ds-ease', 'linear !important')).toBeTruthy();
    expect(validateTokenValue('--ds-font', "a'\nb")).toBeTruthy();
  });

  it('validateDraft only allows existing tokens in known scopes', () => {
    expect(validateDraft({ light: { '--ds-bg': '#101010' } }, tokens)).toEqual([]);
    expect(validateDraft({ global: { '--ds-radius-card': '16px' } }, tokens)).toEqual([]);
    expect(validateDraft({ light: { '--ds-not-a-token': '#101010' } }, tokens)).not.toEqual([]);
    expect(validateDraft({ nope: { '--ds-bg': '#101010' } }, tokens)).not.toEqual([]);
    expect(validateDraft({ light: { '--ds-bg': 'bad' } }, tokens)).not.toEqual([]);
    expect(validateDraft(null, tokens)).not.toEqual([]);
  });

  it('applyDraft merges without mutating and only touches drafted keys', () => {
    const draft = { dark: { '--ds-bg': '#0b0b0b' }, global: { '--ds-radius-card': '16px' } };
    const next = applyDraft(tokens, draft);
    expect(next.modes.dark['--ds-bg']).toBe('#0b0b0b');
    expect(next.global['--ds-radius-card']).toBe('16px');
    expect(next.modes.light).toEqual(tokens.modes.light);
    expect(tokens.modes.dark['--ds-bg']).toBe('#141414');
    // regenerating from the merged object embeds the new values
    expect(generateCss(next)).toContain('--ds-bg: #0b0b0b;');
  });

  it('validateTokens catches light/dark key drift', () => {
    const broken = JSON.parse(JSON.stringify(tokens));
    delete broken.modes.dark['--ds-scrim'];
    expect(validateTokens(broken)).not.toEqual([]);
  });
});
