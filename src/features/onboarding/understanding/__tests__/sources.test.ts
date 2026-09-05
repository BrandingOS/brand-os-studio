/**
 * Source priority — the rule that decides which value wins.
 *
 * The whole point of putting this in one function is that it becomes a
 * PROPERTY rather than a convention. So the tests exercise the full rank
 * matrix, and the decisive one is idempotence: re-running understanding must
 * never let a suggestion displace something the user chose.
 */
import { describe, it, expect } from 'vitest';
import { RANK, mergeCandidates, type Candidate } from '../sources';

const c = (rank: Candidate['rank'], value: unknown, evidence = 'x'): Candidate => ({
  corePath: 'colors.primary',
  value,
  rank,
  evidence,
  provenance: 'inferred',
});

describe('the rank matrix', () => {
  const ranks = [RANK.ai, RANK.brief, RANK.uploaded, RANK.user];

  it('the highest rank always survives, whatever the order', () => {
    for (const a of ranks) {
      for (const b of ranks) {
        const out = mergeCandidates([c(a, `v${a}`), c(b, `v${b}`)]);
        expect(out).toHaveLength(1);
        expect(out[0].value).toBe(`v${Math.max(a, b)}`);
      }
    }
  });

  it('a tie breaks by arrival order, deterministically', () => {
    const out = mergeCandidates([c(RANK.brief, 'first'), c(RANK.brief, 'second')]);
    expect(out[0].value).toBe('first');
  });

  it('user choice is never overwritten', () => {
    const out = mergeCandidates([c(RANK.user, 'mine'), c(RANK.uploaded, 'theirs'), c(RANK.ai, 'guess')]);
    expect(out[0].value).toBe('mine');
  });

  it('uploaded evidence beats the brief — the logo outranks what was written', () => {
    const out = mergeCandidates([c(RANK.brief, '#111111'), c(RANK.uploaded, '#AABBCC')]);
    expect(out[0].value).toBe('#AABBCC');
  });

  it('an AI suggestion loses to everything', () => {
    for (const above of [RANK.brief, RANK.uploaded, RANK.user]) {
      expect(mergeCandidates([c(RANK.ai, 'guess'), c(above, 'real')])[0].value).toBe('real');
    }
  });
});

describe('re-running understanding is safe by construction', () => {
  it('a second pass cannot displace a higher-ranked value', () => {
    const first = mergeCandidates([c(RANK.user, 'mine')]);
    // Whatever a later pass proposes, merging it back in changes nothing.
    const second = mergeCandidates([
      { ...first[0], rank: RANK.user } as Candidate,
      c(RANK.ai, 'guess'),
      c(RANK.brief, 'written'),
    ]);
    expect(second[0].value).toBe('mine');
  });
});

describe('empty values are not proposals', () => {
  it('drops undefined, null, blank strings and empty arrays', () => {
    expect(mergeCandidates([c(RANK.user, undefined)])).toEqual([]);
    expect(mergeCandidates([c(RANK.user, null)])).toEqual([]);
    expect(mergeCandidates([c(RANK.user, '   ')])).toEqual([]);
    expect(mergeCandidates([c(RANK.user, [])])).toEqual([]);
  });
});

describe('shape', () => {
  it('carries provenance and evidence through untouched', () => {
    const out = mergeCandidates([
      { corePath: 'voice.tone', value: 'calm', rank: RANK.brief, evidence: 'your brand profile', provenance: 'ai-suggested' },
    ]);
    expect(out[0]).toEqual({
      corePath: 'voice.tone',
      value: 'calm',
      provenance: 'ai-suggested',
      evidence: 'your brand profile',
    });
  });
});

describe('the website ladder (Gate 1, 2026-09-06)', () => {
  it('explicit user-authored facts outrank uploads, the website and the brief', () => {
    for (const below of [RANK.uploaded, RANK.website, RANK.brief, RANK.websiteInferred, RANK.generated]) {
      expect(mergeCandidates([c(below, 'theirs'), c(RANK.authored, 'mine')])[0].value).toBe('mine');
    }
  });

  it('an uploaded asset outranks anything scraped from the website', () => {
    expect(mergeCandidates([c(RANK.website, 'scraped'), c(RANK.uploaded, 'uploaded')])[0].value).toBe('uploaded');
  });

  it('a fact found on the website outranks the AI-written brief', () => {
    expect(mergeCandidates([c(RANK.brief, 'the brief'), c(RANK.website, 'the site')])[0].value).toBe('the site');
  });

  it('the brief outranks what the model inferred from the website', () => {
    expect(mergeCandidates([c(RANK.websiteInferred, 'guess'), c(RANK.brief, 'the brief')])[0].value).toBe('the brief');
  });

  it('a website inference still outranks generated fallback', () => {
    expect(mergeCandidates([c(RANK.generated, 'filler'), c(RANK.websiteInferred, 'guess')])[0].value).toBe('guess');
  });

  it('the ladder is strictly ordered and `ai` is the generated tier', () => {
    expect(RANK.ai).toBe(RANK.generated);
    expect(RANK.generated).toBeLessThan(RANK.websiteInferred);
    expect(RANK.websiteInferred).toBeLessThan(RANK.brief);
    expect(RANK.brief).toBeLessThan(RANK.website);
    expect(RANK.website).toBeLessThan(RANK.uploaded);
    expect(RANK.uploaded).toBeLessThan(RANK.authored);
    expect(RANK.authored).toBeLessThan(RANK.user);
  });
});
