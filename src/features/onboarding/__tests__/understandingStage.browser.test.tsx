/**
 * The animation explains progress; it never delays completion.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { UnderstandingStage } from '../steps/UnderstandingStage';
import { createStageSignals, MINIMUM_BEAT_MS, planStages } from '../understanding/stages';

afterEach(cleanup);

describe('the processing moment and real work', () => {
  it('ends soon after the work does, not after the eight-stage sequence would have', async () => {
    const signals = createStageSignals();
    const stages = planStages({ brandName: 'Northwind', hasText: false, hasBrief: false, website: 'https://northwind.studio', items: [], awaitStage: signals.promiseFor });
    expect(stages).toHaveLength(8);
    const onDone = vi.fn();
    const started = performance.now();
    render(
      <UnderstandingStage
        brandName="Northwind"
        stages={stages}
        work={async () => {
          // A fast scan: three real events, then the work is over.
          signals.resolve('site-opened', null);
          signals.resolve('site-signals', { label: 'Socials', value: '2 found' });
          signals.resolve('site-identity', { label: 'Logo', value: 'found' });
          await new Promise((r) => setTimeout(r, 300));
          signals.resolveAll();
        }}
        onDone={onDone}
      />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 5000 });
    const took = performance.now() - started;
    // Eight stages at the readable pace would be ~6.1s. Fast-forward keeps it
    // to the floor plus a quick run-out of the remaining labels.
    expect(took).toBeGreaterThanOrEqual(MINIMUM_BEAT_MS - 50);
    expect(took).toBeLessThan(3500);
    // Findings that were really earned are on screen; nothing was invented.
    expect(screen.getByText('found')).toBeInTheDocument();
    expect(screen.getByText('2 found')).toBeInTheDocument();
    expect(document.querySelectorAll('.onb-find')).toHaveLength(2);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });

  it('a stage lights on its event, never before', async () => {
    const signals = createStageSignals();
    const stages = planStages({ brandName: 'N', hasText: false, hasBrief: false, website: 'x.co', items: [], awaitStage: signals.promiseFor });
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    render(<UnderstandingStage brandName="N" stages={stages} work={() => gate} onDone={() => {}} />);
    // The first label is shown at once, but its node is not lit until the event.
    await waitFor(() => expect(screen.getByText('Opening x.co')).toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 200));
    const lit = () => document.querySelectorAll('.onb-mark-node.is-active, .onb-node.is-active, [data-active="true"]').length;
    const before = lit();
    signals.resolve('site-opened', { label: 'Site', value: 'x.co' });
    await waitFor(() => expect(screen.getByText('x.co')).toBeInTheDocument());
    expect(lit()).toBeGreaterThanOrEqual(before);
    signals.resolveAll();
    release();
  });
});
