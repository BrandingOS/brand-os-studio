/**
 * The chip's job is as much about staying silent as about speaking. These tests
 * pin the "when relevant, without clutter" rule so a later change cannot quietly
 * turn it into a badge on every field.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { CoreValueMeta } from '@/domain/brand/coreMeta';
import {
  CoreValueStatusChip,
  shouldSurfaceStatus,
} from '../CoreValueStatusChip';

afterEach(cleanup);

function meta(overrides: Partial<CoreValueMeta> = {}): CoreValueMeta {
  return {
    authority: 'confirmed',
    provenance: 'user-entered',
    setBy: 'u1',
    setAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('stays quiet for the ordinary case', () => {
  it('renders nothing for a value the user set and confirmed', () => {
    const { container } = render(<CoreValueStatusChip meta={meta()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for an official user-entered value', () => {
    const { container } = render(
      <CoreValueStatusChip meta={meta({ authority: 'official' })} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('speaks when there is something to know', () => {
  it('surfaces an unsettled value', () => {
    render(<CoreValueStatusChip meta={meta({ authority: 'provisional' })} />);
    expect(screen.getByText('Assumed')).toBeInTheDocument();
  });

  it('surfaces a suggested value', () => {
    render(<CoreValueStatusChip meta={meta({ authority: 'suggested' })} />);
    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('surfaces a CONFIRMED value that came from AI — provenance still matters', () => {
    render(
      <CoreValueStatusChip
        meta={meta({ authority: 'confirmed', provenance: 'ai-suggested' })}
      />,
    );
    const chip = screen.getByText('Confirmed');
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute('title')).toMatch(/suggested by AI/i);
  });

  it('surfaces an inferred value', () => {
    render(
      <CoreValueStatusChip meta={meta({ provenance: 'inferred' })} />,
    );
    expect(screen.getByText('Confirmed').getAttribute('title')).toMatch(/inferred/i);
  });

  it('explains both dimensions in the title, never collapsing them', () => {
    render(
      <CoreValueStatusChip
        meta={meta({ authority: 'provisional', provenance: 'ai-suggested' })}
      />,
    );
    expect(screen.getByText('Assumed').getAttribute('title')).toBe(
      'Assumed — suggested by AI',
    );
  });
});

describe('shouldSurfaceStatus', () => {
  it('matches the rendering rule', () => {
    expect(shouldSurfaceStatus(meta())).toBe(false);
    expect(shouldSurfaceStatus(meta({ authority: 'provisional' }))).toBe(true);
    expect(shouldSurfaceStatus(meta({ provenance: 'ai-suggested' }))).toBe(true);
    expect(shouldSurfaceStatus(meta({ provenance: 'imported' }))).toBe(false);
  });
});

describe('alwaysShow escape hatch', () => {
  it('renders even when the chip would normally stay quiet', () => {
    render(<CoreValueStatusChip meta={meta()} alwaysShow />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});
