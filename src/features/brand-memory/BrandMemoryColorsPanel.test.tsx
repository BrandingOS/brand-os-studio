// Phase 6.4 — BrandMemoryColorsPanel unit tests.
//
// Mocks useBrandMemory and asserts the component's render contract:
// - returns nothing while loading or on error (avoids flicker)
// - returns nothing when there are no analyzable designs yet
// - renders one swatch per color when a snapshot is present
// - swatches carry the hex on aria-label + background-color so the
//   row is meaningful for AT users and visually correct.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BrandMemoryColorsPanel } from './BrandMemoryColorsPanel';

const useBrandMemoryMock = vi.fn();
vi.mock('./useBrandMemory', () => ({
  useBrandMemory: (...args: unknown[]) => useBrandMemoryMock(...args),
}));

afterEach(() => {
  useBrandMemoryMock.mockReset();
  cleanup();
});

describe('BrandMemoryColorsPanel', () => {
  it('renders nothing while loading', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<BrandMemoryColorsPanel brandId="b1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on error', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: null,
      loading: false,
      error: new Error('boom'),
      refresh: vi.fn(),
    });
    const { container } = render(<BrandMemoryColorsPanel brandId="b1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the brand has no analyzable designs', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<BrandMemoryColorsPanel brandId="b1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one swatch per color in the snapshot', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: {
        computedAt: '2026-05-04T00:00:00Z',
        colors: [
          { hex: '#ff0000', count: 5 },
          { hex: '#00ff00', count: 2 },
          { hex: '#0000ff', count: 1 },
        ],
        fonts: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container, getByLabelText } = render(
      <BrandMemoryColorsPanel brandId="b1" />,
    );
    expect(container.querySelector('[data-brand-memory-colors]')).not.toBeNull();
    expect(getByLabelText(/#ff0000 used 5 times/i)).not.toBeNull();
    expect(getByLabelText(/#00ff00 used 2 times/i)).not.toBeNull();
    expect(getByLabelText(/#0000ff used 1 times/i)).not.toBeNull();
  });

  it('forwards limit to useBrandMemory', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: {
        computedAt: 'x',
        colors: [{ hex: '#fff', count: 1 }],
        fonts: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<BrandMemoryColorsPanel brandId="b1" limit={3} />);
    expect(useBrandMemoryMock).toHaveBeenCalledWith('b1', { limit: 3 });
  });

  it('renders fonts row when snapshot has fonts (Phase 6.5)', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: {
        computedAt: 'x',
        colors: [],
        fonts: [
          { family: 'Inter', count: 5 },
          { family: 'Roboto', count: 2 },
        ],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container, getByLabelText } = render(
      <BrandMemoryColorsPanel brandId="b1" />,
    );
    expect(container.querySelector('[data-brand-memory-fonts]')).not.toBeNull();
    expect(getByLabelText(/Inter used 5 times/i)).not.toBeNull();
    expect(getByLabelText(/Roboto used 2 times/i)).not.toBeNull();
  });

  it('renders nothing when both colors and fonts are empty', () => {
    useBrandMemoryMock.mockReturnValue({
      snapshot: { computedAt: 'x', colors: [], fonts: [] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<BrandMemoryColorsPanel brandId="b1" />);
    expect(container.firstChild).toBeNull();
  });
});
