/**
 * A name-only brand fabricates nothing.
 *
 * The guard on the rule that a brand created from just a name must not acquire
 * brand values nobody chose. It checks all three places a fabrication could
 * leak: the create payload, Core metadata, and the proposal set.
 */
import { describe, it, expect } from 'vitest';
import {
  CORE_PLACEHOLDERS,
  clearPlaceholders,
  isPlaceholderPath,
  placeholderPaths,
  readOnboardingState,
  startedState,
} from '@/shared/onboarding/onboardingState';
import { coreValueMeta } from '@/domain/brand/coreMeta';
import { buildCreateInput, isUndecided, normalizeUrl } from '../createBrand';
import { interpret } from '../interpret';

describe('the create payload invents nothing', () => {
  it('carries no tone and no audience', () => {
    const input = buildCreateInput({ name: 'Meridian' });
    expect(input.tone).toBe('');
    expect(input.audience).toBe('');
  });

  it('carries no website unless one was typed', () => {
    expect(buildCreateInput({ name: 'Meridian' })).not.toHaveProperty('publicUrl');
    expect(buildCreateInput({ name: 'Meridian', website: 'meridian.co' }).publicUrl)
      .toBe('https://meridian.co');
  });

  it('uses a documented neutral for the two fields persistence demands', () => {
    const input = buildCreateInput({ name: 'Meridian' });
    expect(input.primaryColor).toBe(CORE_PLACEHOLDERS['colors.primary']);
    expect(input.fonts.primary).toBe(CORE_PLACEHOLDERS['typography.primary']);
  });

  it('records both as placeholders, so neither is ever read as a decision', () => {
    const { onboarding } = buildCreateInput({ name: 'Meridian' });
    expect(onboarding.placeholders).toEqual(['colors.primary', 'typography.primary']);
  });

  it('the neutrals are unclaimed rather than plausible brand values', () => {
    // A mid-grey is not a brand colour and the system stack is not a typeface
    // decision. If either ever became something that looks chosen, this fails.
    expect(CORE_PLACEHOLDERS['colors.primary']).toBe('#8A877E');
    expect(CORE_PLACEHOLDERS['typography.primary']).toBe('system-ui');
  });
});

describe('placeholders sit below the canonical projection', () => {
  const brand = { onboarding: buildCreateInput({ name: 'Meridian' }).onboarding };

  it('are visible as placeholders, not as Core values', () => {
    expect(isPlaceholderPath(brand, 'colors.primary')).toBe(true);
    expect(isPlaceholderPath(brand, 'typography.primary')).toBe(true);
    expect(isPlaceholderPath(brand, 'strategy.mission')).toBe(false);
  });

  it('carry NO Core metadata — nobody has claimed them', () => {
    // Nothing writes identityMeta for these paths, so they read as the
    // documented default rather than as anything a user or machine decided.
    const meta = coreValueMeta(undefined, 'colors.primary');
    expect(meta.promotedBy).toBeUndefined();
    expect(meta.setBy).toBeNull();
  });

  it('a brand holding placeholders is undecided', () => {
    expect(isUndecided(brand)).toBe(true);
    expect(isUndecided({ onboarding: startedState('existing', []) })).toBe(false);
  });

  it('a placeholder is dropped the moment a real value is written', () => {
    const state = readOnboardingState(brand)!;
    const next = clearPlaceholders(state, ['colors.primary']);
    expect(next!.placeholders).toEqual(['typography.primary']);
    expect(isPlaceholderPath({ onboarding: next! }, 'colors.primary')).toBe(false);
  });

  it('clearing the last one leaves nothing behind', () => {
    const state = readOnboardingState(brand)!;
    const next = clearPlaceholders(state, ['colors.primary', 'typography.primary']);
    expect(placeholderPaths({ onboarding: next! })).toEqual([]);
  });

  it('clearing something not held is a no-op the caller can skip', () => {
    const state = readOnboardingState(brand)!;
    expect(clearPlaceholders(state, ['voice.tone'])).toBeNull();
  });

  it('brands with no marker hold no placeholders', () => {
    expect(placeholderPaths({})).toEqual([]);
    expect(isPlaceholderPath(null, 'colors.primary')).toBe(false);
  });
});

describe('a placeholder is never proposed', () => {
  it('nothing supplied produces no proposals at all', () => {
    // The decisive check: proposals come from supplied material and supplied
    // text only. A placeholder in the brand record cannot become one, because
    // interpretation never reads the brand.
    return expect(interpret({ items: [] }, {})).resolves.toEqual([]);
  });

  it('proposes only what the user actually supplied', async () => {
    const out = await interpret(
      {
        items: [{
          id: 'c', name: '#1C3F5E', sub: '', kind: 'color', value: '#1C3F5E',
          previewUrl: null, uploadStatus: 'done', uploadProgress: 1,
        }],
      },
      {},
    );
    expect(out.map((p) => p.corePath)).toEqual(['colors.primary']);
    expect((out[0].value as { hex: string }).hex).toBe('#1C3F5E');
    expect((out[0].value as { hex: string }).hex).not.toBe(CORE_PLACEHOLDERS['colors.primary']);
  });
});

describe('normalizeUrl accepts what people type', () => {
  it('adds a scheme when missing', () => {
    expect(normalizeUrl('meridian.co')).toBe('https://meridian.co');
  });
  it('leaves an explicit scheme alone', () => {
    expect(normalizeUrl('http://meridian.co')).toBe('http://meridian.co');
  });
  it('empty stays empty — never a fabricated URL', () => {
    expect(normalizeUrl('  ')).toBe('');
  });
});
