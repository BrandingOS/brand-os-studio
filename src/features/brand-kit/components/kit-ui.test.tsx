import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { useKitStore, statusOf } from '../kit/kitStore';
import { getDeliverable } from '../kit/registry';
import { DeliverableCard } from './DeliverableCard';
import { ReviewOverlay } from './ReviewOverlay';
import { GenerateBar } from './GenerateBar';

const DEF = getDeliverable('stationery', 'Business Card')!;
const CTX = { seed: 'ui-brand', brand: mockBrand };

function resetStore() {
  localStorage.clear();
  useKitStore.setState({ brandId: null, deliverables: {}, generatingKeys: [] });
  useKitStore.getState().hydrate('ui-brand', mockBrand);
}

function cardProps(overrides: Partial<Parameters<typeof DeliverableCard>[0]> = {}) {
  return {
    def: DEF,
    brand: mockBrand,
    sourceBrand: undefined,
    selected: false,
    selectionActive: false,
    onToggleSelect: vi.fn(),
    onGenerate: vi.fn(),
    onOpenReview: vi.fn(),
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onDownload: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  resetStore();
});

describe('DeliverableCard', () => {
  it('renders the not-created state with a Generate affordance — no finished asset', () => {
    const props = cardProps();
    render(<DeliverableCard {...props} />);
    expect(screen.getByText('Not created yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Business Card' }));
    expect(props.onGenerate).toHaveBeenCalledWith(DEF.key);
  });

  it('toggles selection instead of generating while select mode is active', () => {
    const props = cardProps({ selectionActive: true });
    render(<DeliverableCard {...props} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Business Card for generation' }),
    );
    expect(props.onToggleSelect).toHaveBeenCalledWith(DEF.key);
    expect(props.onGenerate).not.toHaveBeenCalled();
  });

  it('shows the review state with candidate count after generation', async () => {
    await useKitStore.getState().generate([DEF.key], CTX, { minDelayMs: 0 });
    const props = cardProps();
    render(<DeliverableCard {...props} />);
    expect(screen.getByText('Review · 3')).toBeTruthy();
  });

  it('shows the approved state and routes edit/download to the primary item', async () => {
    await useKitStore.getState().generate([DEF.key], CTX, { minDelayMs: 0 });
    const first = useKitStore.getState().deliverables[DEF.key].items[0];
    useKitStore.getState().approve(DEF.key, first.id);

    const props = cardProps();
    render(<DeliverableCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Customize Business Card' }));
    expect(props.onEdit).toHaveBeenCalledWith(DEF, first.id);
    fireEvent.click(screen.getByRole('button', { name: 'Download Business Card' }));
    expect(props.onDownload).toHaveBeenCalledWith(DEF, first.id);
  });

  it('shows the error state with Retry', () => {
    useKitStore.setState((s) => ({
      deliverables: {
        ...s.deliverables,
        [DEF.key]: {
          items: [],
          primaryItemId: null,
          error: 'No designs available',
          seenVariantIds: [],
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    const props = cardProps();
    render(<DeliverableCard {...props} />);
    expect(screen.getByText('No designs available')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onGenerate).toHaveBeenCalledWith(DEF.key);
  });
});

describe('ReviewOverlay', () => {
  it('approves the selected candidate and the deliverable becomes owned', async () => {
    await useKitStore.getState().generate([DEF.key], CTX, { minDelayMs: 0 });
    const onClose = vi.fn();
    render(
      <ReviewOverlay
        open
        focusKey={DEF.key}
        brand={mockBrand}
        ctx={CTX}
        onClose={onClose}
        onCustomize={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Business Card' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use this design' }));
    expect(statusOf(useKitStore.getState(), DEF.key)).toBe('approved');
    // Last queued deliverable reviewed → overlay closes.
    expect(onClose).toHaveBeenCalled();
  });

  it('skip dismisses the candidates and returns the deliverable to not-created', async () => {
    await useKitStore.getState().generate([DEF.key], CTX, { minDelayMs: 0 });
    render(
      <ReviewOverlay
        open
        focusKey={DEF.key}
        brand={mockBrand}
        ctx={CTX}
        onClose={vi.fn()}
        onCustomize={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(statusOf(useKitStore.getState(), DEF.key)).toBe('not-created');
  });

  it('bulk-approves all remaining queued deliverables', async () => {
    const keys = [DEF.key, 'stationery::Letterhead', 'stationery::Envelope'];
    await useKitStore.getState().generate(keys, CTX, { minDelayMs: 0 });
    const onClose = vi.fn();
    render(
      <ReviewOverlay
        open
        focusKey={DEF.key}
        brand={mockBrand}
        ctx={CTX}
        onClose={onClose}
        onCustomize={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Approve all remaining/ }));
    for (const key of keys) {
      expect(statusOf(useKitStore.getState(), key)).toBe('approved');
    }
    expect(onClose).toHaveBeenCalled();
  });
});

describe('GenerateBar', () => {
  it('is hidden with no selection and generates the selection otherwise', () => {
    const onGenerate = vi.fn();
    const { rerender } = render(
      <GenerateBar
        selectedCount={0}
        availableCount={5}
        onGenerate={onGenerate}
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.queryByRole('toolbar')).toBeNull();

    rerender(
      <GenerateBar
        selectedCount={2}
        availableCount={5}
        onGenerate={onGenerate}
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Generate 2 deliverables' }));
    expect(onGenerate).toHaveBeenCalled();
  });
});
