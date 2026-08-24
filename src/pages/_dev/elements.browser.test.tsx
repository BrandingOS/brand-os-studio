/**
 * Smoke tests for the Elements lab (/_dev/elements).
 *
 * The lab is where the Insert menu's element library gets built and
 * restyled; a lab that silently stops mounting defeats that. These pin that
 * every group and element renders, that the charts really are SVG with
 * their entrance-animation classes, and that Replay genuinely remounts.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { MemoryRouter } from 'react-router-dom';
import DevElementsPage from './elements';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/_dev/elements']}>
      <DevElementsPage />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  cleanup();
  localStorage.removeItem('brandos:elements-lab:view');
  await page.viewport(1440, 900);
});

afterEach(async () => {
  await page.viewport(414, 896);
});

describe('elements lab', () => {
  it('mounts every group and all eleven charts', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Elements' })).toBeTruthy();
    // Each group renders twice: the sidebar label and the main header.
    // 'Media' a third time — the canvas sandbox's toolbar action.
    for (const group of ['Charts', 'Cards', 'Media', 'Mockups', 'Notes & links']) {
      expect(screen.getAllByText(group).length).toBe(group === 'Media' ? 3 : 2);
    }
    // Scoped to the library cards — the playground shows a 12th, live
    // chart. Eleven since the Combo was removed (owner, 2026-08-22).
    expect(document.querySelectorAll('section [data-element$="-chart"]').length).toBe(11);
    // A few non-chart shapes, by their element markers.
    for (const id of ['phone-mockup', 'sticky-note', 'qr-code']) {
      expect(document.querySelector(`[data-element="${id}"]`)).toBeTruthy();
    }
    // The Cards group mounts the REAL interactive cards (CardBlocks),
    // not the wireframe previews (owner request 2026-08-23).
    for (const kind of ['vertical', 'image', 'metric', 'horizontal']) {
      expect(document.querySelector(`section [data-card="${kind}"]`)).toBeTruthy();
    }
    // And they LAY OUT: the stage's children are all absolute, so a
    // centering parent once collapsed it to 0 width and the cards were
    // "there" but invisible (owner report 2026-08-23).
    document.querySelectorAll<HTMLElement>('section [data-card-stage]').forEach((stage) => {
      expect(stage.offsetWidth).toBeGreaterThan(200);
    });
  });

  it('charts carry their entrance-animation classes', () => {
    mount();
    const line = document.querySelector('[data-element="line-chart"]')!;
    expect(line.querySelector('path.el-draw')).toBeTruthy();
    const column = document.querySelector('[data-element="column-chart"]')!;
    expect(column.querySelectorAll('.el-grow-y').length).toBeGreaterThan(0);
    const donut = document.querySelector('[data-element="donut-chart"]')!;
    expect(donut.querySelectorAll('path.el-draw').length).toBe(4);
  });

  it('Replay remounts the element so the animation runs again', async () => {
    mount();
    const before = document.querySelector('section [data-element="column-chart"]')!;
    const card = before.closest('section')!;
    fireEvent.click(within(card as HTMLElement).getByText('Replay'));
    await waitFor(() => {
      const after = document.querySelector('section [data-element="column-chart"]');
      expect(after).toBeTruthy();
      expect(after).not.toBe(before);
    });
  });

  it('the playground morphs the chart when a cell changes', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    expect(playground).toBeTruthy();
    // Columns are top-rounded PATHS now — their geometry lives in `d`.
    const shapes = () =>
      Array.from(
        playground.querySelectorAll<SVGPathElement>('[data-element="column-chart"] .el-grow-y'),
      ).map((el) => el.getAttribute('d'));
    const before = shapes();
    expect(before.length).toBe(6);
    // The side data panel is gone (owner request 2026-08-23) — cells are
    // edited in the toolbar's Edit data modal.
    fireEvent.click(screen.getByText('Edit data'));
    const cell = await waitFor(() => screen.getByLabelText('Row 1 Sales') as HTMLInputElement);
    fireEvent.change(cell, { target: { value: '95' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(shapes()[0]).not.toBe(before[0]);
    });
  });

  it('printed values are display-only — no type-in-place input replaces them', async () => {
    mount();
    const playground = within(document.querySelector('[data-playground]') as HTMLElement);
    // Owner decision 2026-08-22: a number changes by dragging its shape or
    // through the data editor, never by typing over the printed value.
    expect(playground.queryByLabelText('Chart value 1')).toBeNull();
    fireEvent.click(playground.getByText('Line'));
    await waitFor(() => {
      expect(
        document.querySelector('[data-playground] [data-element="line-chart"]'),
      ).toBeTruthy();
    });
    expect(playground.queryByLabelText('Chart value 1')).toBeNull();
  });

  it('dragging a column rewrites its value through the chart scale', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    const bar = playground.querySelectorAll<SVGRectElement>(
      '[data-element="column-chart"] .el-grow-y',
    )[0];
    fireEvent.mouseDown(bar, { clientX: 400, clientY: 500 });
    fireEvent.mouseMove(document, { clientX: 400, clientY: 420 });
    fireEvent.mouseUp(document);
    // The write lands in the data — the Edit data modal shows it.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      const cell = screen.getByLabelText('Row 1 Sales') as HTMLInputElement;
      expect(Number(cell.value)).toBeGreaterThan(40);
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('typing on an axis label renames it everywhere', async () => {
    mount();
    const playground = within(document.querySelector('[data-playground]') as HTMLElement);
    fireEvent.change(playground.getByLabelText('Chart label 1'), { target: { value: 'Week 1' } });
    // The rename reached the DATA — the Edit data grid holds it.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect((screen.getByLabelText('Row 1 Labels') as HTMLInputElement).value).toBe('Week 1');
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('the bar chart prints its value centered beside the bar', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Bar'));
    const bar = await waitFor(() => {
      const el = playground.querySelector<SVGRectElement>(
        '[data-element="bar-chart"] .el-grow-x',
      );
      expect(el).toBeTruthy();
      return el!;
    });
    // Value texts carry data-chart-value — ticks and the legend are also
    // <text> now, so the bare tag would match the wrong one.
    const value = playground.querySelector<SVGTextElement>(
      '[data-element="bar-chart"] text[data-chart-value]',
    )!;
    expect(value).toBeTruthy();
    const barBox = bar.getBoundingClientRect();
    const valueBox = value.getBoundingClientRect();
    const barCenter = barBox.top + barBox.height / 2;
    const valueCenter = valueBox.top + valueBox.height / 2;
    // The number sits vertically centered on the bar, never sagging below.
    expect(Math.abs(valueCenter - barCenter)).toBeLessThan(5);
  });

  it('hovering a category veils its whole column, reference-style', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.mouseOver(
      playground.querySelectorAll('[data-element="column-chart"] .el-grow-y')[1],
    );
    await waitFor(() => {
      expect(playground.querySelector('[data-chart-highlight]')).toBeTruthy();
    });
  });

  it('dragging a donut slice rewrites its value', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Donut'));
    const slice = await waitFor(() => {
      const el = playground.querySelector<SVGPathElement>(
        '[data-element="donut-chart"] path.el-draw',
      );
      expect(el).toBeTruthy();
      return el!;
    });
    fireEvent.mouseDown(slice, { clientX: 300, clientY: 400 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 350 });
    fireEvent.mouseUp(document);
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      const cell = screen.getByLabelText('Row 1 Sales') as HTMLInputElement;
      expect(Number(cell.value)).toBeGreaterThan(40);
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('stacked charts draw a legend pill per series, each renamable', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Stacked column'));
    const second = await waitFor(
      () => within(playground).getByLabelText('Legend name 2') as HTMLInputElement,
    );
    expect(second.value).toBe('Profit');
    fireEvent.change(second, { target: { value: 'Cost' } });
    // The rename reached the DATA — the Edit data grid's column follows.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect(screen.getByLabelText('Row 1 Cost')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('a stacked column tip lists one dot + value per segment', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Stacked column'));
    const segment = await waitFor(() => {
      const el = playground.querySelector<SVGRectElement>(
        '[data-element="stacked-column-chart"] .el-grow-y rect',
      );
      expect(el).toBeTruthy();
      return el!;
    });
    fireEvent.mouseOver(segment);
    await waitFor(() => {
      const tip = playground.querySelector('[data-chart-tip]')!;
      expect(tip).toBeTruthy();
      // Both series appear, each with its own value (Jan: 40 & 16).
      expect(tip.textContent).toContain('Sales');
      expect(tip.textContent).toContain('Profit');
      expect(tip.textContent).toContain('40');
      expect(tip.textContent).toContain('16');
    });
  });

  it('hovering a slice grows it and pops the chart tooltip', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Donut'));
    const slice = await waitFor(() => {
      const el = playground.querySelector<SVGPathElement>(
        '[data-element="donut-chart"] path.el-draw',
      );
      expect(el).toBeTruthy();
      return el!;
    });
    fireEvent.mouseOver(slice);
    await waitFor(() => {
      expect(playground.querySelector('[data-chart-tip]')).toBeTruthy();
      expect(slice.style.transform).toContain('scale');
    });
  });

  it('the Data section renames the axes in place', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    const horizontal = await waitFor(
      () => screen.getByLabelText('Horizontal axis name') as HTMLInputElement,
    );
    fireEvent.change(horizontal, { target: { value: 'Months' } });
    fireEvent.change(screen.getByLabelText('Vertical axis name'), {
      target: { value: 'Revenue' },
    });
    await waitFor(() => {
      // The horizontal name reaches the chart's axis pill (itself an
      // editable input now, styled like the legend)…
      expect(
        (within(playground).getByLabelText('Axis name') as HTMLInputElement).value,
      ).toBe('Months');
    });
    // …and the vertical name renames the first series in the DATA.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect(screen.getByLabelText('Row 1 Revenue')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('the settings menu follows the visible chart', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    // Column — cartesian: axis sections exist and General holds Grid lines.
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    await waitFor(() => {
      // Data row label + the collapsible section header.
      expect(screen.getAllByText('Horizontal axis').length).toBe(2);
    });
    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    await waitFor(() => {
      expect(screen.getByText('Grid lines')).toBeTruthy();
    });
    // Escape closes the menu — sent inside waitFor because the toolbar
    // attaches its close listener 10ms after opening, and the retries
    // outlive that window.
    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Grid lines')).toBeNull();
    });
    fireEvent.click(within(playground).getByText('Donut'));
    await waitFor(() => {
      expect(playground.querySelector('[data-element="donut-chart"]')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    await waitFor(() => {
      // Data rows rename to Categories/Values; axis + grid settings vanish.
      expect(screen.getByText('Categories')).toBeTruthy();
      expect(screen.getByText('Values')).toBeTruthy();
    });
    expect(screen.queryByText('Horizontal axis')).toBeNull();
    expect(screen.queryByText('Vertical axis')).toBeNull();
    expect(screen.queryByText('Grid lines')).toBeNull();
  });

  it('the bar chart draws its value axis, and the legend pill follows the config', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Bar'));
    await waitFor(() => {
      const svg = playground.querySelector('[data-element="bar-chart"]');
      expect(svg).toBeTruthy();
      // Bottom value axis: a zero tick exists among the axis texts.
      const ticks = Array.from(svg!.querySelectorAll('text')).map((t) => t.textContent);
      expect(ticks).toContain('0');
      // The Chronicle-style legend pill with the first series name.
      expect(svg!.querySelector('[data-chart-legend]')).toBeTruthy();
      // Minor grid: unlabeled lines halfway between the major ticks.
      expect(svg!.querySelectorAll('[data-chart-minor]').length).toBeGreaterThan(0);
    });
  });

  it('the legend renames the series in place and the pill follows the text', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    const pill = () => playground.querySelector('[data-chart-legend] rect')!;
    const widthBefore = Number(pill().getAttribute('width'));
    fireEvent.change(within(playground).getByLabelText('Legend name'), {
      target: { value: 'Quarterly revenue' },
    });
    await waitFor(() => {
      // The capsule stretched to fit the longer name…
      expect(Number(pill().getAttribute('width'))).toBeGreaterThan(widthBefore);
    });
    // …and the rename reached the DATA — the grid's column carries it.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect(screen.getByLabelText('Row 1 Quarterly revenue')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('emptying the legend name keeps the pill until the edit ends', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    const input = within(playground).getByLabelText('Legend name') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    // Mid-edit the pill stays, empty and ready to type into…
    expect(within(playground).getByLabelText('Legend name')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Users' } });
    await waitFor(() => {
      expect(
        (within(playground).getByLabelText('Legend name') as HTMLInputElement).value,
      ).toBe('Users');
    });
    // …and only emptying it AND leaving commits '' — then it hides.
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(within(playground).queryByLabelText('Legend name')).toBeNull();
    });
  });

  it('the chart is a selectable block: select, move and resize freely', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    const block = playground.querySelector('[data-chart-block]') as HTMLElement;
    expect(block.dataset.selected).toBe('true');

    // Pressing empty canvas deselects; pressing the block reselects + moves.
    fireEvent.mouseDown(block.parentElement!);
    await waitFor(() => {
      expect(block.dataset.selected).toBeUndefined();
    });
    const leftBefore = parseFloat(block.style.left);
    fireEvent.mouseDown(block, { clientX: 300, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 348, clientY: 336 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(block.dataset.selected).toBe('true');
      expect(parseFloat(block.style.left)).toBeGreaterThan(leftBefore);
    });

    // Pulling the south-east handle grows the block.
    const wBefore = parseFloat(block.style.width);
    fireEvent.mouseDown(block.querySelector('[data-resize="se"]')!, {
      clientX: 500,
      clientY: 500,
    });
    fireEvent.mouseMove(document, { clientX: 570, clientY: 550 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(parseFloat(block.style.width)).toBeGreaterThan(wBefore);
    });
  });

  it('month labels print abbreviated and the Data currency stamps the values', async () => {
    mount();
    const playground = within(document.querySelector('[data-playground]') as HTMLElement);
    // Store a FULL month name through the Edit data modal…
    fireEvent.click(screen.getByText('Edit data'));
    const label = await waitFor(() => screen.getByLabelText('Row 1 Labels') as HTMLInputElement);
    fireEvent.change(label, { target: { value: 'January' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      // …the stored value stays full, the chart prints Jan.
      expect((playground.getByLabelText('Chart label 1') as HTMLInputElement).value).toBe('Jan');
    });
    // Data → Currency: picking $ stamps every printed value.
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    const dollar = await waitFor(() => screen.getByRole('radio', { name: '$' }));
    fireEvent.click(dollar);
    await waitFor(() => {
      const value = document.querySelector(
        '[data-playground] [data-element="column-chart"] text[data-chart-value]',
      )!;
      expect(value.textContent!.startsWith('$')).toBe(true);
    });
  });

  it('Edit data opens the spreadsheet modal and Save lands in the chart data', async () => {
    mount();
    fireEvent.click(screen.getByText('Edit data'));
    // The SAME modal the guideline lab opens — our data as its grid.
    const cell = await waitFor(() => screen.getByLabelText('Row 1 Sales') as HTMLInputElement);
    expect(cell.value).toBe('40');
    fireEvent.change(cell, { target: { value: '77' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByLabelText('Row 1 Sales')).toBeNull();
    });
    // Reopen: the save landed in the chart's data.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect((screen.getByLabelText('Row 1 Sales') as HTMLInputElement).value).toBe('77');
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('Expand shows the chart fullscreen on the working ground, Escape closes', async () => {
    mount();
    fireEvent.click(screen.getByLabelText('Expand chart'));
    const full = await waitFor(() => {
      const el = document.querySelector('[data-chart-fullscreen]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    // The SAME live chart, re-inked on the working ground — and RE-LAID
    // OUT, not zoomed: the focus stage is far wider than the 300-unit
    // default, so type stays at reading size while the plot fills.
    const svg = full.querySelector('[data-element="column-chart"]')!;
    expect(svg).toBeTruthy();
    const vbWidth = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
    expect(vbWidth).toBeGreaterThan(400);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.querySelector('[data-chart-fullscreen]')).toBeNull();
    });
  });

  it('switching the playground type swaps the chart', async () => {
    mount();
    const playground = document.querySelector('[data-playground]') as HTMLElement;
    fireEvent.click(within(playground).getByText('Donut'));
    await waitFor(() => {
      expect(playground.querySelector('[data-element="donut-chart"]')).toBeTruthy();
      expect(playground.querySelector('[data-element="column-chart"]')).toBeNull();
    });
  });

  it('picking an element from the sidebar shows it alone', async () => {
    mount();
    fireEvent.click(within(screen.getByLabelText('Lab elements')).getByText('Radar chart'));
    await waitFor(() => {
      expect(document.querySelector('[data-element="radar-chart"]')).toBeTruthy();
      expect(document.querySelector('[data-element="column-chart"]')).toBeNull();
    });
  });
});
