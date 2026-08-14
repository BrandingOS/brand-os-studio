/**
 * Open questions — only what is genuinely missing AND materially useful.
 *
 * The counter-case matters as much as the positive one: someone who pasted a
 * complete brief must not be interrogated about it.
 */
import { describe, it, expect } from 'vitest';
import { MAX_ASKED, deriveQuestions } from '../questions';

const none = new Set<string>();

describe('what gets asked', () => {
  it('a fully-determined brand is asked nothing', () => {
    const answeredCore = new Set([
      'visualStyle.descriptors', 'strategy.personality', 'voice.tone',
      'strategy.values', 'strategy.targetAudience', 'strategy.mission', 'strategy.positioning',
    ]);
    const answeredBusiness = new Set(['industry']);
    expect(deriveQuestions({ answeredCore, answeredBusiness })).toEqual([]);
  });

  it('a name-only brand gets a short, bounded set — never a questionnaire', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none });
    expect(qs.length).toBeLessThanOrEqual(MAX_ASKED);
    expect(qs.length).toBeGreaterThan(0);
  });

  it('asks the most useful things first', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none });
    expect(qs[0].target).toEqual({ concept: 'business', path: 'industry' });
    for (let i = 1; i < qs.length; i++) {
      expect(qs[i - 1].importance).toBeGreaterThanOrEqual(qs[i].importance);
    }
  });

  it('never asks about something already answered', () => {
    const qs = deriveQuestions({
      answeredCore: none,
      answeredBusiness: new Set(['industry']),
    });
    expect(qs.map((q) => q.target.path)).not.toContain('industry');
  });

  it('does not ask for a vision — real, but not worth the attention here', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none }, 20);
    expect(qs.map((q) => q.target.path)).not.toContain('strategy.vision');
  });
});

describe('how it asks', () => {
  it('carries a vocabulary where the concept is categorical', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none }, 20);
    const industry = qs.find((q) => q.target.path === 'industry');
    expect(industry?.vocabulary?.length).toBeGreaterThan(0);
  });

  it('leaves genuinely open concepts without one', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none }, 20);
    const mission = qs.find((q) => q.target.path === 'strategy.mission');
    expect(mission?.vocabulary).toBeUndefined();
  });

  it('never names a field or a schema path to the user', () => {
    const qs = deriveQuestions({ answeredCore: none, answeredBusiness: none }, 20);
    for (const q of qs) {
      expect(q.prompt).not.toMatch(/strategy\.|voice\.|visualStyle\.|corePath/);
      expect(q.prompt.endsWith('?')).toBe(true);
    }
  });
});
