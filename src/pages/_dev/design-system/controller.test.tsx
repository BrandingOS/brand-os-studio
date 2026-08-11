import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const tokensCss = readFileSync(
  resolve(__dirname, '../../../shared/ds/tokens.css'),
  'utf8',
);
import { DS_TOKENS, SECTIONS, tokenScope } from './registry';
import { validateValue } from './validate';
import {
  DS_DRAFT_STORAGE_KEY,
  draftToCssPatch,
  loadDraft,
  useTokenDrafts,
} from './useTokenDrafts';

const bg = DS_TOKENS.find((d) => d.cssVar === '--ds-bg')!;
const radiusCard = DS_TOKENS.find((d) => d.cssVar === '--ds-radius-card')!;

describe('registry ↔ tokens.css sync', () => {
  it('every registry token exists in the canonical stylesheet', () => {
    for (const def of DS_TOKENS) {
      const occurrences = tokensCss.split(`${def.cssVar}:`).length - 1;
      if (def.perMode) {
        // per-mode tokens must be declared in the light map, the dark map,
        // and the light re-assert island
        expect(occurrences, `${def.cssVar} should have light+dark+island declarations`).toBeGreaterThanOrEqual(3);
      } else {
        expect(occurrences, `${def.cssVar} missing from tokens.css`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('registry has no duplicate vars', () => {
    const names = DS_TOKENS.map((d) => d.cssVar);
    expect(new Set(names).size).toBe(names.length);
  });

  it('tokenScope routes per-mode vs global correctly', () => {
    expect(tokenScope(bg, 'dark')).toBe('dark');
    expect(tokenScope(bg, 'light')).toBe('light');
    expect(tokenScope(radiusCard, 'dark')).toBe('global');
  });
});

describe('useTokenDrafts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets, reads, and counts overrides per scope', () => {
    const { result } = renderHook(() => useTokenDrafts());
    act(() => result.current.setToken(bg, 'light', '#ff0000'));
    act(() => result.current.setToken(bg, 'dark', '#00ff00'));
    act(() => result.current.setToken(radiusCard, 'dark', '20px'));
    expect(result.current.getOverride(bg, 'light')).toBe('#ff0000');
    expect(result.current.getOverride(bg, 'dark')).toBe('#00ff00');
    // global token edited from dark mode still lands in the global scope
    expect(result.current.draft.global['--ds-radius-card']).toBe('20px');
    expect(result.current.overrideCount).toBe(3);
    expect(result.current.isOverridden(bg, 'light')).toBe(true);
  });

  it('resetToken removes only that override; resetAll clears everything', () => {
    const { result } = renderHook(() => useTokenDrafts());
    act(() => result.current.setToken(bg, 'light', '#ff0000'));
    act(() => result.current.setToken(radiusCard, 'light', '9px'));
    act(() => result.current.resetToken(bg, 'light'));
    expect(result.current.isOverridden(bg, 'light')).toBe(false);
    expect(result.current.overrideCount).toBe(1);
    act(() => result.current.resetAll());
    expect(result.current.overrideCount).toBe(0);
  });

  it('undo steps back through edits, including resets', () => {
    const { result } = renderHook(() => useTokenDrafts());
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setToken(bg, 'light', '#111111'));
    act(() => result.current.setToken(bg, 'light', '#222222'));
    act(() => result.current.resetAll());
    expect(result.current.overrideCount).toBe(0);
    act(() => result.current.undo());
    expect(result.current.getOverride(bg, 'light')).toBe('#222222');
    act(() => result.current.undo());
    expect(result.current.getOverride(bg, 'light')).toBe('#111111');
    act(() => result.current.undo());
    expect(result.current.overrideCount).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('no-op edits (same value, resetting a non-override) do not pollute history', () => {
    const { result } = renderHook(() => useTokenDrafts());
    act(() => result.current.setToken(bg, 'light', '#333333'));
    act(() => result.current.setToken(bg, 'light', '#333333'));
    act(() => result.current.resetToken(radiusCard, 'light'));
    act(() => result.current.undo());
    expect(result.current.overrideCount).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('resetSection clears a group of tokens as one undo step', () => {
    const { result } = renderHook(() => useTokenDrafts());
    const colorDefs = DS_TOKENS.filter((d) => d.group === 'surfaces');
    act(() => result.current.setToken(bg, 'light', '#ff0000'));
    act(() => result.current.setToken(radiusCard, 'light', '9px'));
    act(() => result.current.resetSection(colorDefs, 'light'));
    expect(result.current.isOverridden(bg, 'light')).toBe(false);
    expect(result.current.overrideCount).toBe(1); // radius untouched
    act(() => result.current.undo());
    expect(result.current.isOverridden(bg, 'light')).toBe(true);
    // resetting a section with no overrides is a no-op for history
    act(() => result.current.resetSection([radiusCard], 'dark'));
    act(() => result.current.resetSection([bg], 'dark'));
    expect(result.current.getOverride(bg, 'light')).toBe('#ff0000');
  });

  it('clearSaved empties drafts AND history (post-save baseline)', () => {
    const { result } = renderHook(() => useTokenDrafts());
    act(() => result.current.setToken(bg, 'light', '#ff0000'));
    act(() => result.current.clearSaved());
    expect(result.current.overrideCount).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(loadDraft().light).toEqual({});
  });

  it('persists drafts to localStorage and rehydrates in a fresh hook', () => {
    const first = renderHook(() => useTokenDrafts());
    act(() => first.result.current.setToken(bg, 'dark', '#0a0a0a'));
    first.unmount();
    const second = renderHook(() => useTokenDrafts());
    expect(second.result.current.getOverride(bg, 'dark')).toBe('#0a0a0a');
  });

  it('ignores corrupt or wrong-version storage', () => {
    localStorage.setItem(DS_DRAFT_STORAGE_KEY, 'not json');
    expect(loadDraft().light).toEqual({});
    localStorage.setItem(DS_DRAFT_STORAGE_KEY, JSON.stringify({ v: 99, light: { a: 'b' } }));
    expect(loadDraft().light).toEqual({});
  });
});

describe('draftToCssPatch', () => {
  it('shapes light+global into :root and dark into the dark map', () => {
    const patch = draftToCssPatch({
      light: { '--ds-bg': '#fffff0' },
      dark: { '--ds-bg': '#101010' },
      global: { '--ds-radius-card': '16px' },
    });
    expect(patch).toContain(':root {');
    expect(patch).toContain('--ds-bg: #fffff0;');
    expect(patch).toContain('--ds-radius-card: 16px;');
    expect(patch).toContain(".dark, [data-theme='dark'] {");
    expect(patch).toContain('--ds-bg: #101010;');
  });

  it('omits empty blocks', () => {
    const patch = draftToCssPatch({ light: {}, dark: {}, global: { '--ds-space-4': '18px' } });
    expect(patch).toContain(':root {');
    expect(patch).not.toContain(".dark, [data-theme='dark'] {");
  });
});

describe('registry ↔ tokens.json coverage', () => {
  const tokensJson = JSON.parse(
    readFileSync(resolve(__dirname, '../../../shared/ds/tokens.json'), 'utf8'),
  );
  const jsonVars = [
    ...Object.keys(tokensJson.modes.light),
    ...Object.keys(tokensJson.global),
  ];

  it('every tokens.json token has a Controller entry (no orphan tokens)', () => {
    const registryVars = new Set(DS_TOKENS.map((d) => d.cssVar));
    for (const v of jsonVars) {
      expect(registryVars.has(v), `${v} missing from Controller registry`).toBe(true);
    }
  });

  it('every Controller entry exists in tokens.json (no invented tokens)', () => {
    const jsonSet = new Set(jsonVars);
    for (const d of DS_TOKENS) {
      expect(jsonSet.has(d.cssVar), `${d.cssVar} not in tokens.json`).toBe(true);
    }
  });

  it('perMode flags match where the token lives in tokens.json', () => {
    for (const d of DS_TOKENS) {
      const inModes = d.cssVar in tokensJson.modes.light;
      expect(d.perMode, `${d.cssVar} perMode should be ${inModes}`).toBe(inModes);
    }
  });

  it('every token has purpose and section metadata', () => {
    for (const d of DS_TOKENS) {
      expect(d.purpose.length, `${d.cssVar} needs a purpose`).toBeGreaterThan(0);
      expect(SECTIONS.some((s) => s.id === d.group), `${d.cssVar} bad section`).toBe(true);
    }
  });
});

describe('inline validation', () => {
  const border = DS_TOKENS.find((d) => d.cssVar === '--ds-border')!;
  const radius = DS_TOKENS.find((d) => d.cssVar === '--ds-radius-card')!;
  const duration = DS_TOKENS.find((d) => d.cssVar === '--ds-duration-state')!;

  it('accepts valid values', () => {
    expect(validateValue(border, '#e6e4dd').ok).toBe(true);
    expect(validateValue(border, 'rgba(13, 13, 13, 0.22)').ok).toBe(true);
    expect(validateValue(radius, '14px').ok).toBe(true);
    expect(validateValue(duration, '150ms').ok).toBe(true);
  });

  it('identifies a Cyrillic lookalike character by name', () => {
    // "#e6е4dd" — the third "е" is Cyrillic U+0435
    const res = validateValue(border, '#e6\u04354dd');
    expect(res.ok).toBe(false);
    expect(res.message).toContain('Cyrillic');
    expect(res.message).toContain('U+0435');
  });

  it('rejects wrong shapes with human messages', () => {
    expect(validateValue(border, 'reddish').message).toContain('Not a valid color');
    expect(validateValue(radius, '14').message).toContain('px');
    expect(validateValue(duration, 'fast').message).toContain('ms');
    expect(validateValue(border, '').message).toContain('empty');
  });
});

describe('history store', () => {
  it('deleteHistoryEntry removes exactly one snapshot and persists', async () => {
    const { pushHistory, deleteHistoryEntry, loadHistory } = await import('./historyStore');
    localStorage.removeItem('brandos:ds-controller:history');
    const snap = { light: {}, dark: {}, global: {} };
    pushHistory({ ts: 1, kind: 'apply', before: snap, changes: [] });
    const two = pushHistory({ ts: 2, kind: 'apply', before: snap, changes: [] });
    expect(two.length).toBe(2);
    const after = deleteHistoryEntry(two[0].id);
    expect(after.length).toBe(1);
    expect(loadHistory().length).toBe(1);
    expect(loadHistory()[0].ts).toBe(1);
    localStorage.removeItem('brandos:ds-controller:history');
  });
});
