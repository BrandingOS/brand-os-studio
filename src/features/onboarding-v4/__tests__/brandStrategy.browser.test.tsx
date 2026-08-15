/**
 * A brand has a strategy whether or not anything filled it in.
 *
 * The section used to be built from whatever the understanding pass returned,
 * so a user who skipped the prompt arrived at one button — "New section" — and
 * had to invent the idea of an audience before they could name one. The fields
 * are fixed now; what varies is only whether they are answered.
 *
 * A CARD is something the brand says, so only answered fields get one. The rest
 * live inside "New section", which is where the eye already goes to add
 * something — eleven empty cards is a form, and a form is not a review.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AboutGroup } from '../panels/AboutGroup';
import { ValuePicker } from '../panels/ValuePicker';
import { useV4Store } from '../store/onboardingV4Store';
import type { Projection } from '@/features/onboarding/bridge/v4Bridge';

const EXPECTED = [
  'Brand summary',
  'Industry',
  'Products / Services',
  'Audience',
  'Positioning',
  'Mission',
  'Personality',
  'Tone',
  'Visual style',
  'Core values',
  'Slogan',
];

const empty = (over: Partial<Projection> = {}): Projection => ({
  colors: [],
  fonts: [],
  logoSlots: [],
  duplicateIds: [],
  slogan: '',
  styleLabels: [],
  profile: [],
  business: {},
  ...over,
});

const names = () =>
  [...document.querySelectorAll('.about-card-name')].map((e) => e.textContent);

beforeEach(() => useV4Store.getState().reset());
afterEach(cleanup);

/** The chips the New-section modal offers. */
const offered = () =>
  [...document.querySelectorAll('.about-suggestion-chip')].map((e) => e.textContent);

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /new section/i }));

describe('the fields exist before the answers do', () => {
  it('draws no card for a field with nothing in it', () => {
    render(<AboutGroup projection={null} />);
    expect(names()).toEqual([]);
  });

  it('keeps every one of them a click away', () => {
    render(<AboutGroup projection={empty()} />);
    openMenu();
    expect(offered()).toEqual(EXPECTED);
  });

  it('shows the ones that were answered, and offers only the rest', () => {
    render(
      <AboutGroup
        projection={empty({
          profile: [{ path: 'strategy.mission', value: 'Ship the thing' }],
        })}
      />,
    );
    expect(names()).toEqual(['Mission']);
    openMenu();
    expect(offered()).not.toContain('Mission');
    expect(offered()).toContain('Audience');
  });

  it('counts what is answered, not what is on screen', () => {
    render(
      <AboutGroup
        projection={empty({
          profile: [{ path: 'strategy.mission', value: 'Ship the thing' }],
          business: { industry: 'technology' },
          industryLabel: 'Technology',
        })}
      />,
    );
    expect(document.querySelector('.review-group-count')?.textContent).toBe('2 of 11 answered');
  });

  it('is called Brand Strategy', () => {
    render(<AboutGroup projection={null} />);
    expect(screen.getByRole('heading', { name: 'Brand Strategy' })).toBeTruthy();
  });

  it('still takes a section of the user’s own', () => {
    // The modal is the one this flow always had: a name, some words, Save.
    render(<AboutGroup projection={null} />);
    openMenu();
    expect(document.querySelector('input[placeholder*="Audience"]')).toBeTruthy();
    expect(document.querySelector('textarea')).toBeTruthy();
  });
});

describe('choices where they fit, prose where they do not', () => {
  const open = (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: /new section/i }));
    const chip = [...document.querySelectorAll('.about-suggestion-chip')].find(
      (e) => e.textContent === label,
    ) as HTMLElement;
    fireEvent.click(chip);
  };

  it('asks for words where the meaning is in the wording', () => {
    render(<AboutGroup projection={null} />);
    for (const field of ['Brand summary', 'Audience', 'Positioning', 'Mission', 'Products / Services']) {
      open(field);
      expect(document.querySelector('.value-picker-text')).toBeTruthy();
      fireEvent.click(document.querySelector('.value-picker-cancel')!);
    }
  });

  it('offers the vocabulary where one genuinely exists', () => {
    render(<AboutGroup projection={null} />);
    for (const field of ['Industry', 'Personality', 'Tone', 'Visual style', 'Core values']) {
      open(field);
      expect(document.querySelectorAll('.value-picker-chips .about-chip').length).toBeGreaterThan(1);
      fireEvent.click(document.querySelector('.value-picker-cancel')!);
    }
  });
});

describe('no list covers every brand', () => {
  const picker = (vocab: 'tone' | 'style', onSave: (next: unknown) => void = () => {}) =>
    render(
      <ValuePicker
        theme="light"
        target={{ kind: 'core', path: 'voice.tone', label: 'Tone', vocab, selected: [] }}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

  it('takes a word of the user’s own and keeps it verbatim', () => {
    let saved: unknown;
    picker('tone', (next) => {
      saved = next;
    });
    fireEvent.change(document.querySelector('.value-picker-other-input')!, {
      target: { value: 'Wry' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Wry' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved).toBe('Wry');
  });

  it('selects the existing member when the word is already one', () => {
    let saved: unknown;
    picker('tone', (next) => {
      saved = next;
    });
    fireEvent.change(document.querySelector('.value-picker-other-input')!, {
      target: { value: 'warm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // The id, not the typing — two spellings of one choice are one choice.
    expect(saved).toBe('warm');
  });

  it('does not offer it for visual style, which the schema closes', () => {
    // `visualStyle.descriptors` is a closed union. A word stored there would
    // fail validation and cost the whole save, so the option is not offered
    // rather than offered and then refused.
    picker('style');
    expect(document.querySelector('.value-picker-other')).toBeNull();
  });
});
