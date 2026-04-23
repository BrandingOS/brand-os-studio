import type { LeadingCurve, ScaleSurface, TrackingCurve } from '@/shared/types/typescale';
import { buildLadder, toFluid, RATIOS } from '../engine';

interface Props {
  surface: ScaleSurface;
  onChange: (next: ScaleSurface) => void;
  compact?: boolean;
}

function rebuild(s: ScaleSurface): ScaleSurface {
  let steps = buildLadder({
    basePx: s.basePx,
    ratio: s.ratio.value,
    stepsUp: s.stepsUp,
    stepsDown: s.stepsDown,
    leading: s.leading,
    tracking: s.tracking,
  });
  if (s.key === 'web' && s.fluid) steps = steps.map(st => toFluid(st, s.fluid!));
  return { ...s, steps };
}

export function ScaleControls({ surface, onChange }: Props) {
  const set = (patch: Partial<ScaleSurface>) => onChange(rebuild({ ...surface, ...patch } as ScaleSurface));
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Scale</h3>
      <label className="block text-xs">
        Base size: {surface.basePx}px
        <input type="range" min={12} max={48} step={1} value={surface.basePx}
               onChange={e => set({ basePx: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">
        Ratio
        <select
          className="w-full rounded border px-2 py-1"
          value={surface.ratio.name === 'custom' ? 'custom' : surface.ratio.name}
          onChange={e => {
            const name = e.target.value as keyof typeof RATIOS;
            set({ ratio: { name, value: RATIOS[name] } });
          }}
        >
          {Object.keys(RATIOS).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="block text-xs">Steps up: {surface.stepsUp}
        <input type="range" min={1} max={10} step={1} value={surface.stepsUp}
               onChange={e => set({ stepsUp: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">Steps down: {surface.stepsDown}
        <input type="range" min={0} max={4} step={1} value={surface.stepsDown}
               onChange={e => set({ stepsDown: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">Leading
        <select className="w-full rounded border px-2 py-1" value={surface.leading}
                onChange={e => set({ leading: e.target.value as LeadingCurve })}>
          <option value="tight">tight</option><option value="normal">normal</option><option value="loose">loose</option>
        </select>
      </label>
      <label className="block text-xs">Tracking
        <select className="w-full rounded border px-2 py-1" value={surface.tracking}
                onChange={e => set({ tracking: e.target.value as TrackingCurve })}>
          <option value="tight">tight</option><option value="normal">normal</option><option value="loose">loose</option>
        </select>
      </label>
      {surface.key === 'web' && surface.fluid && (
        <fieldset className="space-y-2 text-xs">
          <legend className="font-medium">Fluid</legend>
          <label>Min vw: {surface.fluid.minVwPx}px
            <input type="range" min={280} max={640} step={10} value={surface.fluid.minVwPx}
                   onChange={e => set({ fluid: { ...surface.fluid!, minVwPx: Number(e.target.value) } })} className="w-full" />
          </label>
          <label>Max vw: {surface.fluid.maxVwPx}px
            <input type="range" min={1024} max={1920} step={20} value={surface.fluid.maxVwPx}
                   onChange={e => set({ fluid: { ...surface.fluid!, maxVwPx: Number(e.target.value) } })} className="w-full" />
          </label>
          <label>Min ratio × base: {surface.fluid.minRatioMultiplier}
            <input type="range" min={0.5} max={1} step={0.05} value={surface.fluid.minRatioMultiplier}
                   onChange={e => set({ fluid: { ...surface.fluid!, minRatioMultiplier: Number(e.target.value) } })} className="w-full" />
          </label>
        </fieldset>
      )}
    </section>
  );
}
