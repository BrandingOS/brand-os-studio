/**
 * Brand Kit's card editor, in a real browser.
 *
 * Quick Edit — inline content editing inside this modal — is retired. The
 * claims this file defends now are the opposite shape:
 *
 *   1. A deliverable's preview shows the brand's real content, but a bound
 *      region on it is NOT an editing surface — no caret, no commit, no
 *      contextual panel. That editing now lives in Design
 *      (`src/features/editor/renderers/template-instance/canvas.browser.test.tsx`
 *      and `properties.browser.test.tsx` carry the moved assertions).
 *   2. Beside the preview, Brand Kit offers a variant switcher — its own
 *      job (choosing which master layout to look at), not an edit.
 *   3. The footer hands a deliverable off to Design (`Use Template` /
 *      `Edit Template`) instead of Saving it.
 *   4. The brand-asset editors (icon weight, colour shades, font scale)
 *      are untouched by any of this and still work, still Save.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { BrandKitCardEditor, type EditorTarget } from '../components/BrandKitCardEditor';
import { variantsForCard } from '../data/legacy-mapping';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import type { BrandKitTemplate } from '@/features/brandkit/types';

const sourceBrand = {
  id: 'brand-qe',
  slug: 'qe',
  name: 'Raqm',
  primaryColor: '#7231FF',
  secondaryColor: '#00D4AA',
  fonts: { primary: 'Inter' },
} as unknown as Brand;

/** A target aimed at one real variant of a deliverable. */
function targetFor(
  sectionKey: EditorTarget['sectionKey'],
  label: string,
  templateId: string,
): EditorTarget {
  const templates = variantsForCard(sectionKey, label, mockBrand);
  const template = templates.find((t) => t.id === templateId);
  if (!template) throw new Error(`no template ${templateId}`);
  return { sectionKey, label, cover: '', covers: [], templates, template };
}

/** A target aimed at the CARD, with no variant pre-selected — the shape
 *  `onEditCard` (right-click Edit) produces. Exercises the "default to
 *  the first variant" seeding path. */
function cardTargetFor(sectionKey: EditorTarget['sectionKey'], label: string): EditorTarget {
  const templates = variantsForCard(sectionKey, label, mockBrand);
  return { sectionKey, label, cover: '', covers: [], templates };
}

const INVOICE = () => targetFor('stationery', 'Invoice', 'invoices-ext-3');
const CARD = () => targetFor('stationery', 'Business Card', 'business-cards-ext-3');
const ICON = () => targetFor('brand-assets', 'Icons', 'brand-asset-icon-ext-1');
const COLOR = () => targetFor('brand-assets', 'Colors', 'brand-asset-color-ext-1');
const FONT = () => targetFor('brand-assets', 'Fonts', 'brand-asset-font-ext-1');

function renderEditor(
  target: EditorTarget,
  overrides: Partial<Parameters<typeof BrandKitCardEditor>[0]> = {},
) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const onDownload = vi.fn();
  const onUpdateIconAt = vi.fn();
  render(
    <BrandKitCardEditor
      brand={mockBrand}
      sourceBrand={sourceBrand}
      target={target}
      initialCustomization={null}
      onClose={onClose}
      onSave={onSave}
      onDownload={onDownload}
      onUpdateIconAt={onUpdateIconAt}
      {...overrides}
    />,
  );
  return { onSave, onClose, onDownload, onUpdateIconAt };
}

/** The preview's bound region for a content path, if the design shows it. */
function region(path: string): HTMLElement {
  const el = document.querySelector(
    `.bk-editor-preview-frame [data-bind="${path}"]`,
  ) as HTMLElement | null;
  if (!el) throw new Error(`no bound region for ${path}`);
  return el;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('the preview is not an editing surface', () => {
  it('shows the deliverable’s real content on the artifact', () => {
    renderEditor(INVOICE());
    expect(region('clientName').textContent).toBe('Acme Co.');
    expect(region('lineItems.0.label').textContent).toBe('Brand Strategy');
  });

  it('marks no region as editable — the hook the editing affordances key off is absent', () => {
    renderEditor(INVOICE());
    expect(region('clientName').hasAttribute('data-bind-editable')).toBe(false);
  });

  it('does not open a caret on click', () => {
    renderEditor(INVOICE());
    const el = region('clientName');
    fireEvent.click(el);
    expect(el.getAttribute('contenteditable')).toBeNull();
    expect(el.hasAttribute('data-bind-editing')).toBe(false);
    expect(el.hasAttribute('data-bind-selected')).toBe(false);
  });

  it('does not commit typed text — there is no caret to type into', () => {
    renderEditor(INVOICE());
    const el = region('clientName');
    fireEvent.click(el);
    el.textContent = 'Globex Corporation';
    fireEvent.blur(el);
    // Nothing wired this to state; React never re-renders it away, but
    // there is no model write and no panel reflecting a change either.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('mounts no contextual panel at all — Quick Edit’s panel is gone from Brand Kit', () => {
    renderEditor(INVOICE());
    expect(document.querySelector('.bk-qe-panel')).toBeNull();
  });

  it('never offers the card thumbnail picker beside a live preview', () => {
    renderEditor(INVOICE());
    expect(screen.queryByText('Pick the cover for this card.')).toBeNull();
  });
});

describe('the variant switcher', () => {
  it('renders the deliverable’s other layouts as tiles', () => {
    renderEditor(INVOICE());
    const tiles = document.querySelectorAll('.bk-editor-variants .bk-variant-tile');
    expect(tiles.length).toBeGreaterThan(1);
  });

  it('marks the currently-previewed layout selected', () => {
    renderEditor(INVOICE());
    const selected = document.querySelector('.bk-editor-variants .bk-variant-tile.is-selected');
    expect(selected).toBeTruthy();
    expect(selected?.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the selected tile on click — a preview switch, not an edit', () => {
    renderEditor(INVOICE());
    const tiles = Array.from(
      document.querySelectorAll<HTMLElement>('.bk-editor-variants .bk-variant-tile'),
    );
    const initiallySelected = tiles.find((t) => t.classList.contains('is-selected'));
    const next = tiles.find((t) => t !== initiallySelected);
    expect(next).toBeTruthy();

    fireEvent.click(next!);

    expect(next!.classList.contains('is-selected')).toBe(true);
    expect(initiallySelected!.classList.contains('is-selected')).toBe(false);
  });

  it('defaults the preview to a real variant when the editor opens from a card directly', () => {
    renderEditor(cardTargetFor('stationery', 'Invoice'));
    // No target.template was supplied, yet the artifact still previews the
    // FIRST of the deliverable's own variants — proof the modal seeded a
    // real layout rather than falling back to the static cover-image
    // branch (which a null template would otherwise hit).
    expect(document.querySelector('.bk-editor-preview-card--live')).toBeTruthy();
    expect(
      document.querySelector('.bk-editor-preview-card:not(.bk-editor-preview-card--live)'),
    ).toBeNull();
  });

  it('offers no switcher for a brand-asset target — one icon is one asset, not a family of layouts', () => {
    renderEditor(ICON());
    expect(document.querySelector('.bk-editor-variants')).toBeNull();
  });
});

describe('the footer hands a deliverable to Design', () => {
  it('shows Use Template and Edit Template instead of Save', () => {
    renderEditor(INVOICE());
    expect(screen.getByText('Use Template')).toBeTruthy();
    expect(screen.getByText('Edit Template')).toBeTruthy();
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('calls onUseTemplate with the previewed variant', () => {
    const onUseTemplate = vi.fn();
    renderEditor(INVOICE(), { onUseTemplate });
    fireEvent.click(screen.getByText('Use Template'));
    expect(onUseTemplate).toHaveBeenCalledTimes(1);
    const template = onUseTemplate.mock.calls[0][0] as BrandKitTemplate;
    expect(template.id).toBe('invoices-ext-3');
  });

  it('calls onEditTemplate with the previewed variant', () => {
    const onEditTemplate = vi.fn();
    renderEditor(INVOICE(), { onEditTemplate });
    fireEvent.click(screen.getByText('Edit Template'));
    expect(onEditTemplate).toHaveBeenCalledTimes(1);
    expect((onEditTemplate.mock.calls[0][0] as BrandKitTemplate).id).toBe('invoices-ext-3');
  });

  it('follows the switcher — using a different layout uses THAT layout', () => {
    const onUseTemplate = vi.fn();
    renderEditor(INVOICE(), { onUseTemplate });
    const tiles = Array.from(
      document.querySelectorAll<HTMLElement>('.bk-editor-variants .bk-variant-tile'),
    );
    const next = tiles.find((t) => !t.classList.contains('is-selected'))!;
    fireEvent.click(next);

    fireEvent.click(screen.getByText('Use Template'));
    const template = onUseTemplate.mock.calls[0][0] as BrandKitTemplate;
    expect(template.id).not.toBe('invoices-ext-3');
  });

  it('disables both actions when the page has not wired this family to Design yet', () => {
    // No onUseTemplate/onEditTemplate handed down — mirrors every
    // deliverable except Invoice today ("Invoice remains the only wired
    // family").
    renderEditor(CARD());
    expect(screen.getByText('Use Template').closest('button')).toBeDisabled();
    expect(screen.getByText('Edit Template').closest('button')).toBeDisabled();
  });

  it('still offers Cancel and Download for a deliverable', () => {
    const { onClose, onDownload } = renderEditor(INVOICE());
    fireEvent.click(screen.getByText('Download'));
    expect(onDownload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('brand-asset editors — untouched, still work', () => {
  it('icon: previews the glyph and Save persists the picked weight', () => {
    const { onSave, onUpdateIconAt } = renderEditor(ICON());
    expect(document.querySelector('.bk-editor-icon-glyph')).toBeTruthy();

    const boldWeight = screen.getByTitle('Bold');
    fireEvent.click(boldWeight);
    expect(boldWeight).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByText('Save'));
    expect(onUpdateIconAt).toHaveBeenCalledTimes(1);
    const [index, className] = onUpdateIconAt.mock.calls[0] as [number, string];
    expect(index).toBe(0);
    expect(className).toContain('fi-br-');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('icon: has no variant switcher, no deliverable footer — Save only', () => {
    renderEditor(ICON());
    expect(screen.queryByText('Use Template')).toBeNull();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('color: previews the swatch with role/name/hex and Save persists', () => {
    const { onSave } = renderEditor(COLOR());
    expect(document.querySelector('.bk-editor-preview-card--color')).toBeTruthy();
    expect(screen.getAllByText(/Primary|Secondary|Background|Accent|Neutral/)[0]).toBeTruthy();

    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('color: renders a shade ladder', () => {
    renderEditor(COLOR());
    const shades = document.querySelectorAll('.bk-editor-color-shade');
    expect(shades.length).toBe(9);
  });

  it('font: renders a type scale and a weight list', () => {
    renderEditor(FONT());
    expect(document.querySelector('.bk-editor-font-scale')).toBeTruthy();
    expect(document.querySelectorAll('.bk-editor-font-weight-row').length).toBeGreaterThan(0);
  });

  it('font: hovering a weight row highlights the matching scale row', () => {
    renderEditor(FONT());
    const row = document.querySelector('.bk-editor-font-weight-row') as HTMLElement;
    fireEvent.mouseEnter(row);
    expect(document.querySelector('.bk-editor-font-scale-row.is-highlighted')).toBeTruthy();
  });

  it('font: Save persists without a variant switcher or Design handoff', () => {
    const { onSave } = renderEditor(FONT());
    expect(document.querySelector('.bk-editor-variants')).toBeNull();
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
