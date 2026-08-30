/**
 * The Typography editor — the specimen is the brand's, and Save reaches it.
 *
 * A browser test rather than jsdom because the thing this panel exists to
 * fix is a COMPUTED style: the old editor drew "Your font" in the
 * product's own Inter (D36), and jsdom, having no cascade, would report
 * that as a pass. Here `getComputedStyle` answers with the real stack.
 *
 * The write is asserted at the seam that matters — the patch handed to
 * `useBrandStore.update` — because that is the road Setup travels too.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { parseWeights } from '../../../data/fontExport';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import {
  TypographyEditor,
  buildScaleTokens,
  previewStack,
  scaleFromTokens,
  stepSize,
} from '../TypographyEditor';

/** Raqm: Inter + DM Sans, both on Google. */
const RAQM: Brand = SEED_BRANDS[0]!;
/**
 * SKAM: GT Super — a foundry family nothing can fetch — over Bricolage.
 *
 * The seed's serif lives in `guidelines.typography`, which is a DIFFERENT
 * field from the canonical `brand.typography` this panel reads and writes;
 * `brandToMockBrand` falls back to the legacy `brand.fonts` pair. Naming
 * the canonical token here is what makes the fixture a brand that has been
 * through a canonical write, which is the case the panel is for.
 */
const SKAM: Brand = {
  ...SEED_BRANDS[1]!,
  typography: {
    primary: { family: 'GT Super', weights: [400, 500, 700], fallbacks: ['Georgia', 'serif'] },
    secondary: { family: 'Bricolage Grotesque', weights: [400, 600, 700, 800] },
  },
};

/** The same brand, with the licensed files the user actually uploaded. */
const SKAM_WITH_FILES: Brand = {
  ...SKAM,
  typography: {
    ...SKAM.typography!,
    primary: {
      ...SKAM.typography!.primary,
      files: [
        {
          name: 'GTSuper-Regular.ttf',
          weight: 'Regular',
          format: 'ttf',
          dataUrl: 'data:font/ttf;base64,AAA=',
          size: 3,
        },
      ],
    },
  },
};

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
  document.head
    .querySelectorAll('link[data-brand-kit-font-preview]')
    .forEach((el) => el.remove());
});

function mount(brand: Brand = RAQM) {
  const mock = brandToMockBrand(brand);
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <TypographyEditor
      open
      onClose={onClose}
      brand={mock}
      sourceBrand={brand}
      onBrandChange={onBrandChange}
    />,
  );
  return { ...view, mock, onBrandChange, onClose };
}

function confirmSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save typography' }));
  const dialog = screen.getByRole('alertdialog');
  return {
    dialog,
    go: () =>
      fireEvent.click(within(dialog).getByRole('button', { name: 'Change the typography' })),
  };
}

/* ─── The scale, as arithmetic ─────────────────────────────────────── */

describe('the scale', () => {
  it('is one base and one ratio, and every step follows from them', () => {
    expect(stepSize(16, 1.25, 0)).toBe(16);
    expect(stepSize(16, 1.25, 1)).toBe(20);
    expect(stepSize(16, 1.25, 6)).toBe(61);
    expect(stepSize(16, 1.25, -2)).toBe(10.2);
  });

  it('writes all eleven role tokens as px strings', () => {
    const tokens = buildScaleTokens(16, 1.25);
    expect(Object.keys(tokens)).toHaveLength(11);
    expect(tokens.body).toBe('16px');
    expect(tokens.h1).toBe('61px');
    // Roles that share a step share a size — a scale has steps, and
    // inventing a distinct size per role invents sizes nobody chose.
    expect(tokens.caption).toBe(tokens.overline);
    expect(tokens.bodyLarge).toBe(tokens.h6);
  });

  it('reads a stored scale back as the two numbers it came from', () => {
    // Otherwise every visit proposes the default and the user's own scale
    // is one Save away from being replaced by it.
    const round = scaleFromTokens(buildScaleTokens(18, 1.333));
    expect(round.base).toBe(18);
    expect(round.ratio).toBe('1.333');
    expect(scaleFromTokens(undefined)).toEqual({ base: 16, ratio: '1.250' });
  });
});

describe('previewStack', () => {
  it('names the family first and a matching generic last', () => {
    expect(previewStack('GT Super')).toBe("'GT Super', Georgia, 'Times New Roman', Times, serif");
    expect(previewStack('Inter')).toContain('Inter, system-ui');
  });

  it('keeps a declared fallback between the two', () => {
    expect(previewStack('DM Sans', 'Helvetica Neue')).toContain("'DM Sans', Helvetica Neue,");
  });
});

/* ─── The panel ────────────────────────────────────────────────────── */

describe('TypographyEditor', () => {
  it('draws the specimen in the BRAND’s families, never the product’s (D35/D36)', () => {
    mount();
    const specimen = screen.getByTestId('typography-specimen');
    const rows = Array.from(
      specimen.querySelectorAll<HTMLElement>('.bka-type-specimen-text'),
    );
    expect(rows.length).toBe(4);
    const heading = rows.find((r) => r.dataset.role === 'heading')!;
    const body = rows.find((r) => r.dataset.role === 'body')!;
    expect(getComputedStyle(heading).fontFamily).toContain('Inter');
    expect(getComputedStyle(body).fontFamily).toContain('DM Sans');
    // The placeholder the old panel showed instead of the brand.
    expect(document.body.textContent).not.toContain('Your font');
  });

  it('names each step at its real size, even where the drawing is capped', () => {
    mount();
    const specimen = screen.getByTestId('typography-specimen');
    expect(specimen.textContent).toContain('H1 · 61px');
    expect(specimen.textContent).toContain('Body · 16px');
  });

  it('shows one slot per stored position, with the family the brand holds', () => {
    mount();
    expect(screen.getByText('Headings')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Change the headings typeface/i }).textContent).toContain(
      'Inter',
    );
  });

  it('draws every weight chip in the family, at that weight', () => {
    const { mock } = mount(SKAM);
    const group = screen.getByRole('group', { name: 'Body weights' });
    const chips = Array.from(group.querySelectorAll<HTMLElement>('.ds-chip'));
    // Nine, because that is what a `font-weight` is — the panel is not
    // opinionated about which of them a brand should want.
    expect(chips).toHaveLength(9);
    const glyph = chips[6]!.querySelector('span')!; // 700
    expect(getComputedStyle(glyph).fontWeight).toBe('700');
    expect(getComputedStyle(glyph).fontFamily).toContain('Bricolage Grotesque');
    // The brand's OWN declared set is the one that is on.
    const declared = parseWeights(mock.fonts[1]!.weights);
    expect(declared).toEqual([400, 600, 700, 800]);
    const active = chips
      .filter((c) => c.getAttribute('aria-pressed') === 'true')
      .map((c) => c.textContent);
    expect(active).toEqual(declared.map((w) => `Aa${w}`));
  });

  it('will not let the last weight be turned off', () => {
    mount();
    const group = screen.getByRole('group', { name: 'Body weights' });
    const chips = Array.from(group.querySelectorAll<HTMLElement>('.ds-chip'));
    for (const chip of chips) {
      if (chip.getAttribute('aria-pressed') === 'true') fireEvent.click(chip);
    }
    const still = chips.filter((c) => c.getAttribute('aria-pressed') === 'true');
    expect(still).toHaveLength(1);
  });

  it('previews a chosen family before it is saved, in that family', async () => {
    const { onBrandChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Change the headings typeface/i }));
    fireEvent.change(screen.getByLabelText('Search a typeface for Headings'), {
      target: { value: 'fraunces' },
    });
    fireEvent.click(await screen.findByText('Fraunces'));

    const specimen = screen.getByTestId('typography-specimen');
    const heading = specimen.querySelector<HTMLElement>('[data-role="heading"]')!;
    expect(getComputedStyle(heading).fontFamily).toContain('Fraunces');
    // The kit behind the panel repaints from the same draft.
    await waitFor(() => {
      const last = onBrandChange.mock.calls.at(-1)![0];
      expect(last.fonts[0].family).toBe('Fraunces');
    });
  });

  it('never asks Google for a family it has never heard of (D33/D34)', () => {
    mount(SKAM);
    fireEvent.click(screen.getByRole('button', { name: /Change the headings typeface/i }));
    const rows = screen.getAllByRole('listitem').length;
    expect(rows).toBeGreaterThan(8);
    const links = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[data-brand-kit-font-preview]'),
    );
    // One sheet per BATCH — the closed panel's two families, then the
    // open list — never one request per row.
    expect(links.length).toBeLessThanOrEqual(2);
    expect(links.length).toBeLessThan(rows);
    for (const link of links) {
      // A foundry family is never asked for, however the URL spells it.
      expect(link.href).not.toMatch(/GT(\+|%20)Super/);
      expect(link.href).toContain('fonts.googleapis.com');
    }
  });

  it('says in words that a foundry family cannot be bundled (D32)', () => {
    mount(SKAM);
    expect(document.body.textContent).toContain('Not bundled');
    expect(document.body.textContent).toContain('is not on Google Fonts');
    expect(document.body.textContent).toContain('Upload your licensed copy');
  });

  it('lists every change before it makes any of them', () => {
    mount();
    // Nothing changed → nothing to save.
    expect(screen.getByRole('button', { name: 'Save typography' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: /Change the body typeface/i }));
    fireEvent.change(screen.getByLabelText('Search a typeface for Body'), {
      target: { value: 'Lora' },
    });
    fireEvent.click(screen.getByText('Lora'));
    const { dialog } = confirmSave();
    expect(dialog.textContent).toContain('Body: DM Sans → Lora');
  });

  it('warns that an uploaded family stops being used when it is replaced', () => {
    mount(SKAM_WITH_FILES);
    expect(document.body.textContent).toContain('Your files');
    fireEvent.click(screen.getByRole('button', { name: /Change the headings typeface/i }));
    fireEvent.change(screen.getByLabelText('Search a typeface for Headings'), {
      target: { value: 'Lora' },
    });
    fireEvent.click(screen.getByText('Lora'));
    const { dialog } = confirmSave();
    expect(dialog.textContent).toContain("GT Super's uploaded files stop being used");
  });

  it('writes the family down the Setup chain, and the weights and scale beside it', async () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Change the headings typeface/i }));
    fireEvent.change(screen.getByLabelText('Search a typeface for Headings'), {
      target: { value: 'Fraunces' },
    });
    fireEvent.click(screen.getByText('Fraunces'));
    // Add 700 to the heading set.
    const group = screen.getByRole('group', { name: 'Headings weights' });
    const chips = Array.from(group.querySelectorAll<HTMLElement>('.ds-chip'));
    fireEvent.click(chips[6]!); // 700

    confirmSave().go();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const [id, patch] = update.mock.calls[0]!;
    expect(id).toBe(RAQM.id);
    // The legacy field the chain owns…
    expect(patch.fonts.primary).toBe('Fraunces');
    // …and the canonical token, carrying what the chain cannot.
    expect(patch.typography.primary.family).toBe('Fraunces');
    expect(patch.typography.primary.weights).toEqual([400, 700]);
    expect(patch.typography.secondary.family).toBe('DM Sans');
    expect(patch.typography.scale.body).toBe('16px');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not carry an uploaded family’s bytes over to the family that replaced it', async () => {
    mount(SKAM_WITH_FILES);
    fireEvent.click(screen.getByRole('button', { name: /Change the headings typeface/i }));
    fireEvent.change(screen.getByLabelText('Search a typeface for Headings'), {
      target: { value: 'Lora' },
    });
    fireEvent.click(screen.getByText('Lora'));
    confirmSave().go();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const patch = update.mock.calls[0]![1];
    expect(patch.typography.primary.family).toBe('Lora');
    // The browser would otherwise register GT Super's bytes as Lora.
    expect(patch.typography.primary.files).toBeUndefined();
  });

  it('changes the scale on its own, without touching a typeface', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Base size in pixels'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Scale ratio' }));
    fireEvent.click(screen.getByRole('option', { name: /Perfect fourth/ }));
    const { dialog } = confirmSave();
    expect(dialog.textContent).toContain('18px base on Perfect fourth');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change the typography' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const patch = update.mock.calls[0]![1];
    expect(patch.typography.scale.body).toBe('18px');
    expect(patch.typography.scale.h1).toBe(`${stepSize(18, 1.333, 6)}px`);
    expect(patch.typography.primary.family).toBe('Inter');
  });

  /**
   * QA Q5, end to end from the control the user touches.
   *
   * The panel was never the culprit — it already sent the scale in its patch,
   * which is exactly why the confirmation looked honest. The value was dropped
   * TWICE downstream: `typographyChangesFrom` unpacked two families out of the
   * patch and threw the rest away, and `overlayStoredIdentity` rebuilt
   * `typography` from two named keys on every READ. So the assertion has to
   * follow the patch back THROUGH the read — merge it, re-migrate it the way
   * the store does, and look at the scale the next paint would show.
   */
  it('a saved base size survives the read, which is where it used to vanish', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Base size in pixels'), { target: { value: '18' } });
    confirmSave().go();

    await waitFor(() => expect(update).toHaveBeenCalled());
    const patch = update.mock.calls[0]![1];

    const saved = migrateBrandToCurrent({ ...RAQM, ...patch } as Brand);
    expect(saved.typography?.scale?.body).toBe('18px');
    // And the panel, reopened on that brand, proposes 18 rather than 16.
    expect(scaleFromTokens(saved.typography?.scale).base).toBe(18);
  });
});
