/**
 * Smoke tests for the Toolbar editor (/_dev/toolbar-editor).
 *
 * One mini editor with every toolbar working for real. These pin that the
 * page mounts pre-seeded with one block per toolbar family, that selecting
 * a block raises ITS OWN toolbar (chart / card / text), and that the
 * Insert menu genuinely adds a block.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { MemoryRouter } from 'react-router-dom';
import DevToolbarEditorPage from './toolbar-editor';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/_dev/toolbar-editor']}>
      <DevToolbarEditorPage />
    </MemoryRouter>,
  );
}

const blocks = () => document.querySelectorAll<HTMLElement>('[data-sandbox-block]');

beforeEach(async () => {
  cleanup();
  await page.viewport(1440, 900);
});

afterEach(async () => {
  await page.viewport(414, 896);
});

describe('toolbar editor', () => {
  it('mounts the canvas pre-seeded with one block per toolbar family', () => {
    mount();
    expect(screen.getByText('Toolbar editor')).toBeTruthy();
    const canvas = document.querySelector('[data-canvas-sandbox]')!;
    expect(canvas).toBeTruthy();
    // Text + chart + image ride sandbox blocks; the card floats free.
    expect(blocks().length).toBe(3);
    expect(canvas.querySelector('[data-element="column-chart"]')).toBeTruthy();
    expect(canvas.querySelector('[data-card="vertical"]')).toBeTruthy();
    expect(canvas.querySelector('[data-sandbox-image]')).toBeTruthy();
    // The insert bar is there (aria-expanded separates it from any text).
    expect(screen.getByRole('button', { name: 'Insert', expanded: false })).toBeTruthy();
  });

  it('selecting a block raises its own toolbar — chart, card, text', async () => {
    mount();
    const canvas = document.querySelector('[data-canvas-sandbox]') as HTMLElement;

    // The chart block → ChartToolbar.
    const chartBlock = canvas
      .querySelector('[data-element="column-chart"]')!
      .closest('[data-sandbox-block]') as HTMLElement;
    fireEvent.mouseDown(chartBlock);
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Chart settings' })).toBeTruthy();
    });

    // The card → its OWN CardToolbar (the card manages itself — no
    // sandbox frame, no second bar).
    fireEvent.mouseDown(canvas.querySelector('[data-card="vertical"]')!);
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Card size' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Chart settings' })).toBeNull();
    });

    // The text block → the text FloatingToolbar; the card bar LEAVES
    // (one toolbar at a time, whichever block was touched last).
    const textBlock = blocks()[0];
    fireEvent.mouseDown(textBlock);
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Card size' })).toBeNull();
      expect(screen.getByText('Medium')).toBeTruthy();
    });
  });

  it('dragging a bar rewrites its value — never selects or moves the block', async () => {
    mount();
    const canvas = document.querySelector('[data-canvas-sandbox]') as HTMLElement;
    const chartBlock = canvas
      .querySelector('[data-element="column-chart"]')!
      .closest('[data-sandbox-block]') as HTMLElement;
    const leftBefore = chartBlock.style.left;
    const bar = chartBlock.querySelectorAll<SVGPathElement>('.el-grow-y')[0];
    const d0 = bar.getAttribute('d');
    // Pull the first column UP: its value grows, its path morphs…
    fireEvent.mouseDown(bar, { clientX: 300, clientY: 400 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 330 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(
        chartBlock.querySelectorAll<SVGPathElement>('.el-grow-y')[0].getAttribute('d'),
      ).not.toBe(d0);
    });
    // …and the BLOCK never noticed: no selection, no move, no toolbar.
    expect(chartBlock.dataset.selected).toBeUndefined();
    expect(chartBlock.style.left).toBe(leftBefore);
    expect(screen.queryByRole('button', { name: 'Chart settings' })).toBeNull();
  });

  it('chart toolbar settings drive the sandbox chart for real', async () => {
    mount();
    const canvas = document.querySelector('[data-canvas-sandbox]') as HTMLElement;
    const chartBlock = canvas
      .querySelector('[data-element="column-chart"]')!
      .closest('[data-sandbox-block]') as HTMLElement;
    fireEvent.mouseDown(chartBlock);
    fireEvent.mouseUp(document);

    // Edit data → the REAL spreadsheet modal wired to THIS chart.
    fireEvent.click(await waitFor(() => screen.getByText('Edit data')));
    const cell = await waitFor(() => screen.getByLabelText('Row 1 Sales') as HTMLInputElement);
    expect(cell.value).toBe('40');
    fireEvent.change(cell, { target: { value: '95' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByLabelText('Row 1 Sales')).toBeNull();
    });
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect((screen.getByLabelText('Row 1 Sales') as HTMLInputElement).value).toBe('95');
    });
    fireEvent.click(screen.getByText('Cancel'));

    // Settings → General → Legend off: the pill leaves the chart.
    expect(chartBlock.querySelector('[data-chart-legend]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: 'General' })));
    fireEvent.click(await waitFor(() => screen.getByRole('switch', { name: 'Legend' })));
    await waitFor(() => {
      expect(chartBlock.querySelector('[data-chart-legend]')).toBeNull();
    });
    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('switch', { name: 'Legend' })).toBeNull();
    });

    // Expand ⤢ → fullscreen on the working ground; Escape closes.
    fireEvent.click(screen.getByLabelText('Expand chart'));
    await waitFor(() => {
      expect(document.querySelector('[data-chart-fullscreen]')).toBeTruthy();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.querySelector('[data-chart-fullscreen]')).toBeNull();
    });
  });

  it('the image toolbar drives the media block — replace menu and fit', async () => {
    mount();
    const canvas = document.querySelector('[data-canvas-sandbox]') as HTMLElement;
    const img = () => canvas.querySelector('[data-sandbox-image]') as HTMLImageElement;
    const block = img().closest('[data-sandbox-block]') as HTMLElement;
    fireEvent.mouseDown(block);
    fireEvent.mouseUp(document);

    // The fit button cycles Cover → Contain and the IMAGE follows.
    fireEvent.click(await waitFor(() => screen.getByText('Cover')));
    await waitFor(() => {
      expect(img().style.objectFit).toBe('contain');
      expect(screen.getByText('Contain')).toBeTruthy();
    });

    // Replace opens the upload + brand-assets menu.
    fireEvent.click(screen.getByText('Replace'));
    await waitFor(() => {
      expect(screen.getByText('Upload from device')).toBeTruthy();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('Insert adds a block from the widget menu', async () => {
    mount();
    const before = blocks().length;
    fireEvent.click(screen.getByRole('button', { name: 'Insert', expanded: false }));
    // The family row's accessible name includes its Beta badge.
    fireEvent.mouseOver(await waitFor(() => screen.getByRole('menuitem', { name: /^Chart/ })));
    const pie = await waitFor(() => screen.getByRole('menuitem', { name: 'Pie chart' }));
    fireEvent.click(pie);
    await waitFor(() => {
      expect(blocks().length).toBe(before + 1);
      expect(
        document.querySelector('[data-canvas-sandbox] [data-element="pie-chart"]'),
      ).toBeTruthy();
    });
  });
});
