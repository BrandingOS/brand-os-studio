import { describe, expect, it } from 'vitest';
import { BRIEF_PROMPT_SENTINELS, buildBriefPrompt } from '../prompt';
import { countBriefSections, looksLikeBriefPrompt } from '../parseBrief';

describe('the brief prompt cannot be pasted back as an answer', () => {
  it('every sentinel is really in the built prompt', () => {
    const prompt = buildBriefPrompt('Raqm');
    for (const s of BRIEF_PROMPT_SENTINELS) expect(prompt).toContain(s);
  });
  it('recognises the whole prompt, in either asset mode', () => {
    expect(looksLikeBriefPrompt(buildBriefPrompt('Raqm'))).toBe(true);
    expect(looksLikeBriefPrompt(buildBriefPrompt('Raqm', { colors: ['#123456'], fonts: ['Inter'], hasLogo: true }))).toBe(true);
  });
  it('does not fire on a real reply', () => {
    expect(looksLikeBriefPrompt('Brand summary: Raqm is a fintech.\nIndustry: Technology\nTone: Confident')).toBe(false);
    expect(looksLikeBriefPrompt('We sell coffee to students in Cairo.')).toBe(false);
  });
});

describe('countBriefSections', () => {
  it('counts answered labels once each', () => {
    expect(countBriefSections('Brand summary: a\nIndustry: b\nIndustry: c\nTone:\n')).toBe(2);
  });
});
