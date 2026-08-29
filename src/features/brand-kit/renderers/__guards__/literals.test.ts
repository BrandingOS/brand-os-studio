/**
 * No renderer may paint somebody else's content.
 *
 * The bar (spec §1): "Nothing a customer reads is a literal." This test
 * enforces it for every renderer NOT on the allowlist below, and reports —
 * without failing — how far the allowlisted ones still have to go.
 *
 * Why an allowlist rather than a clean sweep: the 33 files below were dirty
 * on the day the guard was written (861 hits), and every family in W1 owns
 * a different subset of them. A guard that fails on work nobody has started
 * is a guard everyone disables. A guard that fails the moment a CLEAN file
 * regresses is one that survives the wave.
 */
import { describe, it, expect } from 'vitest';
import {
  BANNED_STRINGS,
  KNOWN_DIRTY_FILES,
  formatScanTable,
  rendererFiles,
  scanRenderers,
} from './literals';

describe('renderer literal scan', () => {
  it('finds the renderers to scan', () => {
    const files = rendererFiles();
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('src/features/brand-kit/renderers/BusinessCardsExtended.tsx');
    expect(files).toContain(
      'src/features/brandkit/components/renderers/BusinessCardRenderer.tsx',
    );
  });

  it('never lets a clean renderer go dirty', () => {
    const regressions = scanRenderers().filter(
      (s) => s.total > 0 && !KNOWN_DIRTY_FILES.has(s.file),
    );
    expect(
      regressions.length === 0,
      regressions.length === 0
        ? ''
        : [
            '',
            'A renderer that was clean now paints a literal.',
            'Take the content from the brand or from the deliverable’s content',
            'object — never type it in.',
            '',
            formatScanTable(regressions),
            '',
          ].join('\n'),
    ).toBe(true);
  });

  it('reports what the allowlisted renderers still owe', () => {
    const scans = scanRenderers();
    const dirty = scans.filter((s) => s.total > 0);
    const total = dirty.reduce((n, s) => n + s.total, 0);
    // Not an assertion on the number — a family agent lowering it must not
    // have to come and edit this file. It IS an assertion that the scanner
    // still works: a scan that suddenly finds nothing is a broken scanner,
    // not a finished repo, until the allowlist is empty too.
    if (KNOWN_DIRTY_FILES.size > 0) {
      expect(
        total,
        'the scanner found nothing while the allowlist is still populated — check the patterns',
      ).toBeGreaterThan(0);
    }
    console.log(
      `\nrenderer literals: ${dirty.length} dirty file(s), ${total} hit(s)\n` +
        `${formatScanTable(dirty)}\n`,
    );
  });

  it('reports allowlist entries that no longer exist, so the list can shrink', () => {
    const present = new Set(rendererFiles());
    const stale = [...KNOWN_DIRTY_FILES].filter((f) => !present.has(f));
    if (stale.length > 0) {
      console.log(`\nKNOWN_DIRTY_FILES has stale entries — remove them:\n  ${stale.join('\n  ')}\n`);
    }
    // Reported, not failed: a family agent renaming a renderer must not be
    // blocked by a list they do not own.
    expect(Array.isArray(stale)).toBe(true);
  });

  it('bans strings that were really found in the audit, not categories', () => {
    // A ban list that grows by guesswork stops being arguable. Every entry
    // is a string `.audit/CODE.md` §7 quoted.
    expect(BANNED_STRINGS).toContain('Jane Smith');
    expect(BANNED_STRINGS).toContain('$8,300');
    expect(BANNED_STRINGS.length).toBe(new Set(BANNED_STRINGS).size);
  });
});
