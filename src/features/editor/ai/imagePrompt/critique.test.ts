import { describe, expect, it, vi } from 'vitest';
import {
  critiqueBatch,
  critiqueDecision,
  rankCandidates,
  noCritique,
  CRITIQUE_DIMENSIONS,
  type CandidateCritique,
  type DecisionContext,
} from './critique';

const scores = (n: number) => Object.fromEntries(
  CRITIQUE_DIMENSIONS.map((d) => [d, n]),
) as CandidateCritique['scores'];

const candidate = (patch: Partial<CandidateCritique> = {}): CandidateCritique => ({
  index: 0,
  scores: scores(4),
  overall: 0.75,
  hardFailures: [],
  note: '',
  ...patch,
});

const ctx = (patch: Partial<DecisionContext> = {}): DecisionContext => ({
  attempt: 0, maxAttempts: 2, creditsLeft: 100, costPerAttempt: 14, repairEnabled: true, ...patch,
});

const answer = (obj: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });
const passthroughDownscale = async (s: string) => `data:image/jpeg;base64,${btoa(s).slice(0, 24)}`;

describe('critiqueDecision — the policy that spends money', () => {
  it('accepts a candidate that meets the bar', () => {
    expect(critiqueDecision(candidate(), ctx()).action).toBe('accept');
  });

  it('repairs on an objective hard failure', () => {
    const d = critiqueDecision(candidate({ hardFailures: ['misspelled-copy'] }), ctx());
    expect(d.action).toBe('repair');
    expect(d.reason).toMatch(/misspelled-copy/);
  });

  it('repairs when the mean falls below the bar', () => {
    expect(critiqueDecision(candidate({ scores: scores(2) }), ctx()).action).toBe('repair');
  });

  it('repairs when any single dimension bottoms out, however good the mean', () => {
    const mixed = { ...scores(5), typography: 1 } as CandidateCritique['scores'];
    expect(critiqueDecision(candidate({ scores: mixed }), ctx()).action).toBe('repair');
  });

  it('DELIVERS rather than withholds on the last attempt', () => {
    // Never leave someone with nothing after they have paid.
    const d = critiqueDecision(candidate({ scores: scores(1) }), ctx({ attempt: 1, maxAttempts: 2 }));
    expect(d.action).toBe('accept-anyway');
  });

  it('never spends credits the user does not have', () => {
    const d = critiqueDecision(candidate({ hardFailures: ['mangled-logo'] }), ctx({ creditsLeft: 3, costPerAttempt: 14 }));
    expect(d.action).toBe('accept-anyway');
    expect(d.reason).toMatch(/not enough credits/i);
  });

  it('does nothing but flag while repair is disabled', () => {
    // Ships as ranking-only until the critic is calibrated on real traffic.
    const d = critiqueDecision(candidate({ scores: scores(1) }), ctx({ repairEnabled: false }));
    expect(d.action).toBe('accept');
    expect(d.reason).toMatch(/repair is not enabled/i);
  });
});

describe('rankCandidates', () => {
  it('puts the unbroken ones first, then the best scoring', () => {
    const out = rankCandidates([
      candidate({ index: 0, overall: 0.9, hardFailures: ['second-logo'] }),
      candidate({ index: 1, overall: 0.4 }),
      candidate({ index: 2, overall: 0.8 }),
    ]);
    expect(out.map((c) => c.index)).toEqual([2, 1, 0]);
  });

  it('is stable, so equal candidates keep the order they arrived in', () => {
    const out = rankCandidates([
      candidate({ index: 0 }), candidate({ index: 1 }), candidate({ index: 2 }),
    ]);
    expect(out.map((c) => c.index)).toEqual([0, 1, 2]);
  });
});

describe('critiqueBatch — a broken judge must cost nothing', () => {
  const input = {
    images: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
    userPrompt: 'poster for our launch',
    kind: 'design' as const,
    deliverable: 'poster',
    logoExpected: true,
    paletteHexes: ['#6B46FF'],
  };

  it('scores a whole batch in ONE call', async () => {
    const call = vi.fn().mockResolvedValue(answer({
      candidates: [
        { index: 0, scores: { finished: 5, typography: 5, logo: 5, colour: 4, composition: 5, brief: 5 }, hardFailures: [], note: 'Strong.' },
        { index: 1, scores: { finished: 2, typography: 1, logo: 3, colour: 3, composition: 2, brief: 3 }, hardFailures: ['misspelled-copy'], note: 'Headline misspelled.', amendment: 'Set the headline to exactly "Launch".' },
      ],
    }));
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale });
    expect(call).toHaveBeenCalledTimes(1);
    expect(out.unavailable).toBe(false);
    expect(out.candidates[0].overall).toBeGreaterThan(out.candidates[1].overall);
    expect(out.candidates[1].hardFailures).toEqual(['misspelled-copy']);
    expect(out.candidates[1].amendment).toMatch(/exactly "Launch"/);
  });

  it('accepts everything when the critic throws', async () => {
    const call = vi.fn().mockRejectedValue(new Error('proxy down'));
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale });
    expect(out.unavailable).toBe(true);
    expect(out.candidates).toHaveLength(2);
    expect(out.candidates.every((c) => c.hardFailures.length === 0)).toBe(true);
  });

  it('accepts everything when the critic times out', async () => {
    const call = vi.fn().mockImplementation(() => new Promise(() => { /* never */ }));
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale, timeoutMs: 20 });
    expect(out.unavailable).toBe(true);
  });

  it('accepts everything on an empty answer — the proxy mock has no key', async () => {
    const call = vi.fn().mockResolvedValue({ content: [] });
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale });
    expect(out.unavailable).toBe(true);
  });

  it('accepts everything when the answer is not JSON', async () => {
    const call = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'I think they look nice!' }] });
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale });
    expect(out.unavailable).toBe(true);
  });

  it('does not call the model at all when no image could be read', async () => {
    const call = vi.fn();
    const out = await critiqueBatch(input, { call, downscale: async () => null });
    expect(call).not.toHaveBeenCalled();
    expect(out.unavailable).toBe(true);
  });

  it('ignores a failure label it does not recognise, and clamps a wild score', async () => {
    const call = vi.fn().mockResolvedValue(answer({
      candidates: [
        { index: 0, scores: { finished: 99, typography: -4, logo: 3, colour: 3, composition: 3, brief: 3 }, hardFailures: ['vibes-are-off'], note: '' },
      ],
    }));
    const out = await critiqueBatch({ ...input, images: ['data:image/png;base64,AAA'] }, { call, downscale: passthroughDownscale });
    expect(out.candidates[0].scores.finished).toBe(5);
    expect(out.candidates[0].scores.typography).toBe(1);
    expect(out.candidates[0].hardFailures).toEqual([]);
  });

  it('fills in a candidate the critic forgot rather than dropping it', async () => {
    const call = vi.fn().mockResolvedValue(answer({
      candidates: [{ index: 0, scores: { finished: 5, typography: 5, logo: 5, colour: 5, composition: 5, brief: 5 }, hardFailures: [], note: '' }],
    }));
    const out = await critiqueBatch(input, { call, downscale: passthroughDownscale });
    expect(out.candidates).toHaveLength(2);
    expect(out.candidates[1].hardFailures).toEqual([]);
  });

  it('tells the critic exactly which words were meant to be set', async () => {
    const call = vi.fn().mockResolvedValue(answer({ candidates: [] }));
    await critiqueBatch(
      { ...input, copy: { headline: 'Same day', cta: 'Book now' } },
      { call, downscale: passthroughDownscale },
    );
    const blocks = call.mock.calls[0][0].messages[0].content as Array<{ type: string; text?: string }>;
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    expect(text).toContain('"Same day"');
    expect(text).toContain('"Book now"');
    expect(text).toMatch(/A REAL LOGO WAS SUPPLIED/);
  });

  it('noCritique claims nothing', () => {
    const out = noCritique(3);
    expect(out.unavailable).toBe(true);
    expect(out.candidates).toHaveLength(3);
    expect(out.candidates.every((c) => c.overall === 0.5)).toBe(true);
  });
});
