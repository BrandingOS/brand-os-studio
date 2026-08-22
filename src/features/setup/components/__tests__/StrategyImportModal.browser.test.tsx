// The import flow end to end, in a real browser: paste → recognise → choose →
// apply. Browser-level because the modal's stylesheet decides what a ticked
// row looks like, and because DsModal renders in place — jsdom would let a
// broken overlay pass.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrategyImportModal } from '../StrategyImportModal';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

const REPLY = [
  'Brand summary: Northwind moves freight for small importers.',
  'Industry: Logistics',
  'Audience: Small businesses',
  'Positioning: Challenger',
  'Mission: To make shipping boring.',
  'Tone: Direct',
].join('\n');

const open = (overrides: Partial<React.ComponentProps<typeof StrategyImportModal>> = {}) => {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <StrategyImportModal
      open
      brandName="Northwind"
      strategy={EMPTY_STRATEGY}
      onClose={onClose}
      onApply={onApply}
      {...overrides}
    />,
  );
  return { ...utils, onApply, onClose };
};

const paste = (text: string) => {
  const ta = document.querySelector('[data-strategy-paste]') as HTMLTextAreaElement;
  fireEvent.change(ta, { target: { value: text } });
  return ta;
};

afterEach(cleanup);

describe('StrategyImportModal', () => {
  it('shows nothing found until something is pasted', () => {
    open();
    expect(document.querySelector('[data-strategy-found]')).toBeNull();
  });

  it('recognises each answer and names it the way the board does', () => {
    open();
    paste(REPLY);
    const found = document.querySelector('[data-strategy-found]');
    expect(found?.getAttribute('data-strategy-found')).toBe('6');
    // Scoped to the results — the ask-chips name every field too.
    const labels = [...found!.querySelectorAll('.sti-label')].map((el) => el.textContent);
    expect(labels).toContain('Brand summary');
    // A vocabulary id is shown as the word a person reads.
    const values = [...found!.querySelectorAll('.sti-value')].map((el) => el.textContent);
    expect(values).toContain('Small businesses');
  });

  it('says so plainly when a paste is not the reply we asked for', () => {
    open();
    paste('just some words about the company');
    expect(document.querySelector('[data-strategy-found]')?.getAttribute('data-strategy-found')).toBe('0');
    expect(screen.getByText(/Nothing recognised yet/)).toBeTruthy();
  });

  // Nothing is written until the user says so — the point of the review step.
  it('applies only the answers still ticked', () => {
    const { onApply } = open();
    paste(REPLY);
    fireEvent.click(document.querySelector('[data-field="tone"]') as HTMLElement);
    fireEvent.click(screen.getByText('Add 5 answers'));
    expect(onApply).toHaveBeenCalledTimes(1);
    const keys = onApply.mock.calls[0][0].map((f: { key: string }) => f.key);
    expect(keys).not.toContain('tone');
    expect(keys).toHaveLength(5);
  });

  it('cannot apply when everything is unticked', () => {
    open();
    paste(REPLY);
    fireEvent.click(screen.getByText('Clear all'));
    const btn = screen.getByText('Add answers').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  // Filling a blank and overwriting a decision are different acts.
  it('warns when an answer would replace one the brand already holds', () => {
    open({ strategy: { ...EMPTY_STRATEGY, mission: 'The old mission.' } });
    paste(REPLY);
    expect(screen.getByText(/replaces .*The old mission\./)).toBeTruthy();
  });

  it('a ticked row reads as ticked, and an unticked one does not', () => {
    open();
    paste(REPLY);
    const row = document.querySelector('[data-field="tone"]') as HTMLElement;
    expect(row.getAttribute('aria-pressed')).toBe('true');
    const tick = row.querySelector('.sti-tick') as HTMLElement;
    const filled = getComputedStyle(tick).backgroundColor;

    fireEvent.click(row);
    expect(row.getAttribute('aria-pressed')).toBe('false');
    expect(getComputedStyle(tick).backgroundColor).not.toBe(filled);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Refusing the prompt, and choosing what to ask about.
// ─────────────────────────────────────────────────────────────────────────
describe('StrategyImportModal — refusing what is not a reply', () => {
  it('names the mistake when the prompt itself is pasted', async () => {
    const { buildStrategyPrompt } = await import('../../strategy/strategyPrompt');
    open();
    paste(buildStrategyPrompt('Northwind'));
    const problem = document.querySelector('[data-problem]');
    expect(problem?.getAttribute('data-problem')).toBe('prompt');
    expect(problem?.textContent).toMatch(/That is the prompt, not the reply/);
  });

  it('cannot be applied when the paste was refused', async () => {
    const { buildStrategyPrompt } = await import('../../strategy/strategyPrompt');
    open();
    paste(buildStrategyPrompt('Northwind'));
    const btn = screen.getByText('Add answers').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('says so when every line is still an instruction', () => {
    open();
    paste(
      'Industry: pick ONE from: Real Estate · Hospitality\nTone: pick ONE from: Formal · Warm\nMission: 1 sentence on why the brand exists — not what it sells.',
    );
    expect(document.querySelector('[data-problem]')?.getAttribute('data-problem')).toBe(
      'unanswered',
    );
  });
});

describe('StrategyImportModal — choosing what to ask about', () => {
  it('asks about everything by default', () => {
    open();
    expect(document.querySelector('[data-strategy-asks]')?.getAttribute('data-strategy-asks')).toBe('11');
    expect(document.querySelectorAll('.sti-ask[aria-pressed="true"]').length).toBe(11);
  });

  it('marks which answers exist and which are empty', () => {
    open({ strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.' } });
    expect(document.querySelector('[data-ask="mission"]')?.getAttribute('data-filled')).toBe('true');
    expect(document.querySelector('[data-ask="tone"]')?.getAttribute('data-filled')).toBe('false');
    expect(document.querySelector('[data-ask="mission"]')?.textContent).toContain('Make shipping boring');
    expect(document.querySelector('[data-ask="tone"]')?.textContent).toContain('empty');
  });

  it('unticking a field drops it from the prompt and hands it over as context', () => {
    open({ strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.' } });
    fireEvent.click(document.querySelector('[data-ask="mission"]') as HTMLElement);
    expect(document.querySelector('[data-strategy-asks]')?.getAttribute('data-strategy-asks')).toBe('10');
  });

  it('"Only what is empty" leaves every answered field alone', () => {
    open({
      strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.', tone: 'direct' },
    });
    fireEvent.click(screen.getByText('Only what is empty'));
    expect(document.querySelector('[data-ask="mission"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-ask="tone"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-ask="summary"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-strategy-asks]')?.getAttribute('data-strategy-asks')).toBe('9');
  });
});
