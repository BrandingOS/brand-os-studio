import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type {
  LeadingCurve,
  RatioName,
  ScaleSurface,
  TrackingCurve,
} from '@/shared/types/typescale';
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

const RATIO_ORDER: Array<Exclude<RatioName, 'custom'>> = [
  'minor-second',
  'major-second',
  'minor-third',
  'major-third',
  'perfect-fourth',
  'augmented-fourth',
  'perfect-fifth',
  'golden',
];

function prettyRatio(n: string): string {
  if (n === 'golden') return 'Golden';
  return n.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * ScaleControls — visual ratio cards + collapsible advanced knobs.
 * The ratio grid gives each option a mini three-bar preview so users
 * can SEE the progression they're picking. Base/steps/leading/tracking/
 * fluid live under a single "Advanced" collapsible.
 */
export function ScaleControls({ surface, onChange, compact }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const set = (patch: Partial<ScaleSurface>) =>
    onChange(rebuild({ ...surface, ...patch } as ScaleSurface));

  if (compact) {
    return (
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Scale</h3>
        <label className="block text-xs">
          Base size: {surface.basePx}px
          <input
            type="range"
            min={12}
            max={48}
            step={1}
            value={surface.basePx}
            onChange={e => set({ basePx: Number(e.target.value) })}
            className="w-full"
          />
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
            {Object.keys(RATIOS).map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          Steps up: {surface.stepsUp}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={surface.stepsUp}
            onChange={e => set({ stepsUp: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="block text-xs">
          Steps down: {surface.stepsDown}
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={surface.stepsDown}
            onChange={e => set({ stepsDown: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      </section>
    );
  }

  return (
    <div className="ts-section">
      <div className="ts-section-head" aria-hidden>
        <span className="ts-section-title">Scale ratio</span>
      </div>
      <div className="ts-section-body">
        <div className="ts-ratio-grid" role="radiogroup" aria-label="Scale ratio">
          {RATIO_ORDER.map(name => {
            const value = RATIOS[name];
            const active = surface.ratio.name === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={active}
                className={`ts-ratio-card${active ? ' is-active' : ''}`}
                onClick={() => set({ ratio: { name, value } })}
              >
                <div className="ts-ratio-card-preview" aria-hidden>
                  <span style={{ fontSize: 8 }}>T</span>
                  <span style={{ fontSize: 8 * value }}>T</span>
                  <span style={{ fontSize: 8 * value * value }}>T</span>
                </div>
                <div className="ts-ratio-card-name">{prettyRatio(name)}</div>
                <div className="ts-ratio-card-value">{value.toFixed(3)}</div>
              </button>
            );
          })}
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="ts-advanced-trigger">
              <span>Advanced</span>
              <ChevronDown
                size={14}
                className={`ts-advanced-chevron${advancedOpen ? ' is-open' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="ts-advanced-content">
            <div className="ts-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="ts-field-label">Base size</span>
                <span className="ts-field-value">{surface.basePx}px</span>
              </div>
              <input
                type="range"
                className="ts-range"
                min={12}
                max={48}
                step={1}
                value={surface.basePx}
                onChange={e => set({ basePx: Number(e.target.value) })}
              />
            </div>

            <div className="ts-field-row">
              <div className="ts-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="ts-field-label">Steps up</span>
                  <span className="ts-field-value">{surface.stepsUp}</span>
                </div>
                <input
                  type="range"
                  className="ts-range"
                  min={1}
                  max={10}
                  step={1}
                  value={surface.stepsUp}
                  onChange={e => set({ stepsUp: Number(e.target.value) })}
                />
              </div>
              <div className="ts-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="ts-field-label">Steps down</span>
                  <span className="ts-field-value">{surface.stepsDown}</span>
                </div>
                <input
                  type="range"
                  className="ts-range"
                  min={0}
                  max={4}
                  step={1}
                  value={surface.stepsDown}
                  onChange={e => set({ stepsDown: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="ts-field-row">
              <div className="ts-field">
                <span className="ts-field-label">Leading</span>
                <select
                  className="ts-select"
                  aria-label="Leading"
                  value={surface.leading}
                  onChange={e => set({ leading: e.target.value as LeadingCurve })}
                >
                  <option value="tight">tight</option>
                  <option value="normal">normal</option>
                  <option value="loose">loose</option>
                </select>
              </div>
              <div className="ts-field">
                <span className="ts-field-label">Tracking</span>
                <select
                  className="ts-select"
                  aria-label="Tracking"
                  value={surface.tracking}
                  onChange={e => set({ tracking: e.target.value as TrackingCurve })}
                >
                  <option value="tight">tight</option>
                  <option value="normal">normal</option>
                  <option value="loose">loose</option>
                </select>
              </div>
            </div>

            {surface.key === 'web' && surface.fluid && (
              <div
                className="ts-field"
                style={{
                  paddingTop: 10,
                  borderTop: '1px solid var(--border)',
                  gap: 10,
                }}
              >
                <span className="ts-field-label">Fluid</span>

                <div className="ts-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="ts-field-label" style={{ letterSpacing: '0.1em' }}>
                      Min viewport
                    </span>
                    <span className="ts-field-value">{surface.fluid.minVwPx}px</span>
                  </div>
                  <input
                    type="range"
                    className="ts-range"
                    min={280}
                    max={640}
                    step={10}
                    value={surface.fluid.minVwPx}
                    onChange={e =>
                      set({ fluid: { ...surface.fluid!, minVwPx: Number(e.target.value) } })
                    }
                  />
                </div>

                <div className="ts-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="ts-field-label" style={{ letterSpacing: '0.1em' }}>
                      Max viewport
                    </span>
                    <span className="ts-field-value">{surface.fluid.maxVwPx}px</span>
                  </div>
                  <input
                    type="range"
                    className="ts-range"
                    min={1024}
                    max={1920}
                    step={20}
                    value={surface.fluid.maxVwPx}
                    onChange={e =>
                      set({ fluid: { ...surface.fluid!, maxVwPx: Number(e.target.value) } })
                    }
                  />
                </div>

                <div className="ts-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="ts-field-label" style={{ letterSpacing: '0.1em' }}>
                      Min ratio × base
                    </span>
                    <span className="ts-field-value">{surface.fluid.minRatioMultiplier}</span>
                  </div>
                  <input
                    type="range"
                    className="ts-range"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={surface.fluid.minRatioMultiplier}
                    onChange={e =>
                      set({
                        fluid: {
                          ...surface.fluid!,
                          minRatioMultiplier: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
