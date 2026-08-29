/**
 * The Logos editor — fields reach the system, and Save reaches the brand.
 *
 * A browser test rather than jsdom because most of what this panel says is
 * VISUAL: the placement strip is painted in the brand's own colours, a ground
 * that is switched off has to still read as a row, and a variant's thumbnail
 * is the artwork rather than a grey square. None of that measures without a
 * cascade.
 *
 * The write is asserted at the seam that matters — the patch handed to
 * `useBrandStore.update`. That is the contract Setup keeps too, so a change
 * made here and a change made there travel the same road.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { allBrandGrounds, logoCombosFor } from '../../../data/recolorLogo';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { LogosEditor } from '../LogosEditor';

const BRAND: Brand = SEED_BRANDS.find((b) => b.slug === 'raqm')!;
/**
 * A brand whose owned variants do NOT cover every ground, so the system
 * really generates mono cuts. Raqm owns a white and a black variant, so its
 * black-and-white placements are PAIRINGS — artwork the brand holds — and no
 * treatment is generated at all. That is the rule working, not a gap, and it
 * is why the cut toggles are exercised on a brand that has cuts.
 */
const CUT_BRAND: Brand = SEED_BRANDS.find((b) => b.slug === 'vector')!;

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

function mount(
  overrides: Partial<React.ComponentProps<typeof LogosEditor>> = {},
  source: Brand = BRAND,
) {
  const mock = brandToMockBrand(source);
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <LogosEditor
      open
      onClose={onClose}
      brand={mock}
      sourceBrand={source}
      onBrandChange={onBrandChange}
      {...overrides}
    />,
  );
  return { ...view, mock, onBrandChange, onClose };
}

/** Walk the confirmation open and press through it. */
function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Save logo system' }));
  const dialog = screen.getByRole('alertdialog');
  return {
    dialog,
    go: () =>
      fireEvent.click(within(dialog).getByRole('button', { name: 'Change the logo system' })),
  };
}

/** The DS select is a listbox, not a native `<select>`: open it, then pick. */
function chooseRole(rowLabel: string | RegExp, option: string) {
  fireEvent.click(screen.getByLabelText(rowLabel));
  const list = screen.getByRole('listbox');
  fireEvent.click(within(list).getByRole('option', { name: option }));
}

describe('LogosEditor', () => {
  it('shows one row per logo variant, with its name and the role it holds', () => {
    const { mock } = mount();
    expect(mock.logos.length).toBeGreaterThan(1);
    for (const logo of mock.logos) {
      expect(screen.getByDisplayValue(logo.label)).toBeTruthy();
    }
    expect(document.body.textContent).toContain('shown as Primary');
  });

  it('the placement strip is the system, painted in the brand’s own colours', () => {
    const { mock } = mount();
    const strip = screen.getByTestId('logos-preview');
    const expected = logoCombosFor(mock).filter(
      (t) => t.kind === 'pairing' || t.kind === 'treatment',
    );
    expect(strip.children).toHaveLength(expected.length);
    // A real colour, not a chrome grey and not transparent.
    const first = getComputedStyle(strip.children[0] as HTMLElement).backgroundColor;
    expect(first).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('renaming a variant reaches the confirmation, and nothing is written before it', () => {
    const { mock } = mount();
    const first = mock.logos[0]!;
    fireEvent.change(screen.getByDisplayValue(first.label), {
      target: { value: 'RAQM lockup' },
    });
    expect(update).not.toHaveBeenCalled();

    const { dialog } = confirm();
    expect(dialog.textContent).toContain('RAQM lockup');
    expect(dialog.textContent).toContain('Rename');
  });

  it('a rename travels down the Setup chain as a whole-brand diff', async () => {
    const { mock } = mount();
    fireEvent.change(screen.getByDisplayValue(mock.logos[0]!.label), {
      target: { value: 'RAQM lockup' },
    });
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const [id, patch] = update.mock.calls[0]!;
    expect(id).toBe(BRAND.id);
    // Only the logo system moved — a hand-built partial would have emitted a
    // name, palette and typography diff too.
    expect(patch.name).toBeUndefined();
    expect(patch.primaryColor).toBeUndefined();
    expect(patch.logoSystem ?? patch.logoAssets).toBeTruthy();
  });

  it('a role is a single seat — taking it hands the old holder the seat you left', async () => {
    const { mock } = mount();
    const second = mock.logos[1]!;
    const wasFirstRole = mock.logos[0]!.role;
    chooseRole(new RegExp(`^Variant for ${escape(second.label)}$`), 'Primary');

    await waitFor(() => {
      const subs = Array.from(document.querySelectorAll('.bka-logos-sub')).map(
        (el) => el.textContent ?? '',
      );
      // Exactly one Primary, and the same number of variants as before.
      expect(subs.filter((t) => t === 'shown as Primary')).toHaveLength(1);
    });
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(mock.logos.length);
    // Nothing was dropped: the variant that held Primary now holds the seat
    // the mover left.
    const { dialog } = confirm();
    expect(dialog.textContent).toContain('becomes the Primary');
    expect(wasFirstRole).toBeTruthy();
  });

  it('switching a ground off removes its placement from the system', async () => {
    const { mock } = mount();
    const before = screen.getByTestId('logos-preview').children.length;
    const grounds = allBrandGrounds(mock);
    // A ground the system actually placed something on — turning off one it
    // never used would prove nothing.
    const placed = logoCombosFor(mock).find(
      (t) => t.kind === 'pairing' || t.kind === 'treatment',
    )!;
    const target = grounds.find((g) => g.hex.toLowerCase() === placed.bg.hex.toLowerCase())!;
    const row = screen.getByText(target.name).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('logos-preview').children.length).toBeLessThan(before);
    });
    expect(row.textContent).toContain('Not published');

    const { dialog } = confirm();
    expect(dialog.textContent).toContain(`Stop publishing the logo on ${target.name}`);
  });

  it('a ground the brand ruled out is stored, and read back as ruled out', async () => {
    const { mock } = mount();
    const grounds = allBrandGrounds(mock);
    const placed = logoCombosFor(mock).find(
      (t) => t.kind === 'pairing' || t.kind === 'treatment',
    )!;
    const target = grounds.find((g) => g.hex.toLowerCase() === placed.bg.hex.toLowerCase())!;
    const row = screen.getByText(target.name).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    confirm().go();

    await waitFor(() => expect(update).toHaveBeenCalled());
    const patch = update.mock.calls[0]![1];
    expect(patch.guidelines?.logoUsage?.grounds).toBeTruthy();
    expect(
      patch.guidelines!.logoUsage!.grounds!.some(
        (h: string) => h.toLowerCase() === target.hex.toLowerCase(),
      ),
    ).toBe(false);

    // …and the next read of the brand says the same thing.
    const after = { ...BRAND, ...patch } as Brand;
    const reread = brandToMockBrand(after);
    expect(reread.logoGrounds).toBeTruthy();
    expect(
      logoCombosFor(reread).some(
        (t) => t.bg.hex.toLowerCase() === target.hex.toLowerCase() && t.kind !== 'misuse',
      ),
    ).toBe(false);
  });

  it('the last ground cannot be switched off — a system with nowhere to go is not one', async () => {
    const { mock } = mount();
    const grounds = allBrandGrounds(mock);
    for (const g of grounds) {
      const row = screen.getByText(g.name).closest('li') as HTMLElement;
      fireEvent.click(within(row).getByRole('checkbox'));
    }
    await waitFor(() => {
      const on = Array.from(document.querySelectorAll('.bka-logos-ground')).filter(
        (el) => el.getAttribute('data-off') !== 'true',
      );
      // The ground rows and the two treatment rows share a class; only the
      // grounds are counted here by name.
      expect(on.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByTestId('logos-preview').children.length).toBeGreaterThan(0);
  });

  it('dropping a mono cut removes its treatments from the system, and stores it', async () => {
    const { mock } = mount({}, CUT_BRAND);
    const cuts = logoCombosFor(mock).filter((t) => t.kind === 'treatment');
    expect(cuts.length).toBeGreaterThan(0);
    const before = screen.getByTestId('logos-preview').children.length;

    const row = screen.getByText('Black cut').closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    await waitFor(() => expect(row.textContent).toContain('Not offered'));
    // Every black treatment left the wall with it.
    expect(screen.getByTestId('logos-preview').children.length).toBe(before - cuts.length);

    const { dialog } = confirm();
    expect(dialog.textContent).toContain('Stop offering the black cut');
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1].guidelines?.logoUsage?.treatments).toEqual(['white']);
  });

  it('a policy that rules nothing out is not stored — absent stays absent', async () => {
    const { mock } = mount();
    // A rename only. The grounds and cuts were never touched, so no policy
    // is invented for a brand that has not expressed one.
    fireEvent.change(screen.getByDisplayValue(mock.logos[0]!.label), {
      target: { value: 'RAQM lockup' },
    });
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1].guidelines?.logoUsage).toBeUndefined();
  });

  it('Save is dead until something actually changes', () => {
    mount();
    expect(
      (screen.getByRole('button', { name: 'Save logo system' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('cancelling the confirmation writes nothing', () => {
    const { mock } = mount();
    fireEvent.change(screen.getByDisplayValue(mock.logos[0]!.label), {
      target: { value: 'RAQM lockup' },
    });
    const { dialog } = confirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('a brand with nowhere to write says so instead of pretending to save', () => {
    mount({ sourceBrand: null });
    expect(
      (screen.getByRole('button', { name: 'Save logo system' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(document.body.textContent).toContain('not stored yet');
  });

  it('the kit behind the panel repaints from the draft', async () => {
    const { mock, onBrandChange } = mount();
    fireEvent.change(screen.getByDisplayValue(mock.logos[0]!.label), {
      target: { value: 'RAQM lockup' },
    });
    await waitFor(() => {
      const last = onBrandChange.mock.calls.at(-1)?.[0];
      expect(last.logos.some((l: { label: string }) => l.label === 'RAQM lockup')).toBe(true);
    });
  });

  it('a role change TRADES the two slots — no artwork is dropped by the write', async () => {
    const { mock } = mount();
    const before = new Set(
      brandToMockBrand(BRAND).logos.map((l) => l.svg.match(/href="([^"]+)"/)?.[1] ?? l.svg),
    );
    chooseRole(new RegExp(`^Variant for ${escape(mock.logos[1]!.label)}$`), 'Primary');
    confirm().go();
    await waitFor(() => expect(update).toHaveBeenCalled());

    const after = { ...BRAND, ...update.mock.calls[0]![1] } as Brand;
    const reread = brandToMockBrand(after);
    // Same count, same artwork — only the roles moved.
    expect(reread.logos).toHaveLength(mock.logos.length);
    for (const logo of reread.logos) {
      expect(before.has(logo.svg.match(/href="([^"]+)"/)?.[1] ?? logo.svg)).toBe(true);
    }
    expect(reread.logos.filter((l) => l.role === 'primary')).toHaveLength(1);
  });
});

/** Escape a label for use inside a RegExp — logo labels carry punctuation. */
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
