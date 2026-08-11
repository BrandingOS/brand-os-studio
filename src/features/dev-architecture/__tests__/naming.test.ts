import { describe, expect, it } from 'vitest';

import { deriveName, disambiguate, humanizeComponent, humanizeSegment } from '../naming';

describe('humanizeSegment', () => {
  it('title-cases hyphenated segments', () => {
    expect(humanizeSegment('brand-kit')).toBe('Brand Kit');
  });

  it('keeps known initialisms upper-case', () => {
    expect(humanizeSegment('ui-color-system')).toBe('UI Color System');
    expect(humanizeSegment('logo-to-svg')).toBe('Logo To SVG');
    expect(humanizeSegment('dam')).toBe('DAM');
  });

  it('keeps version tokens lower-case', () => {
    expect(humanizeSegment('deck-v2')).toBe('Deck v2');
  });
});

describe('humanizeComponent', () => {
  it('splits Pascal case and drops the Page suffix', () => {
    expect(humanizeComponent('BrandDesignEditorPage')).toBe('Brand Design Editor');
    expect(humanizeComponent('AdminTemplatesQueuePage')).toBe('Admin Templates Queue');
  });

  it('keeps runs of capitals together', () => {
    expect(humanizeComponent('UIColorSystemPage')).toBe('UI Color System');
  });

  it('drops the Screen suffix used by flow steps', () => {
    expect(humanizeComponent('ModeSelectScreen')).toBe('Mode Select');
  });
});

describe('deriveName', () => {
  it('names a route from its last static segment', () => {
    expect(deriveName('/b/:slug/setup', 'BrandSetupPageV2')).toBe('Setup');
  });

  it('names the root Home', () => {
    expect(deriveName('/', 'IndexPage')).toBe('Home');
  });

  it('falls back to the component when the tail is dynamic', () => {
    expect(deriveName('/b/:slug/design/:designSlug', 'BrandDesignEditorPage')).toBe(
      'Brand Design Editor',
    );
  });

  it('falls back to the component for a splat', () => {
    expect(deriveName('/b/:slug/*', 'StudioToClassicFallback')).toBe('Studio To Classic Fallback');
  });

  it('prefers the component for an index route, whose path names its parent', () => {
    expect(deriveName('/logo-maker', 'ModeSelectScreen', { isIndex: true })).toBe('Mode Select');
  });

  it('ignores router primitives that describe nothing', () => {
    // `<Navigate>` as an index element — the URL is the only real information.
    expect(deriveName('/settings', 'Navigate', { isIndex: true })).toBe('Settings');
  });

  it('uses the last static segment when there is no component', () => {
    expect(deriveName('/b/:slug/tools/:toolId', null)).toBe('Tools');
  });
});

describe('disambiguate', () => {
  it('leaves a unique name alone', () => {
    expect(disambiguate('Setup', '/b/:slug/setup', ['/b/:slug/setup'])).toBe('Setup');
  });

  it('prefixes the distinguishing ancestor segment on a collision', () => {
    const colliding = ['/b/:slug/tools/typescale', '/b/:slug/guides/typescale'];
    expect(disambiguate('Typescale', '/b/:slug/tools/typescale', colliding)).toBe(
      'Tools · Typescale',
    );
  });

  it('returns the plain name when paths cannot disambiguate', () => {
    // Same depth, same segments — only the URL differs, which the UI always shows.
    expect(disambiguate('Login', '/login', ['/login', '/signup'])).toBe('Login');
  });
});
