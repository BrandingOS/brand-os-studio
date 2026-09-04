// The Bento editor after the UI-system migration.
//
// Two kinds of assertion, and both are about the SYSTEM rather than the
// pixels: that the page reaches the canonical chrome and tokens, and that the
// controls the migration replaced still drive the same store the old ones did.
// A migration that looks right and no longer edits the document is the failure
// worth guarding against.
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useBentoStore } from '../store';
import { TileInspector } from '../components/TileInspector';
import { LayoutPopover } from '../components/LayoutPopover';

const brand = { id: 'b1', name: 'Raqm', slug: 'raqm', primaryColor: '#C8102E', assets: [] } as never;
const here = join(process.cwd(), 'src/features/bento');
const read = (f: string) => readFileSync(join(here, f), 'utf8');

const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  useBentoStore.getState().init(brand);
});
afterEach(() => cleanup());

const FILES = [
  'BentoEditor.tsx',
  'components/BentoTopBar.tsx',
  'components/TileInspector.tsx',
  'components/TemplateRail.tsx',
  'components/MediaPicker.tsx',
  'components/ImageUploadPrompt.tsx',
  'components/LayoutPopover.tsx',
  'components/SizePicker.tsx',
  'components/BrandSourcePicker.tsx',
  'components/BentoCanvas.tsx',
];

describe('no legacy UI is left on the route', () => {
  it.each(FILES)('%s imports nothing from the frozen shadcn layer', (f) => {
    // `components/ui/*` is canonical for Classic only; a new import here is
    // the migration coming undone one file at a time.
    expect(read(f)).not.toMatch(/^import .*from '@\/components\/ui\//m);
  });

  it('paints its chrome from tokens, not the old indigo', () => {
    // The canvas used to draw the selection outline, the resize handles and
    // the add-block button in #6366F1 — an indigo belonging to no palette in
    // the product, and the clearest tell that this page predated the DS.
    //
    // Scoped to the CANVAS on purpose. The same hex survives in shuffle.ts,
    // TileRenderer and buildPalette, where it is not chrome at all: it is the
    // fallback CONTENT palette a tile is generated from when the brand brings
    // no colours of its own. Migrating those would change what Bento draws.
    const canvas = read('components/BentoCanvas.tsx');
    expect(canvas).not.toMatch(/#6366F1/i);
    expect(canvas).toContain('var(--ds-accent)');
  });

  it('scopes the editor to the workspace so --ds-* resolves per theme', () => {
    const src = read('BentoEditor.tsx');
    expect(src).toContain('data-workspace');
    expect(src).toContain('data-theme={theme}');
  });

  it('wears the canonical editor chrome rather than a bespoke topbar', () => {
    expect(read('components/BentoTopBar.tsx')).toContain("from '@/features/editor/core'");
  });

  it('styles itself from tokens only', () => {
    // Every colour must be a token. A bare hex is how a page drifts back out
    // of the system; #fff inside a scrim gradient is the one literal allowed.
    const css = read('bento.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const hexes = css.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    expect(hexes.filter((h) => h.toLowerCase() !== '#fff')).toEqual([]);
  });
});

describe('the migrated controls still drive the document', () => {
  it('the layout sliders write gap and padding', () => {
    mount(<LayoutPopover />);
    fireEvent.click(screen.getByRole('button', { name: /layout/i }));

    fireEvent.change(screen.getByLabelText('Gap'), { target: { value: '3' } });
    expect(useBentoStore.getState().design.gap).toBe(3);

    fireEvent.change(screen.getByLabelText('Edge padding'), { target: { value: '5' } });
    expect(useBentoStore.getState().design.padding).toBe(5);
  });

  it('the grid fields clamp instead of writing NaN when emptied', () => {
    mount(<LayoutPopover />);
    fireEvent.click(screen.getByRole('button', { name: /layout/i }));
    fireEvent.change(screen.getByLabelText('Columns'), { target: { value: '' } });
    expect(useBentoStore.getState().design.cols).toBe(1);
  });

  it('the inspector’s segmented shadow control writes the style', () => {
    const tile = useBentoStore.getState().design.tiles[0];
    mount(<TileInspector tile={tile} brand={brand} onOpenMedia={() => {}} />);

    // DsSegmented is a radiogroup, not a row of buttons — the control states
    // one choice out of a set, and that is what it reports.
    fireEvent.click(screen.getByRole('radio', { name: 'M' }));
    const after = useBentoStore.getState().design.tiles.find((t) => t.id === tile.id);
    expect(after?.style?.shadow).toBe(2);
  });

  it('“auto” is still how an unset corner radius reads', () => {
    const tile = useBentoStore.getState().design.tiles[0];
    mount(<TileInspector tile={tile} brand={brand} onOpenMedia={() => {}} />);
    // The store reads -1 back as undefined; the readout must not say "-1.0%".
    expect(screen.getByText('auto')).toBeTruthy();
  });

  it('offers the empty inspector as an add surface when nothing is selected', () => {
    mount(<TileInspector tile={null} brand={brand} onOpenMedia={() => {}} />);
    expect(screen.getByText('Browse media library')).toBeTruthy();
  });
});
