import { describe, expect, it } from 'vitest';
import { heuristicParse } from './parseDescription';

const AI_STYLE_DOC = `# Brand Purpose
Creating unforgettable social experiences that bring people back together.

---

## Mission
To bring people back together through unforgettable social experiences.

---

## Vision
To become the world's most recognizable social gaming brand, creating experiences that connect millions of people beyond screens.

---

## Target Audience
Young adults 18-30 who crave real-world connection and playful competition.

---

## Tone of Voice
Energetic, playful, and inclusive — never corporate.

---

## Core Values
Connection, play, authenticity.

## Brand Promise
Every visit ends with a story worth telling.`;

describe('heuristicParse', () => {
  it('splits an AI-generated markdown doc into one section per heading', () => {
    const sections = heuristicParse(AI_STYLE_DOC);
    const titles = sections.map((s) => s.title);

    expect(titles).toContain('Mission');
    expect(titles).toContain('Vision');
    expect(titles).toContain('Audience');
    expect(titles).toContain('Voice');
    expect(titles).toContain('Values');
    // Unrecognized headings survive as custom sections with their own title
    expect(titles).toContain('Brand Promise');
  });

  it('does not cram trailing content into the previous section', () => {
    const sections = heuristicParse(AI_STYLE_DOC);
    const vision = sections.find((s) => s.key === 'vision');
    expect(vision?.content).not.toContain('Target Audience');
    expect(vision?.content).not.toContain('---');
    expect(vision?.content).not.toContain('#');
  });

  it('maps "Brand Purpose" to mission and merges with an explicit Mission heading', () => {
    const sections = heuristicParse(AI_STYLE_DOC);
    const missions = sections.filter((s) => s.key === 'mission');
    expect(missions).toHaveLength(1);
    expect(missions[0].content).toContain('Creating unforgettable');
    expect(missions[0].content).toContain('To bring people back together');
  });

  it('handles bold and inline-colon headings', () => {
    const sections = heuristicParse(
      '**Mission:** Help teams ship faster.\nTarget Audience: Busy engineering managers.',
    );
    expect(sections.find((s) => s.key === 'mission')?.content).toBe('Help teams ship faster.');
    expect(sections.find((s) => s.key === 'audience')?.content).toBe(
      'Busy engineering managers.',
    );
  });

  it('does not treat normal sentences containing colons as headings', () => {
    const sections = heuristicParse(
      '## Mission\nOur promise is simple: we show up. We keep going even when the market shifts dramatically over time: resilience matters.',
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('mission');
    expect(sections[0].content).toContain('we show up');
  });

  it('falls back to sentence sniffing when there are no headings', () => {
    const sections = heuristicParse(
      'Our mission is to make coffee accessible. We serve busy young professionals.',
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.some((s) => s.key === 'mission')).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(heuristicParse('')).toEqual([]);
    expect(heuristicParse('   \n  ')).toEqual([]);
  });
});
