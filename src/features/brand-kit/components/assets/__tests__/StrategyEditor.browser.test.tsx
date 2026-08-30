/**
 * The Strategy panel — one answer changed, and the change reaches the brand.
 *
 * A browser test rather than jsdom for the same reason as the other four:
 * what broke before was PERSISTENCE, and persistence is only interesting
 * at the seam — the patch handed to `useBrandStore.update`. Everything
 * upstream of it is a draft, and a draft is easy to get right.
 *
 * The other half of what is pinned here is the DIVISION OF LABOUR. This
 * panel must not own an opinion about what a vocabulary is or how a field
 * saves; it opens Setup's own modals and commits what they returned. So
 * the test drives Setup's modal, not a control of ours.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import { VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { StrategyEditor } from '../StrategyEditor';

const BRAND: Brand = SEED_BRANDS[0]!;

let update: ReturnType<typeof vi.fn>;

beforeEach(() => {
  update = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(useBrandStore, 'getState').mockReturnValue({
    ...useBrandStore.getState(),
    update,
  } as ReturnType<typeof useBrandStore.getState>);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(overrides: Partial<React.ComponentProps<typeof StrategyEditor>> = {}) {
  const mock = brandToMockBrand(BRAND);
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <StrategyEditor
      open
      onClose={onClose}
      brand={mock}
      sourceBrand={BRAND}
      onBrandChange={onBrandChange}
      {...overrides}
    />,
  );
  return { ...view, mock, onBrandChange, onClose };
}

/** Change the Slogan — prose, so Setup's modal offers a text box. */
async function answerSlogan(text: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Slogan' }));
  const box = await screen.findByRole('textbox');
  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('StrategyEditor', () => {
  it('lists every one of the eleven questions, answered or not', () => {
    const { mock } = mount();
    const rows = screen.getAllByRole('button', { name: /^Edit / });
    expect(rows).toHaveLength(STRATEGY_CARDS.length);
    // An unanswered question is a question waiting, not a row missing —
    // hiding it is how a brand ends up with four answers and no idea
    // which seven are gone.
    const unanswered = STRATEGY_CARDS.filter((c) => !contentOf(c, mock.strategy));
    if (unanswered.length > 0) {
      expect(screen.getAllByText('Not answered').length).toBe(unanswered.length);
    }
  });

  it('shows the answer a person reads, never the id it is stored as', () => {
    // A closed vocabulary is STORED as an id. `contentOf` is the one
    // reader; without it the panel says the id while Setup, the markdown
    // and the brand book all say the word. Driven off a card whose id and
    // label genuinely differ — an unrecognised id IS the user's own word
    // and reads back verbatim, so it could never fail this.
    const card = STRATEGY_CARDS.find((c) => c.vocab === 'industry')!;
    const base = brandToMockBrand(BRAND);
    const id = VOCABULARIES.industry.find((m) => m.id !== m.label)!;
    mount({ brand: { ...base, strategy: { ...base.strategy, industry: id.id } } });
    const row = screen.getByRole('button', { name: `Edit ${card.name}` });
    expect(row.textContent).toContain(id.label);
    expect(row.textContent).not.toContain(id.id);
  });

  it('cannot be saved until something has actually changed', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Save strategy' })).toBeDisabled();
  });

  it('opens Setup’s own editor for one answer and keeps what it returns', async () => {
    mount();
    await answerSlogan('Make it measurable.');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Slogan' }).textContent).toContain(
        'Make it measurable.',
      );
    });
    expect(screen.getByRole('button', { name: 'Save strategy' })).not.toBeDisabled();
  });

  it('previews the change on the kit behind it before anything is written', async () => {
    const { onBrandChange } = mount();
    await answerSlogan('Make it measurable.');
    await waitFor(() => {
      const last = onBrandChange.mock.calls.at(-1)?.[0];
      expect(last?.strategy.slogan).toBe('Make it measurable.');
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('names the change in the confirmation, and writes nothing until it is taken', async () => {
    mount();
    await answerSlogan('Make it measurable.');
    fireEvent.click(screen.getByRole('button', { name: 'Save strategy' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Slogan');
    expect(dialog.textContent).toContain('Make it measurable.');
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Change the strategy' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it('sends a patch that changes the strategy and nothing else', async () => {
    const { onClose } = mount();
    await answerSlogan('Make it measurable.');
    fireEvent.click(screen.getByRole('button', { name: 'Save strategy' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change the strategy' }));
    await waitFor(() => expect(update).toHaveBeenCalled());

    const [id, patch] = update.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe(BRAND.id);
    // The slogan is Business Info — `tagline` — which is where the Setup
    // chain files it. What matters is that the write is a strategy write:
    // the palette, the typography and the logo are untouched.
    expect(JSON.stringify(patch)).toContain('Make it measurable.');
    expect(patch.colors).toBeUndefined();
    expect(patch.typography).toBeUndefined();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('refuses to offer a save it could not perform', () => {
    // No canonical brand, no write. The panel says so by staying disabled
    // rather than by failing after the confirmation was taken.
    mount({ sourceBrand: undefined });
    expect(screen.getByRole('button', { name: 'Save strategy' })).toBeDisabled();
  });

  it('re-seeds from the brand each time it opens', async () => {
    const mock = brandToMockBrand(BRAND);
    const { rerender } = render(
      <StrategyEditor open onClose={() => {}} brand={mock} sourceBrand={BRAND} />,
    );
    await answerSlogan('A draft nobody kept.');
    rerender(<StrategyEditor open={false} onClose={() => {}} brand={mock} sourceBrand={BRAND} />);
    rerender(<StrategyEditor open onClose={() => {}} brand={mock} sourceBrand={BRAND} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Slogan' }).textContent).not.toContain(
        'A draft nobody kept.',
      );
    });
    expect(screen.getByRole('button', { name: 'Save strategy' })).toBeDisabled();
  });
});
