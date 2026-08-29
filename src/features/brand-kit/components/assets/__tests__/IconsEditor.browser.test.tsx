/**
 * The Icons editor — the four decisions reach the preview, and Save reaches
 * the brand.
 *
 * A browser test rather than jsdom because the thing that broke here was
 * PERSISTENCE, and persistence is only interesting at the seam: the patch
 * handed to `useBrandStore.update`. Everything upstream of that seam is a
 * draft, and every earlier version of this panel had a perfectly good draft.
 *
 * The set, the weight, the tint and the pack are asserted on that patch —
 * under `guidelines.iconography`, which is where `brandToMockBrand` reads them
 * back from. A test that only checked the preview would have passed against
 * the code that shipped audit D11.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { iconLabel, iconPack } from '../../../data/iconPacks';
import { stripIconPrefix } from '../../../data/iconWeights';
import { IconsEditor } from '../IconsEditor';

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

function mount(overrides: Partial<React.ComponentProps<typeof IconsEditor>> = {}) {
  const mock = brandToMockBrand(BRAND);
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <IconsEditor
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
  fireEvent.click(screen.getByRole('button', { name: 'Save icons' }));
  const dialog = screen.getByRole('alertdialog');
  return {
    dialog,
    go: () => fireEvent.click(within(dialog).getByRole('button', { name: 'Change the icons' })),
  };
}

/** The iconography block the patch carries, if any. */
function iconography(patch: Record<string, unknown>) {
  return (patch.guidelines as { iconography?: Record<string, unknown> } | undefined)?.iconography;
}

describe('IconsEditor', () => {
  it('shows the brand’s set, each symbol beside the name it is called', () => {
    const { mock } = mount();
    const list = screen.getByLabelText("The brand's icon set");
    expect(within(list).getAllByRole('listitem')).toHaveLength(mock.icons.length);
    expect(list.textContent).toContain(iconLabel(mock.icons[0]!));
  });

  it('the specimen draws the set at the size the question is asked at', () => {
    mount();
    const specimen = screen.getByTestId('icons-specimen');
    const glyphs = Array.from(specimen.querySelectorAll('i'));
    expect(glyphs.length).toBeGreaterThan(0);
    expect(Math.round(parseFloat(getComputedStyle(glyphs[0]!).fontSize))).toBe(24);
  });

  it('a weight change repaints every glyph and is offered to the page behind it', async () => {
    const { onBrandChange } = mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    await waitFor(() => {
      const specimen = screen.getByTestId('icons-specimen');
      const classes = Array.from(specimen.querySelectorAll('i')).map((i) => i.className);
      expect(classes.every((c) => c.includes('fi-br-'))).toBe(true);
    });
    const last = onBrandChange.mock.calls.at(-1)?.[0];
    expect(last.icons.every((n: string) => n.startsWith('fi-br-'))).toBe(true);
  });

  it('a tint is one of the brand’s own colours, and it repaints the specimen', async () => {
    const { mock, onBrandChange } = mount();
    const target = mock.colors.core[1] ?? mock.colors.accent[0] ?? mock.colors.core[0]!;
    const hex = target.hex.toUpperCase();
    fireEvent.click(screen.getByRole('button', { name: `Tint the set ${target.name} ${hex}` }));
    await waitFor(() => {
      const glyph = screen.getByTestId('icons-specimen').querySelector('i')!;
      expect(getComputedStyle(glyph).color).not.toBe('');
    });
    expect(onBrandChange.mock.calls.at(-1)?.[0].iconTint).toBe(hex);
  });

  it('choosing a pack replaces the set with that pack’s vocabulary', async () => {
    const { onBrandChange } = mount();
    fireEvent.click(screen.getByLabelText('Icon pack'));
    fireEvent.click(screen.getByRole('option', { name: /^Food & Beverage/ }));
    await waitFor(() => {
      const next = onBrandChange.mock.calls.at(-1)?.[0].icons as string[];
      const allowed = new Set(iconPack('food').icons);
      expect(next.length).toBeGreaterThan(0);
      for (const name of next) expect(allowed.has(stripIconPrefix(name)), name).toBe(true);
    });
  });

  it('adds a symbol found by searching the catalogue', async () => {
    mount();
    const list = screen.getByLabelText("The brand's icon set");
    const before = within(list).getAllByRole('listitem').length;
    fireEvent.change(screen.getByLabelText('Search icons'), { target: { value: 'telescope' } });
    const results = await screen.findByLabelText('Search results');
    fireEvent.click(within(results).getAllByRole('button')[0]!);
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("The brand's icon set")).getAllByRole('listitem'),
      ).toHaveLength(before + 1),
    );
  });

  it('never offers the catalogue’s non-brand families in search', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Search icons'), { target: { value: 'braille' } });
    await waitFor(() =>
      expect(document.body.textContent).toContain('Nothing in the catalogue is called that'),
    );
  });

  it('removes a symbol, and refuses to empty the set', async () => {
    mount();
    const list = () => screen.getByLabelText("The brand's icon set");
    const before = within(list()).getAllByRole('listitem').length;
    fireEvent.click(within(list()).getAllByRole('button', { name: /^Remove / })[0]!);
    await waitFor(() =>
      expect(within(list()).getAllByRole('listitem')).toHaveLength(before - 1),
    );
    // Down to one, the last remove is refused rather than leaving a hole.
    for (let i = 0; i < before; i += 1) {
      const buttons = within(list()).getAllByRole('button', { name: /^Remove / });
      if (buttons.length <= 1) break;
      fireEvent.click(buttons[0]!);
    }
    await waitFor(() => expect(within(list()).getAllByRole('listitem')).toHaveLength(1));
    const last = within(list()).getByRole('button', { name: /^Remove / }) as HTMLButtonElement;
    expect(last.disabled).toBe(true);
  });

  it('Save is dead until something actually changes', () => {
    mount();
    expect((screen.getByRole('button', { name: 'Save icons' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('writes nothing until the change is confirmed, and names it in the dialog', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    expect(update).not.toHaveBeenCalled();

    const { dialog, go } = confirm();
    expect(dialog.textContent).toContain('Bold instead of Regular');

    go();
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it('cancelling the confirmation writes nothing', () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    const { dialog } = confirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('SAVES the weight into the set itself — the whole of D11', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Solid' }));
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    const [id, patch] = update.mock.calls[0]!;
    expect(id).toBe(BRAND.id);
    const icons = iconography(patch)!;
    expect((icons.set as string[]).every((n) => n.startsWith('fi-sr-'))).toBe(true);
  });

  it('SAVES the tint and the pack beside the set', async () => {
    const { mock } = mount();
    const target = mock.colors.core[1] ?? mock.colors.accent[0] ?? mock.colors.core[0]!;
    const hex = target.hex.toUpperCase();
    fireEvent.click(screen.getByRole('button', { name: `Tint the set ${target.name} ${hex}` }));
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    const icons = iconography(update.mock.calls[0]![1])!;
    expect(icons.tint).toBe(hex);
    expect(typeof icons.pack).toBe('string');
  });

  it('what it saves is what the kit reads back', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    const patch = update.mock.calls[0]![1];
    // The round trip: the patch's guidelines block, read through the same
    // projection the drilldown renders from.
    const saved = brandToMockBrand({
      ...BRAND,
      guidelines: { ...BRAND.guidelines, ...(patch.guidelines ?? {}) },
    } as Brand);
    expect(saved.icons.every((n) => n.startsWith('fi-br-'))).toBe(true);
    expect(saved.iconTint).toBeTruthy();
  });

  it('the patch is a WHOLE-brand diff, so nothing else is cleared', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    const patch = update.mock.calls[0]![1];
    expect(patch.name).toBeUndefined();
    expect(patch.primaryColor).toBeUndefined();
    // `buildLogoPatch` re-states the board it read, so a `logo` key can
    // appear. What must never happen is it appearing with a DIFFERENT value:
    // that is the destructive diff a hand-built partial produces.
    if ('logo' in patch) expect(patch.logo).toBe(BRAND.logo);
  });

  it('a brand with nowhere to write says so instead of pretending to save', () => {
    mount({ sourceBrand: null });
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    expect((screen.getByRole('button', { name: 'Save icons' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(document.body.textContent).toContain('not stored yet');
  });
});
