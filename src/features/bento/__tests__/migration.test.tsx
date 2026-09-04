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
import { DocumentPanel } from '../components/DocumentPanel';

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
  'components/BentoActions.tsx',
  'components/BentoInspector.tsx',
  'components/DocumentPanel.tsx',
  'components/TileInspector.tsx',
  'components/TemplateRail.tsx',
  'components/MediaPicker.tsx',
  'components/ImageUploadPrompt.tsx',
  'components/controls.tsx',
  'components/BrandSourcePicker.tsx',
  'components/BentoCanvas.tsx',
];

/** Chrome Bento is no longer allowed to draw for itself. */
const RETIRED = [
  'components/BentoTopBar.tsx',
  'components/BentoPopover.tsx',
  'components/LayoutPopover.tsx',
  'components/SizePicker.tsx',
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

  it('is a page of the product, not an application over it', () => {
    const src = read('BentoEditor.tsx');
    // The shell is the navbar, the section nav, the brand switcher and the
    // theme. A page that renders its own chrome instead has left the product.
    expect(src).toContain("from '@/shared/layouts/WorkspaceShell'");
    expect(src).toContain('<WorkspaceShell');
    // The unified editor's own topbar is chrome for a fullscreen editor, not
    // for a page inside the shell. Matched as an IMPORT so the history of why
    // can still be written in a comment.
    expect(src).not.toMatch(/^import .*@\/features\/editor\/core/m);
  });

  it('contributes its actions to the shell rather than drawing a second bar', () => {
    expect(read('BentoEditor.tsx')).toContain('rightActions=');
  });

  it('does not take the viewport over', () => {
    // `position: fixed; inset: 0` on the root was the whole of what made this
    // a separate app: the product was still mounted, behind it.
    const css = read('bento.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/\.bento-editor\b/);
    expect(css).not.toMatch(/\.bento-shell[^{]*\{[^}]*position:\s*fixed/);
  });

  it('lets the shell own the theme scope, and does not write a second one', () => {
    // `data-workspace` + `data-theme` come from WorkspaceShell now. Setting
    // them again here would be a second writer of the one theme choice.
    const src = read('BentoEditor.tsx');
    expect(src).not.toContain('data-theme={theme}');
    expect(src).not.toContain('useWorkspaceTheme');
    // The rules still have to be written for that scope.
    expect(read('bento.css')).toContain('[data-workspace] .bento-work');
  });

  it.each(RETIRED)('%s is gone, not merely unused', (f) => {
    // Dead chrome is how a legacy layout grows back.
    expect(() => read(f)).toThrow();
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
    // They used to live behind a hand-rolled popover on a toolbar row; they
    // are now always visible in the Document panel. Same store, no disclosure.
    mount(<DocumentPanel brand={brand} />);

    fireEvent.change(screen.getByLabelText('Gap'), { target: { value: '3' } });
    expect(useBentoStore.getState().design.gap).toBe(3);

    fireEvent.change(screen.getByLabelText('Edge padding'), { target: { value: '5' } });
    expect(useBentoStore.getState().design.padding).toBe(5);
  });

  it('the grid fields clamp instead of writing NaN when emptied', () => {
    mount(<DocumentPanel brand={brand} />);
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

  it('sets the canvas ground from the brand’s own colours', () => {
    // It used to be a native <input type="color"> — the whole spectrum, with
    // the brand's colours nowhere in it, on a page for composing FROM a brand.
    mount(<DocumentPanel brand={brand} />);
    fireEvent.click(screen.getByRole('button', { name: '#C8102E' }));
    expect(useBentoStore.getState().design.backgroundColor).toBe('#C8102E');
  });

  it('offers the empty inspector as an add surface when nothing is selected', () => {
    mount(<TileInspector tile={null} brand={brand} onOpenMedia={() => {}} />);
    expect(screen.getByText('Browse media library')).toBeTruthy();
  });
});
