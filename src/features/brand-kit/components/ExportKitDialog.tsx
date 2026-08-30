/**
 * What goes in the zip — asked, not assumed.
 *
 * "Export everything" is the right default and the wrong only-option. A
 * whole kit is a minute of rendering and tens of megabytes; someone who
 * wants the logo files and the strategy document should not have to take
 * twenty-three rasterized deliverables with them, and someone on a slow
 * machine should be able to take the essentials now and the rest later.
 *
 * So the button opens this, everything is ticked, and the user unticks.
 * The list IS the catalog — the very entries the walker will be handed —
 * so what the sheet promises and what the zip contains cannot diverge.
 */
import { useMemo, useState } from 'react';
import { DsButton, DsCheckbox, DsEyebrow, DsModal, DsSegmented } from '@/shared/ds';
import { KIT_GROUPS, type KitEntry, type KitGroup } from '../catalog/catalog';
import {
  DEFAULT_FORMATS,
  planKitExport,
  type KitExportFormats,
  type KitExportUnit,
} from '../data/exportEverything';
import { NATIVE_FORMATS, nativeFormatFor } from '../data/exportFormats';

/**
 * Roughly what a unit costs, so the footer can say something honest
 * before the user commits a minute of their afternoon.
 *
 * Deliberately coarse — these are ORDERS OF MAGNITUDE measured on a seed
 * brand, not a promise. A number that is roughly right and present beats
 * an exact number that only exists after the work is done.
 */
const COST: Record<KitExportUnit['kind'], { mb: number; sec: number }> = {
  logos: { mb: 0.05, sec: 1 },
  colors: { mb: 0.4, sec: 2 },
  fonts: { mb: 0.3, sec: 5 },
  icons: { mb: 3.5, sec: 4 },
  photos: { mb: 3, sec: 2 },
  about: { mb: 0.1, sec: 2 },
  card: { mb: 0.06, sec: 0.5 },
  document: { mb: 0.4, sec: 1 },
  board: { mb: 0.2, sec: 1 },
};

/**
 * What a native file costs on top of the picture.
 *
 * A deck is a real document, an icon set is eight rasters, a size pack is
 * six large ones — none of that is free, and the estimate has to move when
 * the user turns them off or the sentence is a decoration.
 */
const NATIVE_COST: Record<string, { mb: number; sec: number }> = {
  pptx: { mb: 0.6, sec: 3 },
  ico: { mb: 0.4, sec: 3 },
  html: { mb: 0.15, sec: 0.5 },
  sizes: { mb: 1.6, sec: 4 },
};

/** Units whose output is a single raster — the ones a print sheet applies to. */
const RASTER_KINDS: ReadonlySet<KitExportUnit['kind']> = new Set(['card', 'document', 'board']);

function estimate(units: KitExportUnit[], formats: KitExportFormats): { mb: number; sec: number } {
  return units.reduce(
    (acc, u) => {
      let { mb, sec } = COST[u.kind];
      const native = formats.native === false ? null : nativeFormatFor(u.entry);
      if (native) {
        mb += NATIVE_COST[native].mb;
        sec += NATIVE_COST[native].sec;
      }
      if (formats.pdf && RASTER_KINDS.has(u.kind)) {
        mb += 0.3;
        sec += 1;
      }
      return { mb: acc.mb + mb, sec: acc.sec + sec };
    },
    { mb: 0, sec: 0 },
  );
}

/** The native formats this selection would actually produce, in menu words. */
function nativeChips(entries: ReadonlyArray<KitEntry>): string[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    const native = nativeFormatFor(entry);
    if (native) seen.add(NATIVE_FORMATS[native].chip);
  }
  return [...seen];
}

/** A file size the way a person says one. */
function readableBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readableTime(sec: number): string {
  if (sec < 60) return `about ${Math.max(5, Math.round(sec / 5) * 5)}s`;
  return `about ${Math.round(sec / 60)} min`;
}

/** The brand's own material — what "Essentials" means. */
const ESSENTIAL = (entry: KitEntry) => entry.sectionKey === 'brand-assets';

export function ExportKitDialog({
  open,
  onClose,
  entries,
  onExport,
  busy = false,
  progress = null,
  done = null,
  onCancelExport,
}: {
  open: boolean;
  onClose: () => void;
  /** Every entry this viewer can see, in catalog order. */
  entries: ReadonlyArray<KitEntry>;
  onExport: (chosen: KitEntry[], allVariants: boolean, formats: KitExportFormats) => void;
  /**
   * An export is running. The picker stays OPEN while it does — it used to
   * close on the click, so a 33-second wait ended with a file appearing and
   * nothing anywhere the user was looking saying it had (QA D47).
   */
  busy?: boolean;
  /** The line the runner is on, already throttled to reading speed. */
  progress?: string | null;
  /** The archive that arrived. Present only once it really has. */
  done?: { fileName: string; items: number; bytes: number } | null;
  /**
   * Stop the running export.
   *
   * A plain "Cancel" beside "Exporting…" would be two different verbs under
   * one word — close this panel, or abandon the work? While an export runs
   * there is only one thing worth cancelling.
   */
  onCancelExport?: () => void;
}) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  // One design per item is the honest default: a kit is a document you
  // hand someone. "Every variant" is here because a card showing thirty
  // letterheads and a zip containing one of them is the other complaint.
  const [depth, setDepth] = useState<'one' | 'all'>('one');
  const [formats, setFormats] = useState<KitExportFormats>(DEFAULT_FORMATS);

  const chosen = useMemo(
    () => entries.filter((e) => !excluded.has(e.key)),
    [entries, excluded],
  );
  const chips = useMemo(() => nativeChips(chosen), [chosen]);
  const cost = useMemo(() => {
    const base = estimate(planKitExport(chosen), formats);
    if (depth === 'one') return base;
    // A rough multiplier rather than a real count: the variant list is
    // per brand and per card, and pricing it exactly would mean building
    // every template list just to draw a sentence.
    const cards = planKitExport(chosen).filter((u) => u.kind === 'card').length;
    return { mb: base.mb + cards * 0.4, sec: base.sec + cards * 6 };
  }, [chosen, depth, formats]);

  const groups = useMemo(
    () =>
      KIT_GROUPS.map((g) => ({
        ...g,
        entries: entries.filter((e) => e.group === (g.id as KitGroup)),
      })).filter((g) => g.entries.length > 0),
    [entries],
  );

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setAll = (keep: (entry: KitEntry) => boolean) =>
    setExcluded(new Set(entries.filter((e) => !keep(e)).map((e) => e.key)));

  const groupState = (list: ReadonlyArray<KitEntry>) => {
    const on = list.filter((e) => !excluded.has(e.key)).length;
    return { all: on === list.length, none: on === 0, on };
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow="Brand kit"
      title="Choose what to export"
      secondaryActions={
        // Two quiet text buttons at the DS's 6px action gap read as one
        // run-on word; presets are a pair of choices, so they get air.
        <div style={{ display: 'flex', gap: 14 }}>
          <DsButton tone="tertiary" onClick={() => setAll(() => true)}>Everything</DsButton>
          <DsButton tone="tertiary" onClick={() => setAll(ESSENTIAL)}>Essentials only</DsButton>
        </div>
      }
      actions={
        done ? (
          <DsButton tone="primary" onClick={onClose}>Done</DsButton>
        ) : (
          <>
            <DsButton
              tone="secondary"
              onClick={busy && onCancelExport ? onCancelExport : onClose}
            >
              {busy && onCancelExport ? 'Cancel export' : 'Cancel'}
            </DsButton>
            <DsButton
              tone="primary"
              disabled={chosen.length === 0 || busy}
              onClick={() => onExport([...chosen], depth === 'all', formats)}
            >
              {busy
                ? 'Exporting…'
                : chosen.length === entries.length
                  ? 'Export everything'
                  : `Export ${chosen.length} item${chosen.length === 1 ? '' : 's'}`}
            </DsButton>
          </>
        )
      }
    >
      {/*
        THE STATUS IS AT THE TOP, WHERE IT CANNOT SCROLL AWAY.
        The estimate lives under the list, which is right for a sentence you
        read before you commit — and wrong for the one thing that has to be
        seen after a half-minute wait, because on a 900px viewport the bottom
        of this modal is below the fold. While the export runs, and once it
        has finished, the answer is pinned above everything.
      */}
      {(busy || done) && (
        <p className="bk-export-status" role="status" data-done={done ? 'true' : undefined}>
          {done
            ? `Saved ${done.fileName} — ${done.items} item${done.items === 1 ? '' : 's'} · ${readableBytes(done.bytes)}.`
            : (progress ?? 'Exporting…')}
        </p>
      )}
      <div className="bk-export-depth">
        <DsSegmented
          value={depth}
          onChange={(v) => setDepth(v as 'one' | 'all')}
          options={[
            { value: 'one', label: 'One design each' },
            { value: 'all', label: 'Every variant' },
          ]}
        />
      </div>
      <div className="bk-export-picker">
        {/*
         * Formats, first — it is the one choice that changes what every
         * row below is WORTH. A PNG opens anywhere and is never a choice;
         * the family's own file is what makes this a kit rather than a
         * folder of screenshots, so it is on; a print sheet per
         * deliverable is a real cost for someone who wanted the artwork,
         * so it is off until asked for.
         */}
        <section className="bk-export-group">
          <header className="bk-export-group-head">
            <DsEyebrow>Formats</DsEyebrow>
            <span className="bk-export-group-count">PNG is always included</span>
          </header>
          <div className="bk-export-items">
            <label className="bk-export-item">
              <DsCheckbox
                checked={formats.native !== false}
                onChange={(on) => setFormats((f) => ({ ...f, native: on }))}
                label={
                  chips.length > 0
                    ? `Native files — ${chips.join(' · ')}`
                    : 'Native files — none in this selection'
                }
                disabled={chips.length === 0}
              />
            </label>
            <label className="bk-export-item">
              <DsCheckbox
                checked={Boolean(formats.pdf)}
                onChange={(on) => setFormats((f) => ({ ...f, pdf: on }))}
                label="Print sheets — PDF"
              />
            </label>
          </div>
        </section>
        {groups.map((group) => {
          const state = groupState(group.entries);
          return (
            <section key={group.id} className="bk-export-group">
              <header className="bk-export-group-head">
                <DsCheckbox
                  checked={state.all}
                  onChange={() =>
                    setExcluded((prev) => {
                      const next = new Set(prev);
                      // A half-ticked group ticks fully; a full one clears.
                      for (const e of group.entries) {
                        if (state.all) next.add(e.key);
                        else next.delete(e.key);
                      }
                      return next;
                    })
                  }
                  label={group.label}
                />
                <span className="bk-export-group-count">
                  {state.on} of {group.entries.length}
                </span>
              </header>
              <div className="bk-export-items">
                {group.entries.map((entry) => (
                  <label key={entry.key} className="bk-export-item">
                    <DsCheckbox
                      checked={!excluded.has(entry.key)}
                      onChange={() => toggle(entry.key)}
                      label={entry.label}
                    />
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {/*
        One line, three states: what this WILL cost, what it is doing now, and
        what arrived. The estimate is not replaced by silence the moment the
        work starts, and it is not still promising a minute after the file has
        landed.
      */}
      {/* The cost of what is TICKED — a sentence to read before committing,
          which is why it stays under the list and is replaced by nothing
          once the commitment is made. */}
      {!busy && !done && (
        <p className="bk-export-estimate">
          {chosen.length === 0
            ? 'Nothing selected.'
            : `${chosen.length} item${chosen.length === 1 ? '' : 's'} · roughly ${
                cost.mb < 1 ? '<1' : Math.round(cost.mb)
              } MB · ${readableTime(cost.sec)}. You can cancel while it runs.`}
        </p>
      )}
    </DsModal>
  );
}
