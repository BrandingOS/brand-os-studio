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
import { DsButton, DsCheckbox, DsModal, DsSegmented } from '@/shared/ds';
import { KIT_GROUPS, type KitEntry, type KitGroup } from '../catalog/catalog';
import { planKitExport, type KitExportUnit } from '../data/exportEverything';

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

function estimate(units: KitExportUnit[]): { mb: number; sec: number } {
  return units.reduce(
    (acc, u) => ({ mb: acc.mb + COST[u.kind].mb, sec: acc.sec + COST[u.kind].sec }),
    { mb: 0, sec: 0 },
  );
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
}: {
  open: boolean;
  onClose: () => void;
  /** Every entry this viewer can see, in catalog order. */
  entries: ReadonlyArray<KitEntry>;
  onExport: (chosen: KitEntry[], allVariants: boolean) => void;
}) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  // One design per item is the honest default: a kit is a document you
  // hand someone. "Every variant" is here because a card showing thirty
  // letterheads and a zip containing one of them is the other complaint.
  const [depth, setDepth] = useState<'one' | 'all'>('one');

  const chosen = useMemo(
    () => entries.filter((e) => !excluded.has(e.key)),
    [entries, excluded],
  );
  const cost = useMemo(() => {
    const base = estimate(planKitExport(chosen));
    if (depth === 'one') return base;
    // A rough multiplier rather than a real count: the variant list is
    // per brand and per card, and pricing it exactly would mean building
    // every template list just to draw a sentence.
    const cards = planKitExport(chosen).filter((u) => u.kind === 'card').length;
    return { mb: base.mb + cards * 0.4, sec: base.sec + cards * 6 };
  }, [chosen, depth]);

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
        <>
          <DsButton tone="secondary" onClick={onClose}>Cancel</DsButton>
          <DsButton
            tone="primary"
            disabled={chosen.length === 0}
            onClick={() => onExport([...chosen], depth === 'all')}
          >
            {chosen.length === entries.length
              ? 'Export everything'
              : `Export ${chosen.length} item${chosen.length === 1 ? '' : 's'}`}
          </DsButton>
        </>
      }
    >
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
      <p className="bk-export-estimate">
        {chosen.length === 0
          ? 'Nothing selected.'
          : `${chosen.length} item${chosen.length === 1 ? '' : 's'} · roughly ${
              cost.mb < 1 ? '<1' : Math.round(cost.mb)
            } MB · ${readableTime(cost.sec)}. You can cancel while it runs.`}
      </p>
    </DsModal>
  );
}
