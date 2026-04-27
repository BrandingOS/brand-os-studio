/**
 * Tests for the script-to-deck pipeline. We mock `fetch` (which the
 * pipeline uses to hit the Anthropic REST endpoint directly) with a
 * canned valid JSON response, then verify:
 *
 *   - The Deck shape is correct (id, origin, slide count, layouts).
 *   - Repeated calls with the same input use the localStorage cache and
 *     do NOT invoke fetch a second time.
 *   - Missing API key throws the documented friendly error.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateDeckFromScript } from '../generateDeckFromScript';
import type { Brand } from '@/shared/types/brand';

const FIXTURE_RESPONSE = {
  title: 'Uniex',
  slides: [
    {
      section: 'Intro',
      layout: 'cover',
      blocks: {
        title: { kind: 'text', text: 'Choose Your Future', role: 'display' },
        subtitle: { kind: 'text', text: 'Real students. Real majors.', role: 'h3' },
      },
    },
    {
      section: 'Problem',
      layout: 'title-body',
      blocks: {
        title: { kind: 'text', text: 'Marketing Beats Reality', role: 'h1' },
        body: {
          kind: 'text',
          text: 'High schoolers pick majors based on ads, not the day-to-day reality of the field.',
          role: 'body',
        },
      },
    },
    {
      section: 'Solution',
      layout: 'two-column',
      blocks: {
        title: { kind: 'text', text: 'Two Tools, One Decision', role: 'h1' },
        leftTitle: { kind: 'text', text: 'Athar', role: 'h3' },
        leftBody: { kind: 'text', text: 'Aptitude test built for clarity', role: 'body' },
        rightTitle: { kind: 'text', text: 'Uniex', role: 'h3' },
        rightBody: { kind: 'text', text: 'Real students share their major lives', role: 'body' },
      },
    },
    {
      section: 'Traction',
      layout: 'stats-3',
      blocks: {
        title: { kind: 'text', text: 'Growing Fast', role: 'h1' },
        stat1: { kind: 'stat', value: '8,000+', label: 'users' },
        stat2: { kind: 'stat', value: '60+', label: 'schools' },
        stat3: { kind: 'stat', value: '3', label: 'cohorts' },
      },
    },
    {
      section: 'Ask',
      layout: 'cta',
      blocks: {
        title: { kind: 'text', text: "Let's Build It", role: 'display' },
        subtitle: { kind: 'text', text: 'Join the waitlist', role: 'h3' },
        primary: { kind: 'text', text: 'Sign up', role: 'label' },
        secondary: { kind: 'text', text: 'Contact us', role: 'label' },
      },
    },
  ],
};

const FAKE_BRAND: Brand = {
  id: 'b-uniex',
  slug: 'uniex',
  name: 'Uniex',
  primaryColor: '#001563',
  fonts: { primary: 'Inter' },
  tone: 'confident, warm',
  audience: 'high school students',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as Brand;

const SCRIPT =
  'Uniex is a platform that helps high school students choose the right university major. We have reached 8,000+ users and 60+ schools.';

function buildFetchMock(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    }),
    text: async () => '',
  } as Response);
}

describe('generateDeckFromScript', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset localStorage so tests don't leak cache between cases.
    localStorage.clear();
    // Stub the api key for the live-call paths.
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('builds a Deck from a canned Claude response', async () => {
    globalThis.fetch = buildFetchMock(FIXTURE_RESPONSE) as typeof fetch;

    const { deck, diagnostics } = await generateDeckFromScript({
      brand: FAKE_BRAND,
      script: SCRIPT,
    });

    expect(deck.brandId).toBe('b-uniex');
    expect(deck.origin).toBe('ai-script');
    expect(deck.scriptSource?.script).toBe(SCRIPT);
    expect(deck.scriptSource?.promptVersion).toBe('v1');
    expect(deck.slides).toHaveLength(5);
    expect(deck.slides[0].layout).toBe('cover');
    expect(deck.slides[deck.slides.length - 1].layout).toBe('cta');
    expect(diagnostics.cached).toBe(false);
    expect(diagnostics.warnings).toEqual([]);
  });

  it('only registers known v2 layouts in the result', async () => {
    globalThis.fetch = buildFetchMock(FIXTURE_RESPONSE) as typeof fetch;

    const { deck } = await generateDeckFromScript({
      brand: FAKE_BRAND,
      script: SCRIPT,
    });
    const validLayouts = new Set([
      'cover', 'section-divider', 'title-body', 'bullets', 'two-column',
      'image-text', 'quote', 'stats-3', 'stats-grid', 'team-grid',
      'process', 'comparison', 'gallery', 'metrics-hero', 'cta',
    ]);
    for (const slide of deck.slides) {
      expect(validLayouts.has(slide.layout)).toBe(true);
    }
  });

  it('skips unknown layouts and emits a warning', async () => {
    const polluted = {
      ...FIXTURE_RESPONSE,
      slides: [
        FIXTURE_RESPONSE.slides[0],
        { section: 'Bogus', layout: 'made-up-id', blocks: {} },
        ...FIXTURE_RESPONSE.slides.slice(1),
      ],
    };
    globalThis.fetch = buildFetchMock(polluted) as typeof fetch;

    const { deck, diagnostics } = await generateDeckFromScript({
      brand: FAKE_BRAND,
      script: SCRIPT,
    });
    expect(deck.slides).toHaveLength(5);
    expect(diagnostics.warnings.some((w) => w.includes('made-up-id'))).toBe(true);
  });

  it('caches the result so repeat calls with same input do not refetch', async () => {
    const fetchMock = buildFetchMock(FIXTURE_RESPONSE);
    globalThis.fetch = fetchMock as typeof fetch;

    const first = await generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT });
    expect(first.diagnostics.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT });
    expect(second.diagnostics.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // still only 1
    // Same logical content (slide count + layouts).
    expect(second.deck.slides.map((s) => s.layout)).toEqual(
      first.deck.slides.map((s) => s.layout),
    );
  });

  it('different templateHint busts the cache', async () => {
    const fetchMock = buildFetchMock(FIXTURE_RESPONSE);
    globalThis.fetch = fetchMock as typeof fetch;

    await generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT, templateHint: 'pitch' });
    await generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT, templateHint: 'launch' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when the API key is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    globalThis.fetch = vi.fn() as typeof fetch;

    await expect(
      generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT }),
    ).rejects.toThrow(/VITE_ANTHROPIC_API_KEY/);
  });

  it('throws with a truncated raw response when JSON is malformed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'this is not JSON{{{' }] }),
      text: async () => '',
    } as Response) as typeof fetch;

    await expect(
      generateDeckFromScript({ brand: FAKE_BRAND, script: SCRIPT }),
    ).rejects.toThrow(/invalid JSON/);
  });
});
