import { describe, expect, it } from 'vitest';

import type { OnboardingAsset } from '../types';
import { groupFontAssets, parseFontName, weightsSummary } from './fontFamily';

function font(name: string, source: OnboardingAsset['fontSource'] = 'upload'): OnboardingAsset {
  return {
    id: name,
    name,
    sub: 'TTF · 100 KB',
    kind: 'font',
    fontSource: source,
    previewUrl: null,
    uploadStatus: 'done',
    uploadProgress: 1,
  };
}

describe('parseFontName', () => {
  it('splits hyphenated weight suffixes', () => {
    expect(parseFontName('Alexandria-Bold.ttf')).toMatchObject({ family: 'Alexandria', weight: 'Bold', rank: 700 });
    expect(parseFontName('Alexandria-ExtraLight.ttf')).toMatchObject({ weight: 'ExtraLight', rank: 200 });
  });

  it('handles underscores and optical-size markers', () => {
    const parsed = parseFontName('BricolageGrotesque_24pt-SemiBold.ttf');
    expect(parsed.family).toBe('Bricolage Grotesque 24pt');
    expect(parsed.weight).toBe('SemiBold');
    expect(parsed.rank).toBe(600);
  });

  it('splits camelCase weights and keeps italic', () => {
    expect(parseFontName('Roboto-BoldItalic.otf')).toMatchObject({ family: 'Roboto', weight: 'Bold Italic', rank: 700 });
    expect(parseFontName('Roboto-Italic.otf')).toMatchObject({ family: 'Roboto', weight: 'Italic', rank: 400 });
  });

  it('reads numeric weights', () => {
    expect(parseFontName('Inter_500.woff2')).toMatchObject({ weight: '500', rank: 500 });
  });

  it('keeps width tokens in the family', () => {
    const parsed = parseFontName('RobotoCondensed-Bold.ttf');
    expect(parsed.family).toBe('Roboto Condensed');
    expect(parsed.weight).toBe('Bold');
  });

  it('falls back to the whole stem when there is no weight', () => {
    expect(parseFontName('MyBrandFont.ttf')).toMatchObject({ family: 'My Brand Font', weight: '' });
  });
});

describe('groupFontAssets', () => {
  it('collapses weights of one family into a single group', () => {
    const groups = groupFontAssets([
      font('Alexandria-Bold.ttf'),
      font('Alexandria-ExtraLight.ttf'),
      font('BricolageGrotesque_24pt-Light.ttf'),
      font('BricolageGrotesque_24pt-Medium.ttf'),
      font('BricolageGrotesque_24pt-Regular.ttf'),
      font('BricolageGrotesque_24pt-SemiBold.ttf'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.assets.length)).toEqual([2, 4]);
  });

  it('sorts weights light → heavy and leads with Regular', () => {
    const [group] = groupFontAssets([
      font('Acme-Bold.ttf'),
      font('Acme-Light.ttf'),
      font('Acme-Regular.ttf'),
    ]);
    expect(group.weights.map((w) => w.weight)).toEqual(['Light', 'Regular', 'Bold']);
    expect(group.lead.name).toBe('Acme-Regular.ttf');
    expect(weightsSummary(group)).toBe('Light · Regular · Bold');
  });

  it('collapses optical sizes of the same typeface', () => {
    const groups = groupFontAssets([
      font('BricolageGrotesque_14pt-Bold.ttf'),
      font('BricolageGrotesque_24pt-Bold.ttf'),
    ]);
    expect(groups).toHaveLength(1);
  });

  it('never splits a Google font on a weight-looking word', () => {
    const groups = groupFontAssets([font('Black Ops One', 'google')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].family).toBe('Black Ops One');
  });
});
