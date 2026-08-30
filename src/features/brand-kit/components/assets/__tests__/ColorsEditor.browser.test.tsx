/**
 * The Colors editor — fields reach the preview, and Save reaches the brand.
 *
 * A browser test rather than jsdom because half of what this panel does is
 * VISUAL: the preview bar is the palette at its usage proportions, the
 * swatch chips are the colours themselves, and a near-white swatch has to
 * carry an edge. None of that measures without a cascade.
 *
 * The write is asserted at the seam that matters — the patch handed to
 * `useBrandStore.update`. That is the contract Setup keeps too, so a
 * change made here and a change made there travel the same road.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { ColorsEditor } from '../ColorsEditor';

// MIGRATED, because that is the only shape the panel ever sees: every service
// hands the store a `migrateBrandToCurrent` brand, which is where raqm's five
// neutrals come from (`guidelines.colorPalette.neutral` → `colorSystem.neutrals`).
// The raw seed carries two colours, and a test on two colours cannot see a bug
// that drops five.
const BRAND: Brand = migrateBrandToCurrent(SEED_BRANDS[0]!);

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

function mount(overrides: Partial<React.ComponentProps<typeof ColorsEditor>> = {}) {
  const mock = brandToMockBrand(BRAND);
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ColorsEditor
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

/** Walk the confirmation open and press through it. */
function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Save colours' }));
  const dialog = screen.getByRole('alertdialog');
  return {
    dialog,
    go: () => fireEvent.click(within(dialog).getByRole('button', { name: 'Change the colours' })),
  };
}

describe('ColorsEditor', () => {
  it('shows one row per brand colour, with its hex and the role the kit prints', () => {
    const { mock } = mount();
    const expected = [...mock.colors.core, ...mock.colors.accent];
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(expected.length);
    for (const c of expected) {
      expect(screen.getByDisplayValue(c.name)).toBeTruthy();
    }
    // The role the tiles use, never the slot number (D40).
    expect(document.body.textContent).toContain('shown as Primary');
    expect(document.body.textContent).not.toMatch(/shown as Core \d/);
  });

  it('paints the preview bar at the usage proportions, biggest share first', () => {
    mount();
    const bar = screen.getByTestId('colors-preview');
    const grows = Array.from(bar.children).map((el) =>
      Number(getComputedStyle(el as HTMLElement).flexGrow),
    );
    expect(grows.length).toBeGreaterThan(1);
    expect(grows[0]).toBeGreaterThan(grows[1]!);
    // The colours themselves, not a chrome grey.
    const first = getComputedStyle(bar.children[0] as HTMLElement).backgroundColor;
    expect(first).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('a new hex repaints the preview and is offered to the page behind it', async () => {
    const { onBrandChange } = mount();
    const before = getComputedStyle(screen.getByTestId('colors-preview').children[0] as HTMLElement)
      .backgroundColor;

    fireEvent.click(screen.getAllByRole('button', { name: /^Change / })[0]!);
    const hexField = document.querySelector('input[value^="#"]') as HTMLInputElement;
    expect(hexField).toBeTruthy();
    fireEvent.change(hexField, { target: { value: '#123456' } });

    await waitFor(() => {
      const after = getComputedStyle(
        screen.getByTestId('colors-preview').children[0] as HTMLElement,
      ).backgroundColor;
      expect(after).not.toBe(before);
      expect(after).toBe('rgb(18, 52, 86)');
    });
    // The kit behind the panel was told, so the drilldown repaints too.
    const last = onBrandChange.mock.calls.at(-1)?.[0];
    expect(last.colors.core[0].hex).toBe('#123456');
  });

  it('renaming a colour reaches the preview', async () => {
    mount();
    const name = screen.getByDisplayValue(brandToMockBrand(BRAND).colors.core[0]!.name);
    fireEvent.change(name, { target: { value: 'Ultraviolet' } });
    await waitFor(() => {
      expect(screen.getByTestId('colors-preview').textContent).toContain('Ultraviolet');
    });
  });

  it('Primary is a single seat: taking it hands the old holder the seat you left', () => {
    const { mock } = mount();
    const secondName = mock.colors.core[1]!.name;
    fireEvent.change(screen.getByLabelText(`Role for ${secondName}`), {
      target: { value: 'primary' },
    });
    // Two colours traded places — neither was dropped, and there is still
    // exactly one Primary.
    const shown = Array.from(document.querySelectorAll('.bka-colors-hex')).map(
      (el) => el.textContent ?? '',
    );
    expect(shown.filter((t) => t.includes('shown as Primary'))).toHaveLength(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(
      mock.colors.core.length + mock.colors.accent.length,
    );
  });

  it('adds a colour, names it from the colour itself, and removes one again', async () => {
    const { mock } = mount();
    const started = mock.colors.core.length + mock.colors.accent.length;

    fireEvent.click(screen.getByRole('button', { name: 'Add a colour' }));
    const hexField = document.querySelector('input[value^="#"]') as HTMLInputElement;
    fireEvent.change(hexField, { target: { value: '#FF7A59' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(started + 1));
    const added = screen.getAllByRole('listitem').at(-1)!;
    expect(within(added).getByRole('textbox').getAttribute('value')).toBeTruthy();

    fireEvent.click(within(added).getByRole('button', { name: /^Remove / }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(started));
  });

  it('never leaves the brand without a Primary — removing it promotes an heir', async () => {
    const { mock } = mount();
    const primaryName = mock.colors.core[0]!.name;
    fireEvent.click(screen.getByRole('button', { name: `Remove ${primaryName}` }));
    await waitFor(() => {
      const shown = Array.from(document.querySelectorAll('.bka-colors-hex')).map(
        (el) => el.textContent ?? '',
      );
      expect(shown.filter((t) => t.includes('shown as Primary'))).toHaveLength(1);
    });
    expect(screen.queryByDisplayValue(primaryName)).toBeNull();
  });

  it('writes nothing until the change is confirmed, and names it in the dialog', async () => {
    const { mock } = mount();
    fireEvent.click(screen.getAllByRole('button', { name: /^Change / })[0]!);
    const hexField = document.querySelector('input[value^="#"]') as HTMLInputElement;
    fireEvent.change(hexField, { target: { value: '#123456' } });

    expect(update).not.toHaveBeenCalled();

    const { dialog, go } = confirm();
    // The confirmation NAMES what changes — the old hex and the new one.
    expect(dialog.textContent).toContain(mock.colors.core[0]!.name);
    expect(dialog.textContent).toContain('#123456');

    go();
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const [id, patch] = update.mock.calls[0]!;
    expect(id).toBe(BRAND.id);
    expect(patch.primaryColor).toBe('#123456');
  });

  it('cancelling the confirmation writes nothing', async () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: /^Change / })[0]!);
    fireEvent.change(document.querySelector('input[value^="#"]') as HTMLInputElement, {
      target: { value: '#123456' },
    });
    const { dialog } = confirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Save is dead until something actually changes', () => {
    mount();
    expect(
      (screen.getByRole('button', { name: 'Save colours' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('a brand with nowhere to write says so instead of pretending to save', () => {
    mount({ sourceBrand: null });
    expect(
      (screen.getByRole('button', { name: 'Save colours' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(document.body.textContent).toContain('not stored yet');
  });

  it('the patch it sends is a WHOLE-brand diff, so nothing else is cleared', async () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: /^Change / })[0]!);
    fireEvent.change(document.querySelector('input[value^="#"]') as HTMLInputElement, {
      target: { value: '#123456' },
    });
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    const patch = update.mock.calls[0]![1];
    // Only the palette moved. A hand-built partial would have emitted a
    // name/typography diff too.
    expect(patch.name).toBeUndefined();
    expect(patch.typography).toBeUndefined();
    // The logo is not exempt from the whole-brand diff — a seed brand
    // carries `logoSystem` and no `logoAssets`, so the round-trip fills
    // that dict in and the diff carries it. What must never happen is the
    // logo CHANGING because someone edited the palette.
    expect(patch.logo ?? BRAND.logo).toBe(BRAND.logo);
    // And the generated grey ladder is NOT sent back as the brand's own.
    expect((patch.neutrals ?? []).length).toBeLessThan(10);
  });

  /**
   * QA Q1, end to end from the control the user touches.
   *
   * Renaming a colour here and confirming deleted five of raqm's eight colours
   * and lost the rename as well. The panel was never the culprit — it already
   * sent a whole-brand diff — so the assertion has to follow the patch back
   * THROUGH the read: merge it, re-migrate it the way the store does, and look
   * at the palette the next paint would show.
   */
  it('renaming a colour keeps every other colour, and the new name survives the read', async () => {
    const before = brandToMockBrand(BRAND);
    const all = [...before.colors.core, ...before.colors.accent];
    expect(all.length).toBeGreaterThan(3);

    mount();
    fireEvent.change(screen.getByDisplayValue(all[0]!.name), {
      target: { value: 'Iris QA' },
    });
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());

    const patch = update.mock.calls[0]![1];
    const saved = migrateBrandToCurrent({ ...BRAND, ...patch } as Brand);
    const after = brandToMockBrand(saved);
    const names = [...after.colors.core, ...after.colors.accent];

    // Nothing was dropped, and the hexes are the same palette in the same order.
    expect(names.map((c) => c.hex)).toEqual(all.map((c) => c.hex));
    // The rename is what the next read shows.
    expect(names[0]!.name).toBe('Iris QA');
  });
});
