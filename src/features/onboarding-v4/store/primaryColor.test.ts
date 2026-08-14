import { beforeEach, describe, expect, it } from 'vitest';

import { useV4Store } from './onboardingV4Store';
import type { OnboardingAsset } from '../types';

function color(id: string, hex: string): OnboardingAsset {
  return {
    id,
    name: hex,
    sub: 'Color',
    kind: 'color',
    value: hex,
    previewUrl: null,
    uploadStatus: 'done',
    uploadProgress: 1,
  };
}

describe('primary color tagging', () => {
  beforeEach(() => {
    useV4Store.getState().reset();
    useV4Store.getState().addAsset(color('c1', '#FF0000'));
    useV4Store.getState().addAsset(color('c2', '#00FF00'));
  });

  it('starts untagged so the first swatch is the implicit primary', () => {
    expect(useV4Store.getState().primaryColorId).toBeNull();
  });

  it('tags a color as primary', () => {
    useV4Store.getState().setPrimaryColor('c2');
    expect(useV4Store.getState().primaryColorId).toBe('c2');
  });

  it('toggles the tag off when the same color is clicked again', () => {
    useV4Store.getState().setPrimaryColor('c2');
    useV4Store.getState().setPrimaryColor('c2');
    expect(useV4Store.getState().primaryColorId).toBeNull();
  });

  it('clears the tag when the primary swatch is deleted', () => {
    useV4Store.getState().setPrimaryColor('c2');
    useV4Store.getState().removeAsset('c2');
    expect(useV4Store.getState().primaryColorId).toBeNull();
  });

  it('keeps the tag when a different swatch is deleted', () => {
    useV4Store.getState().setPrimaryColor('c2');
    useV4Store.getState().removeAsset('c1');
    expect(useV4Store.getState().primaryColorId).toBe('c2');
  });

  it('clears the tag on Clear all', () => {
    useV4Store.getState().setPrimaryColor('c2');
    useV4Store.getState().clearAssets();
    expect(useV4Store.getState().primaryColorId).toBeNull();
  });
});
