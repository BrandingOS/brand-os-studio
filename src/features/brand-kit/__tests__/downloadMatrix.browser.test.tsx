/**
 * EVERY ROW OF EVERY DOWNLOAD MENU, IN A REAL BROWSER.
 *
 * The owner's complaint was not "one export is broken" — it was "not all
 * download give error". So the gate is a MATRIX rather than a list of
 * examples: every entry the Brand Kit shows, crossed with every row its
 * own menu offers, downloaded for real, read back, and checked against
 * the extension the row's chip promised.
 *
 * Two rules it exists to keep:
 *
 *  • **A format row delivers its format.** "Vector (SVG)" and "For web
 *    (PNG)" on the Logos card used to hand over the SAME 439 KB archive
 *    of fifteen PNGs and no SVG. An assertion on the CHIP is the only
 *    thing that catches that, because both downloads succeeded.
 *  • **A row that cannot be honoured is not offered.** Anything disabled
 *    is checked to carry a reason and is never invoked — that is the
 *    honest half of the same rule.
 *
 * It prints the matrix as markdown on the way through, which is what
 * `.audit/downloads/RESULTS.md` is built from.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import '../brand-kit.css';
// The Icons family exports by READING THE RENDERED GLYPH — its font family
// and codepoint come off the mounted `<i>`'s computed `::before`. The page
// imports these four stylesheets for exactly that reason; without them the
// export finds no glyph and writes nothing, which is a broken TEST rather
// than a broken family.
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import '@flaticon/flaticon-uicons/css/thin/rounded.css';
import '@flaticon/flaticon-uicons/css/bold/rounded.css';
import '@flaticon/flaticon-uicons/css/solid/rounded.css';
import { visibleEntries, type KitEntry } from '../catalog/catalog';
import { downloadOptionsFor, type DownloadFormat } from '../data/exportFormats';
import { downloadEntry } from '../data/exportEverything';
import { entryUnavailableReason } from '../data/exportAvailability';
import { suggestIconsForBrand } from '../data/suggestIcons';

const seed = SEED_BRANDS.find((b) => b.slug === 'raqm') ?? SEED_BRANDS[0];
const base: MockBrand = brandToMockBrand(seed);
/**
 * The brand the PAGE draws, not the one the record holds.
 *
 * `BrandKitCosmosPage` overlays a suggested icon set on a brand that has
 * none, so the Icons card the user is looking at has icons even when
 * `brand.icons` is empty. A matrix that measured the raw record would
 * report a family broken that is not, and miss the day it breaks.
 */
const brand: MockBrand =
  base.icons.length > 0 ? base : { ...base, icons: suggestIconsForBrand(base.name, 12) };

/** Only what a customer sees. Experimental entries are covered by the harness. */
const ENTRIES: KitEntry[] = visibleEntries({ isDev: false, isAdmin: false });

/** The extension a row's chip promises. `null` = the row names an archive. */
const PROMISED: Record<string, RegExp | null> = {
  png: /\.png$/i,
  jpg: /\.jpe?g$/i,
  pdf: /\.pdf$/i,
  svg: /\.svg$/i,
  custom: /\.png$/i,
  pptx: /\.pptx$/i,
  ico: /\.ico$/i,
  html: /\.html$/i,
  sizes: /\.png$/i,
  md: /\.md$/i,
  json: /\.json$/i,
  zip: null,
};

function captureDownload() {
  const files: Array<{ name: string; blob: Blob }> = [];
  const created = vi.spyOn(URL, 'createObjectURL');
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      const blob = created.mock.calls.at(-1)?.[0] as Blob;
      files.push({ name: this.download, blob });
    });
  return { files, restore: () => { created.mockRestore(); click.mockRestore(); } };
}

/** Every leaf path in what came down — the file itself when it is not an archive. */
async function contentsOf(file: { name: string; blob: Blob }): Promise<string[]> {
  if (!/\.zip$/i.test(file.name)) return [file.name];
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.blob.arrayBuffer());
  return Object.keys(zip.files).filter((p) => !zip.files[p].dir);
}

/** Nothing in the archive may be empty — a 0-byte file is a failed export that shipped. */
async function emptyMembers(file: { name: string; blob: Blob }): Promise<string[]> {
  if (!/\.zip$/i.test(file.name)) return file.blob.size > 0 ? [] : [file.name];
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.blob.arrayBuffer());
  const empty: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (zip.files[path].dir) continue;
    if ((await zip.files[path].async('uint8array')).byteLength === 0) empty.push(path);
  }
  return empty;
}

/** Formats whose archive may hold nothing but that format, plus its notes. */
const STRICT = new Set<DownloadFormat>(['png', 'jpg', 'pdf', 'svg', 'custom']);
const NOTES = /\.(md|txt)$/i;

/** The first member of an archive matching a pattern, as a blob. */
async function firstMember(file: { name: string; blob: Blob }, ext: RegExp): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.blob.arrayBuffer());
  const path = Object.keys(zip.files).find((p) => !zip.files[p].dir && ext.test(p));
  if (!path) throw new Error(`no ${ext} inside ${file.name}`);
  return zip.files[path].async('blob');
}

type Row = { entry: string; format: DownloadFormat; chip: string; verdict: string };

/** One line per cell, which is what `.audit/downloads/RESULTS.md` is built from. */
function report(row: Row): void {
  console.log(`MATRIX\t${row.entry}\t${row.chip}\t${row.verdict}`);
}
const MATRIX: Row[] = [];

const CASES: Array<[string, KitEntry, DownloadFormat, string, string | undefined]> = [];
for (const entry of ENTRIES) {
  const unavailable = entryUnavailableReason(entry, brand);
  for (const option of downloadOptionsFor(entry, unavailable)) {
    CASES.push([
      `${entry.label} · ${option.label} (${option.chip})`,
      entry,
      option.format,
      option.chip,
      option.disabledReason,
    ]);
  }
}

describe('every download menu row, for every card the kit shows', () => {
  beforeAll(async () => {
    // The glyph fonts have to be resolvable before anything reads one.
    await document.fonts.ready;
  });

  it.each(CASES)('%s', async (_name, entry, format, chip, disabledReason) => {
    if (disabledReason) {
      // The honest half: a row that cannot be honoured says so, and is
      // never fired. A disabled row with no reason is the silent no-op
      // this whole exercise is against.
      expect(disabledReason.length, 'a disabled row must say why').toBeGreaterThan(10);
      MATRIX.push({ entry: entry.label, format, chip, verdict: `disabled — ${disabledReason}` });
      report(MATRIX.at(-1)!);
      return;
    }
    const capture = captureDownload();
    try {
      const result = await downloadEntry(
        entry,
        { brand, sourceBrand: seed, entries: [entry] },
        format === 'custom' ? { format, size: { width: 512, padding: 8 } } : { format },
      );
      expect(result.added, `${entry.label} · ${format} produced nothing`).toBe(true);
      const file = capture.files.at(-1);
      expect(file, `${entry.label} · ${format} handed the browser nothing`).toBeTruthy();
      const paths = await contentsOf(file!);
      const promised = PROMISED[format];
      if (promised) {
        expect(
          paths.some((p) => promised.test(p)),
          `${entry.label} · ${chip} shipped ${paths.slice(0, 8).join(', ')} — no ${chip}`,
        ).toBe(true);
        // AND NOTHING ELSE THAT IS ARTWORK. "Contains one PNG" was true of
        // the Logos card's SVG row too, because both rows handed over the
        // whole folder. A row's archive holds files of that format and the
        // notes that explain them — nothing else.
        if (STRICT.has(format)) {
          const strays = paths.filter((p) => !promised.test(p) && !NOTES.test(p));
          expect(strays, `${entry.label} · ${chip} also shipped ${strays.join(', ')}`).toEqual([]);
        }
      } else {
        expect(paths.length, `${entry.label} · ${chip} shipped nothing`).toBeGreaterThan(0);
      }
      if (format === 'custom') {
        // A custom size that did not resize is a row that did nothing.
        const bytes = new Uint8Array(
          await (/\.png$/i.test(file!.name)
            ? file!.blob
            : await firstMember(file!, /\.png$/i)
          ).arrayBuffer(),
        );
        expect(new DataView(bytes.buffer).getUint32(16), 'the custom width was ignored').toBe(512);
      }
      const empty = await emptyMembers(file!);
      expect(empty, `${entry.label} · ${chip} shipped empty files`).toEqual([]);
      MATRIX.push({
        entry: entry.label,
        format,
        chip,
        verdict: `ok — ${file!.name} (${paths.length} file${paths.length === 1 ? '' : 's'})`,
      });
    } catch (err) {
      MATRIX.push({
        entry: entry.label,
        format,
        chip,
        verdict: `FAIL — ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
      });
      throw err;
    } finally {
      capture.restore();
      report(MATRIX.at(-1)!);
    }
  }, 180_000);
});

/**
 * PHOTOS, FOR A BRAND THAT HAS SOME.
 *
 * Both seed brands' photography resolves to nothing — raqm declares none
 * and skam's only source is a path that 404s — so the matrix above can
 * only prove the honest half of the rule: the menu is disabled and says
 * why. This is the other half. A photograph is not artwork we draw, so
 * "For web (PNG)" has to re-encode whatever the brand actually uploaded.
 */
describe('the Photos card, once the brand has a photograph', () => {
  const PHOTOS = ENTRIES.find((e) => e.storageLabel === 'Photos')!;
  // A real 2×2 JPEG, inlined so nothing has to be fetched over a network.
  const JPEG =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL' +
    'DBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAFAAB' +
    'AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const photographed: MockBrand = {
    ...brand,
    photos: [{ id: 'p1', src: JPEG, slot: 'A' }],
  };

  it('offers every row once there is material', () => {
    expect(entryUnavailableReason(PHOTOS, photographed)).toBeUndefined();
  });

  it.each(
    downloadOptionsFor(PHOTOS).map((o) => [`${o.label} (${o.chip})`, o] as const),
  )('%s', async (_name, option) => {
    if (option.disabledReason) {
      expect(option.format, 'only the vector row is refused for a photograph').toBe('svg');
      report({ entry: 'Photos', format: option.format, chip: option.chip, verdict: `disabled — ${option.disabledReason}` });
      return;
    }
    const capture = captureDownload();
    try {
      const result = await downloadEntry(
        PHOTOS,
        { brand: photographed, sourceBrand: seed, entries: [PHOTOS] },
        option.format === 'custom'
          ? { format: option.format, size: { width: 512, padding: 8 } }
          : { format: option.format },
      );
      expect(result.added, `Photos · ${option.chip} produced nothing`).toBe(true);
      const file = capture.files.at(-1)!;
      const paths = await contentsOf(file);
      const promised = PROMISED[option.format]!;
      expect(
        paths.some((p) => promised.test(p)),
        `Photos · ${option.chip} shipped ${paths.join(', ')}`,
      ).toBe(true);
      expect(await emptyMembers(file)).toEqual([]);
      report({
        entry: 'Photos',
        format: option.format,
        chip: option.chip,
        verdict: `ok — ${file.name} (${paths.length} file${paths.length === 1 ? '' : 's'})`,
      });
    } finally {
      capture.restore();
    }
  }, 120_000);
});

/**
 * THE CUSTOM-SIZE SHEET, WHERE A FINGER CAN REACH IT.
 *
 * Every Brand Kit card carries `will-change: opacity` for the wave
 * fade-in, and `will-change` on opacity creates a STACKING CONTEXT. A
 * `position: fixed; z-index: 200` scrim inside one card is confined to
 * that card's level, so the next card in the grid — plain, `z-index:
 * auto`, later in the DOM — paints straight over it.
 *
 * Measured on the real page: `elementsFromPoint` over the sheet's own
 * *Download PNG* button returned the LETTERHEAD card's cover. Pressing it
 * opened Letterhead's drilldown and no file was ever downloaded — a row
 * that was offered, looked live, and could not be completed.
 *
 * Nothing but a real browser can answer this: jsdom has no paint order.
 */
describe('the custom-size sheet, opened from inside a card', () => {
  it('is reachable, and its click does not fall through to the card', async () => {
    const { render, fireEvent, cleanup } = await import('@testing-library/react');
    const { DownloadMenu } = await import('../components/DownloadMenu');
    const cardClicks: string[] = [];
    // Two cards, exactly as the grid draws them: a stacking context each,
    // the menu in the FIRST and a plain cover in the second.
    const { container } = render(
      <div style={{ position: 'relative' }}>
        <div
          style={{ willChange: 'opacity', position: 'relative' }}
          onClick={() => cardClicks.push('first')}
        >
          <DownloadMenu
            options={[{ format: 'custom', label: 'Custom size…', chip: 'PNG' }]}
            onChoose={() => {}}
            onClose={() => {}}
          />
        </div>
        <div
          style={{ willChange: 'opacity', position: 'relative' }}
          onClick={() => cardClicks.push('second')}
        >
          <div
            data-testid="cover"
            style={{ position: 'relative', height: 900, background: '#ccc' }}
          />
        </div>
      </div>,
    );
    try {
      fireEvent.click(container.querySelector('[role="menuitem"]')!);
      const button = await vi.waitFor(() => {
        const found = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Download PNG',
        );
        expect(found, 'the sheet never opened').toBeTruthy();
        return found!;
      });
      // Out of the card entirely — a sibling of <body>, because no z-index
      // can lift a box above a stacking context it lives inside.
      expect(container.contains(button), 'the sheet is still inside the card').toBe(false);
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      expect(button.contains(top) || top === button, 'something paints over the sheet').toBe(true);
      // A React portal bubbles through the React TREE, so without the guard
      // this click also opens the card it was opened from.
      fireEvent.click(button);
      expect(cardClicks, 'the click fell through to a card').toEqual([]);
    } finally {
      cleanup();
    }
  });
});

/**
 * A TILE'S CUSTOM SIZE, WHICH CLOSED ITSELF INSTEAD OF DOWNLOADING.
 *
 * `TileActions` closes its menu on any `mousedown` outside its own
 * subtree. Once the sheet moved to `<body>` it became "outside", so the
 * press landed as a mousedown that unmounted the sheet BEFORE the button's
 * own click could run: the dialog vanished, nothing downloaded, and there
 * was no error to see. Measured on the Logos drilldown — the row waited
 * four minutes for a file that was never going to come.
 */
describe("a tile's custom-size sheet", () => {
  it('downloads instead of dismissing itself', async () => {
    const { render, fireEvent, cleanup } = await import('@testing-library/react');
    const { TileActions } = await import('../components/TileActions');
    const chosen: unknown[] = [];
    render(
      <TileActions
        name="Primary · Original"
        downloadOptions={[{ format: 'custom', label: 'Custom size…', chip: 'PNG' }]}
        onDownload={(choice) => chosen.push(choice)}
      />,
    );
    try {
      fireEvent.click(document.querySelector('[aria-label^="Download"]')!);
      fireEvent.click(document.querySelector('[role="menuitem"]')!);
      const button = await vi.waitFor(() => {
        const found = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Download PNG',
        );
        expect(found, 'the sheet never opened').toBeTruthy();
        return found!;
      });
      // The press, as a browser delivers it: mousedown, then click. The
      // mousedown is the half that used to close the sheet.
      fireEvent.mouseDown(button);
      expect(
        document.body.contains(button),
        'the sheet closed itself on mousedown',
      ).toBe(true);
      fireEvent.click(button);
      expect(chosen).toEqual([
        { format: 'custom', size: { width: 1024, height: undefined, padding: 0, background: 'transparent', trim: true } },
      ]);
    } finally {
      cleanup();
    }
  });
});
