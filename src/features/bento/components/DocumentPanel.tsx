/**
 * The document's own properties: how big it is, what it stands on, and the
 * grid it is laid out over.
 *
 * ── Where these controls used to be ──────────────────────────────────────
 *
 * A toolbar row wedged under the editor's topbar, holding a `DsSelect`, a
 * native colour input dressed as a chip, and a "Layout" button that opened a
 * hand-rolled popover with the sliders in it. Three different disclosure
 * mechanisms for one set of properties, none of them a pattern used anywhere
 * else in the product — and a popover that had to reimplement Escape,
 * click-outside and focus return because the DS has no popover and the frozen
 * shadcn one portals out of the theme scope.
 *
 * A panel needs none of that. The properties are always visible, they are
 * grouped, and they are read in the same place and the same vocabulary as a
 * tile's properties — which is what makes the page feel like one surface
 * rather than a canvas with a control strip stuck to it.
 */
import type { Brand } from '@/shared/types/brand';
import { DsInput, DsSelect, DsSlider } from '@/shared/ds';
import { useBentoStore } from '../store';
import { getTemplate } from '../templates';
import { SIZE_PRESETS } from '../sizes';
import type { SizePresetId } from '../types';
import { Group, Labelled, Swatches, buildPalette, pct } from './controls';

// The dimensions ride in the label because a DsSelectOption's label is a
// string, and they are the half of the choice people actually scan.
const SIZE_OPTIONS = SIZE_PRESETS.map((p) => ({
  value: p.id,
  label: `${p.name} · ${p.width}×${p.height}`,
}));

/** What `makeDefaultDesign` starts every bento on. Reset returns here. */
const DEFAULT_GROUND = '#FFFFFF';

// Reads the raw input value: an emptied number field is "", which must land
// on 1 rather than NaN.
const clampTrack = (v: string) => Math.max(1, Math.min(12, Number(v) || 1));

export function DocumentPanel({ brand }: { brand: Brand | null | undefined }) {
  const design = useBentoStore((s) => s.design);
  const setSize = useBentoStore((s) => s.setSize);
  const setBackground = useBentoStore((s) => s.setBackground);
  const setGap = useBentoStore((s) => s.setGap);
  const setRadius = useBentoStore((s) => s.setRadius);
  const setPadding = useBentoStore((s) => s.setPadding);
  const setGridSize = useBentoStore((s) => s.setGridSize);

  const tpl = getTemplate(design.templateId);
  const cols = design.cols ?? tpl.cols;
  const rows = design.rows ?? tpl.rows;
  const palette = [...buildPalette(brand), '#FFFFFF', '#000000'];
  const isDefaultGround = design.backgroundColor.toLowerCase() === DEFAULT_GROUND.toLowerCase();

  return (
    <div className="bento-inspector-body">
      {/* The panel's own header already says "Canvas"; a group called Canvas
          under it is the same word twice and names nothing. */}
      <Group label="Size" hint="What the exported file measures.">
        <DsSelect
          options={SIZE_OPTIONS}
          value={design.sizeId}
          onChange={(v) => setSize(v as SizePresetId)}
        />
      </Group>

      <Group label="Ground" onReset={isDefaultGround ? undefined : () => setBackground(DEFAULT_GROUND)}>
        <Swatches label="Background" value={design.backgroundColor} palette={palette} onPick={setBackground} />
      </Group>

      <Group label="Grid" hint="How many cells the tiles are placed on.">
        <div className="bento-pair">
          <DsInput
            label="Columns"
            type="number"
            min={1}
            max={12}
            value={cols}
            onChange={(e) => setGridSize(clampTrack(e.target.value), rows)}
          />
          <DsInput
            label="Rows"
            type="number"
            min={1}
            max={12}
            value={rows}
            onChange={(e) => setGridSize(cols, clampTrack(e.target.value))}
          />
        </div>
      </Group>

      <Group label="Spacing">
        <DsSlider label="Gap" value={design.gap} min={0} max={6} step={0.1} format={pct} onChange={setGap} />
        <DsSlider label="Edge padding" value={design.padding} min={0} max={10} step={0.1} format={pct} onChange={setPadding} />
        <DsSlider label="Corner radius" value={design.radius} min={0} max={10} step={0.1} format={pct} onChange={setRadius} />
      </Group>
    </div>
  );
}
