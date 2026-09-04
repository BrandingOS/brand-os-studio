import { DsInput, DsSlider } from '@/shared/ds';
import { Sliders } from 'lucide-react';
import { useBentoStore } from '../store';
import { getTemplate } from '../templates';
import { BentoPopover } from './BentoPopover';

const pct = (v: number) => `${v.toFixed(1)}%`;
// Reads the raw input value: an emptied number field is "", which must
// land on 1 rather than NaN.
const clampTrack = (v: string) => Math.max(1, Math.min(12, Number(v) || 1));

export function LayoutPopover() {
  const design = useBentoStore((s) => s.design);
  const setGap = useBentoStore((s) => s.setGap);
  const setRadius = useBentoStore((s) => s.setRadius);
  const setPadding = useBentoStore((s) => s.setPadding);
  const setGridSize = useBentoStore((s) => s.setGridSize);

  const tpl = getTemplate(design.templateId);
  const cols = design.cols ?? tpl.cols;
  const rows = design.rows ?? tpl.rows;

  return (
    <BentoPopover label="Layout" icon={<Sliders size={14} aria-hidden />}>
      <div className="bento-pop-body">
        <DsSlider label="Gap" value={design.gap} min={0} max={6} step={0.1} format={pct} onChange={setGap} />
        <DsSlider label="Edge padding" value={design.padding} min={0} max={10} step={0.1} format={pct} onChange={setPadding} />
        <DsSlider label="Corner radius" value={design.radius} min={0} max={10} step={0.1} format={pct} onChange={setRadius} />

        <div className="bento-pop-group">
          <span className="ds-eyebrow">Grid</span>
          <div className="bento-pop-pair">
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
        </div>
      </div>
    </BentoPopover>
  );
}
