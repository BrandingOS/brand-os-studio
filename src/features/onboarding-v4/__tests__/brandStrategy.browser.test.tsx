/**
 * A brand has a strategy whether or not anything filled it in.
 *
 * The section used to be built from whatever the understanding pass returned,
 * so a user who skipped the prompt arrived at one button — "New section" — and
 * had to invent the idea of an audience before they could name one. The fields
 * are fixed now; what varies is only whether they are answered.
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

describe('the fields exist before the answers do', () => {
  it('shows every strategy field with nothing parsed at all', () => {
    render(<AboutGroup projection={null} />);
    expect(names()).toEqual(EXPECTED);
  });

  it('shows the same fields when the pass returned nothing', () => {
    render(<AboutGroup projection={empty()} />);
    expect(names()).toEqual(EXPECTED);
    expect(document.querySelectorAll('.about-card.is-empty')).toHaveLength(EXPECTED.length);
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

  it('still offers a section of the user’s own', () => {
    render(<AboutGroup projection={null} />);
    expect(screen.getByRole('button', { name: /new section/i })).toBeTruthy();
  });
});

describe('choices where they fit, prose where they do not', () => {
  const open = (label: string) => {
    const card = [...document.querySelectorAll('.about-card')].find((c) =>
      c.querySelector('.about-card-name')?.textContent === label,
    ) as HTMLElement;
    fireEvent.click(card);
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
