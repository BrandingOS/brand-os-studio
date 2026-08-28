import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BriefHandoff, judgePaste } from '../components/BriefHandoff';
import { buildBriefPrompt } from '@/features/onboarding/brief/prompt';

function Host() {
  const [v, setV] = useState('');
  return (
    <div data-onboarding="cosmos">
      <BriefHandoff brandName="Raqm" value={v} onChange={setV} />
    </div>
  );
}

const step = (n: number) => document.querySelector(`[data-step="${n}"]`)!.getAttribute('data-state');

describe('BriefHandoff', () => {
  it('judges the three paste outcomes', () => {
    expect(judgePaste('')).toEqual({ kind: 'empty' });
    expect(judgePaste(buildBriefPrompt('Raqm'))).toEqual({ kind: 'prompt' });
    expect(judgePaste('Brand summary: x\nIndustry: y\nTone: z')).toEqual({ kind: 'brief', sections: 3 });
    expect(judgePaste('We sell coffee.')).toEqual({ kind: 'prose' });
  });

  it('walks the steps: copy → waiting → pasted', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<Host />);
    expect(step(1)).toBe('active');
    expect(step(3)).toBe('idle');
    fireEvent.click(screen.getByText('Copy prompt'));
    await screen.findByText('Copied');
    expect(step(1)).toBe('done');
    expect(step(2)).toBe('active');
    fireEvent.change(document.querySelector('[data-brief-paste]')!, { target: { value: 'Brand summary: x\nIndustry: y\nTone: z' } });
    expect(step(3)).toBe('done');
    expect(screen.getByText(/3 of 12 sections/)).toBeTruthy();
  });

  it('refuses the prompt itself and keeps the manual path', () => {
    render(<Host />);
    fireEvent.change(document.querySelector('[data-brief-paste]')!, { target: { value: buildBriefPrompt('Raqm') } });
    expect(document.querySelector('[data-brief-status="prompt"]')).toBeTruthy();
    fireEvent.change(document.querySelector('[data-brief-paste]')!, { target: { value: '' } });
    fireEvent.click(screen.getByText(/write it yourself/));
    expect(document.querySelector('[data-brief-mode="manual"]')).toBeTruthy();
    expect(document.querySelector('textarea#description')).toBeTruthy();
    fireEvent.click(screen.getByText(/Let AI write it instead/));
    expect(document.querySelector('[data-brief-mode="ai"]')).toBeTruthy();
  });
});
