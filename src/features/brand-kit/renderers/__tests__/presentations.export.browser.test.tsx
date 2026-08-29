/**
 * Exporting the decks must be SILENT.
 *
 * The QA run of "Export kit" produced a console full of two things
 * (`.audit/OURS.md` D48): React "unique key" warnings named against
 * `BusinessPlanRenderer` and `ProposalRenderer`, and three "Maximum
 * update depth exceeded" errors. Neither failed the export, which is
 * exactly why they survived — a zip came out, the toast said done, and
 * the only evidence was a panel nobody had open.
 *
 * Both had causes worth writing down.
 *
 * ## The key warnings
 *
 * The old plan and proposal decks each drew a timeline as
 * `['Q1','Q2','Q3','Q4'].map((q, i) => <>…</>)` — a FRAGMENT returned
 * from a map, with keys on the two children inside it and none on the
 * fragment itself. React keys the array's own elements, so the keys were
 * on the wrong nodes and every render re-created the row. The
 * conversion replaced those slides with the shared kind renderers, whose
 * one list (a content slide's bullets) is keyed on the slide's id and its
 * index. This test is what keeps that true: a new list in a slide
 * renderer that forgets its key fails here rather than in somebody's
 * console.
 *
 * ## The update-depth errors
 *
 * A `useLayoutEffect` + `ResizeObserver` pair that calls `setState` with
 * a measurement of a box its own state resizes will not converge. The
 * export mounts these views offscreen at a fixed width, which is the
 * situation where such a loop runs freely and unobserved.
 *
 * ## Why the assertion is "no console output" rather than "no throw"
 *
 * Every defect above is a WARNING. An export that finishes and a
 * document that is correct are not the same claim, and the console is
 * the only place the difference was ever visible. So the console is what
 * is measured: `error` and `warn`, over a real `buildKitZipBlob` of the
 * Presentation System and the four deck cards, in a real browser.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
// The real stylesheet, because the snapshot host is STYLED. An offscreen
// mount that misses `.bk-snapshot-host` lays every renderer out at 0×0 and
// the export succeeds with a zip full of empty pictures.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { getEntryFor } from '../../catalog/catalog';
import { buildKitZipBlob } from '../../data/exportEverything';
import { resetRenderEnvironment } from '../../data/templateSnapshot';

const sourceBrand = SEED_BRANDS[0]!;

const PRESENTATION_SYSTEM = getEntryFor('presentations', 'Presentation System')!;
const DECK_ENTRIES = ['Pitch Deck', 'Business Plan', 'Proposal', 'Case Studies'].map(
  (label) => getEntryFor('presentations', label)!,
);

/**
 * Everything React and the browser said while the export ran.
 *
 * React routes its own warnings — duplicate keys, update depth, invalid
 * DOM nesting — through `console.error`, so a spy on the console is the
 * only way to see them from a test.
 */
type Recorder = { errors: string[]; warnings: string[]; restore: () => void };

/**
 * `IS_REACT_ACT_ENVIRONMENT` is turned OFF while the export runs.
 *
 * Testing Library sets it so that a render this file drives has to be
 * wrapped in `act`. An export is not that render: `withOffscreenHost`
 * mounts its own root, on its own schedule, in production code — so React
 * warns "an update was not wrapped in act(...)" once per snapshot, and the
 * console this test exists to measure fills with an artefact of the
 * harness rather than anything the product did. Turning the flag off for
 * the duration is what makes the remaining output MEAN something: after
 * this, a line in the console is a line the export really produced.
 */
type ActFlagHost = { IS_REACT_ACT_ENVIRONMENT?: boolean };

function recordConsole(): Recorder {
  const errors: string[] = [];
  const warnings: string[] = [];
  const host = globalThis as ActFlagHost;
  const wasActEnvironment = host.IS_REACT_ACT_ENVIRONMENT;
  host.IS_REACT_ACT_ENVIRONMENT = false;
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  const warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  });
  return {
    errors,
    warnings,
    restore: () => {
      error.mockRestore();
      warn.mockRestore();
      host.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
    },
  };
}

async function readZip(blob: Blob) {
  const { default: JSZip } = await import('jszip');
  return JSZip.loadAsync(await blob.arrayBuffer());
}

beforeEach(() => resetRenderEnvironment());
afterEach(cleanup);

describe('exporting the presentations', () => {
  it('rasterizes the Presentation System without a word to the console', async () => {
    const recorder = recordConsole();
    let blob: Blob;
    try {
      const result = await buildKitZipBlob({
        brand: mockBrand,
        sourceBrand,
        entries: [PRESENTATION_SYSTEM],
      });
      blob = result.blob;
      expect(result.added).toBe(1);
      expect(result.skipped).toEqual([]);
    } finally {
      recorder.restore();
    }

    // The document really came out, at a real size — a silent export of
    // nothing would otherwise pass this test.
    const zip = await readZip(blob);
    const file = zip.file('deliverables/presentation-system.png');
    expect(file, 'the system page lands in the zip').toBeTruthy();
    expect((await file!.async('uint8array')).byteLength).toBeGreaterThan(2000);

    expect(recorder.errors.join('\n')).toBe('');
    expect(recorder.warnings.join('\n')).toBe('');
  });

  it('rasterizes all four decks without a duplicate key or an update loop', async () => {
    const recorder = recordConsole();
    try {
      const { added, skipped } = await buildKitZipBlob({
        brand: mockBrand,
        sourceBrand,
        entries: DECK_ENTRIES,
        // Every kept slide of every deck, which is the only way a list
        // inside one slide kind gets rendered at all.
        allVariants: true,
      });
      expect(added).toBe(4);
      expect(skipped).toEqual([]);
    } finally {
      recorder.restore();
    }

    const noise = [...recorder.errors, ...recorder.warnings];
    expect(noise.filter((m) => /unique "key"|Each child in a list/i.test(m))).toEqual([]);
    expect(noise.filter((m) => /Maximum update depth/i.test(m))).toEqual([]);
    expect(noise.join('\n')).toBe('');
  });
});
