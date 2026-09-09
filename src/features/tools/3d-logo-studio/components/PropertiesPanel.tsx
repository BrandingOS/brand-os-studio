/**
 * The properties panel — shape, material, lighting.
 *
 * Everything visible here is a DS primitive over the workspace `.panel`
 * vocabulary; the only feature-local classes are the group frames, which no
 * other surface has. Each mode shows its own controls, because a bevel size on
 * a Flat surface and a sweep angle on an Extrude are controls that do nothing,
 * and a control that does nothing is worse than a missing one.
 */
import { DsSegmented, DsSelect, DsSlider, DsSwitch, DsButton } from '@/shared/ds';

import { DsBanner } from '@/shared/ds';
import type {
  AnimationState, CameraView, GeometryMode, RenderState, Studio3dDocument,
} from '../engine/document';
import { DEFAULT_LIGHT_SOURCE, type LightSource } from '../materials/lighting';
import { currentCameraView } from '../engine/document';
import { MATERIAL_PRESETS } from '../materials/presets';
import { materialOptions } from './MaterialSwatch';
import { LIGHTING_PRESETS } from '../materials/lighting';

export interface PropertiesPanelProps {
  doc: Studio3dDocument;
  onModeChange: (mode: GeometryMode) => void;
  onModePatch: (patch: Record<string, unknown>) => void;
  onMaterialChange: (id: string) => void;
  onLightingChange: (id: string) => void;
  onBackgroundToggle: (visible: boolean) => void;
  onViewChange: (view: CameraView) => void;
  onProjectionChange: (projection: 'orthographic' | 'perspective') => void;
  onRenderChange: (patch: Partial<RenderState>) => void;
  onAnimationChange: (patch: Partial<AnimationState>) => void;
  onLightSourceChange: (patch: Partial<LightSource>) => void;
  onLightSourceReset: () => void;
  /** Set when a traced render was asked for and cannot run on this device. */
  highQualityUnavailable?: string | null;
  onReset: () => void;
}

const MODES: { value: GeometryMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'extrude', label: 'Extrude' },
  { value: 'inflate', label: 'Inflate' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'revolve', label: 'Revolve' },
];

export function PropertiesPanel({
  doc,
  onModeChange,
  onModePatch,
  onMaterialChange,
  onLightingChange,
  onBackgroundToggle,
  onViewChange,
  onProjectionChange,
  onRenderChange,
  onAnimationChange,
  onLightSourceChange,
  onLightSourceReset,
  highQualityUnavailable,
  onReset,
}: PropertiesPanelProps) {
  const { mode } = doc.geometry;
  const view = currentCameraView(doc);
  // The preset's own key light until the user touches it, so the sliders open
  // where the light actually is rather than at some neutral default.
  const light: LightSource = doc.lighting.source ?? DEFAULT_LIGHT_SOURCE;
  // Slider ranges are proportional for the same reason the defaults are: a
  // depth slider that tops out at 60 is most of the way across a 113-unit logo
  // and a rounding error on a 4096-unit one.
  const extent = logoExtent(doc);

  return (
    <div className="panel" aria-label="Properties">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Customize</span>
          <span className="panel-heading-title">{doc.name}</span>
        </div>
      </div>

      <Group title="Shape">
        <DsSegmented
          options={MODES.map((m) => ({ value: m.value, label: m.label }))}
          value={mode}
          onChange={(v) => onModeChange(v as GeometryMode)}
          aria-label="Geometry mode"
        />

        {mode === 'inflate' && (
          <>
            <DsSlider label="Thickness" value={doc.geometry.inflate.thickness}
              min={0} max={round2(extent * 0.3)} step={round2(extent * 0.002)}
              onChange={(v) => onModePatch({ thickness: v })} />
            <DsSlider label="Fullness" value={doc.geometry.inflate.fullness} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ fullness: v })} />
            <DsSlider label="Edge softness" value={doc.geometry.inflate.edgeSoftness} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ edgeSoftness: v })} />
            <DsSlider label="Front / back balance" value={doc.geometry.inflate.balance} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ balance: v })} />
            <DsSlider label="Smoothness" value={doc.geometry.inflate.smoothness} min={0} max={8} step={1}
              onChange={(v) => onModePatch({ smoothness: v })} />
            <DsSlider label="Surface quality" value={doc.geometry.inflate.quality} min={0} max={1} step={0.05}
              onChange={(v) => onModePatch({ quality: v })} />
            <Field label="Components">
              <DsSegmented
                options={[{ value: 'separate', label: 'Separate' }, { value: 'fused', label: 'Fused' }]}
                value={doc.geometry.inflate.mode}
                onChange={(v) => onModePatch({ mode: v })}
                aria-label="Component handling"
              />
            </Field>
          </>
        )}

        {mode === 'sphere' && (
          <>
            <DsSlider label="Roundness" value={doc.geometry.sphere.roundness} min={0} max={1.5} step={0.01}
              onChange={(v) => onModePatch({ roundness: v })} />
            <DsSlider label="Front / back balance" value={doc.geometry.sphere.balance} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ balance: v })} />
            <DsSlider label="Fullness" value={doc.geometry.sphere.fullness} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ fullness: v })} />
            <DsSlider label="Surface quality" value={doc.geometry.sphere.quality} min={0} max={1} step={0.05}
              onChange={(v) => onModePatch({ quality: v })} />
            <Field label="Components">
              <DsSegmented
                options={[{ value: 'separate', label: 'Separate' }, { value: 'fused', label: 'Fused' }]}
                value={doc.geometry.sphere.mode}
                onChange={(v) => onModePatch({ mode: v })}
                aria-label="Component handling"
              />
            </Field>
          </>
        )}

        {mode === 'extrude' && (
          <>
            <DsSlider label="Depth" value={doc.geometry.extrude.depth}
              min={0} max={round2(extent * 0.6)} step={round2(extent * 0.002)}
              onChange={(v) => onModePatch({ depth: v })} />
            <Field label="Alignment">
              <DsSegmented
                options={[{ value: 'front', label: 'Front' }, { value: 'center', label: 'Center' }, { value: 'back', label: 'Back' }]}
                value={doc.geometry.extrude.alignment}
                onChange={(v) => onModePatch({ alignment: v })}
                aria-label="Depth alignment"
              />
            </Field>
            <DsSlider label="Bevel size" value={doc.geometry.extrude.bevelSize}
              min={0} max={round2(extent * 0.12)} step={round2(extent * 0.001)}
              onChange={(v) => onModePatch({ bevelSize: v })} />
            <DsSlider label="Bevel depth" value={doc.geometry.extrude.bevelThickness}
              min={0} max={round2(extent * 0.12)} step={round2(extent * 0.001)}
              onChange={(v) => onModePatch({ bevelThickness: v })} />
            <DsSlider label="Bevel profile" value={doc.geometry.extrude.bevelProfile} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ bevelProfile: v })} />
            <DsSlider label="Curve quality" value={doc.geometry.extrude.curveQuality} min={0} max={1} step={0.05}
              onChange={(v) => onModePatch({ curveQuality: v })} />
          </>
        )}

        {mode === 'flat' && (
          <>
            <DsSlider label="Thickness" value={doc.geometry.flat.thickness}
              min={0} max={round2(extent * 0.04)} step={round2(extent * 0.0004)}
              onChange={(v) => onModePatch({ thickness: v })} />
            <DsSwitch label="Show front" checked={doc.geometry.flat.showFront}
              onChange={(v) => onModePatch({ showFront: v })} />
            <DsSwitch label="Show back" checked={doc.geometry.flat.showBack}
              onChange={(v) => onModePatch({ showBack: v })} />
          </>
        )}

        {mode === 'revolve' && (
          <>
            <Field label="Axis">
              <DsSegmented
                options={[{ value: 'y', label: 'Y' }, { value: 'x', label: 'X' }]}
                value={typeof doc.geometry.revolve.axis === 'string' ? doc.geometry.revolve.axis : 'y'}
                onChange={(v) => onModePatch({ axis: v })}
                aria-label="Revolve axis"
              />
            </Field>
            <DsSlider label="Pivot" value={doc.geometry.revolve.pivot} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ pivot: v })} />
            <DsSlider label="Axis offset" value={doc.geometry.revolve.offset}
              min={-round2(extent)} max={round2(extent)} step={round2(extent * 0.004)}
              onChange={(v) => onModePatch({ offset: v })} />
            <DsSlider label="Sweep" value={doc.geometry.revolve.sweep} min={0.1} max={Math.PI * 2} step={0.01}
              format={(v) => `${Math.round((v * 180) / Math.PI)}°`}
              onChange={(v) => onModePatch({ sweep: v })} />
            <DsSlider label="Segments" value={doc.geometry.revolve.segments} min={3} max={192} step={1}
              onChange={(v) => onModePatch({ segments: v })} />
            <DsSwitch label="Cap the ends" checked={doc.geometry.revolve.caps}
              onChange={(v) => onModePatch({ caps: v })} />
          </>
        )}
      </Group>

      <Group title="Material">
        <DsSelect
          options={materialOptions(MATERIAL_PRESETS)}
          value={doc.materials.defaultId}
          onChange={onMaterialChange}
          aria-label="Material"
        />
      </Group>

      <Group title="View">
        <DsSegmented
          options={[
            { value: 'front', label: 'Front' },
            { value: 'three-quarter', label: '3/4' },
            { value: 'side', label: 'Side' },
            { value: 'top', label: 'Top' },
          ]}
          value={view ?? ''}
          onChange={(v) => onViewChange(v as CameraView)}
          aria-label="Camera view"
        />
        <Field label="Projection">
          <DsSegmented
            options={[
              { value: 'orthographic', label: 'Normal' },
              { value: 'perspective', label: 'Perspective' },
            ]}
            value={doc.camera.projection}
            onChange={(v) => onProjectionChange(v as 'orthographic' | 'perspective')}
            aria-label="Projection"
          />
        </Field>
      </Group>

      <Group title="Lighting">
        <DsSelect
          options={LIGHTING_PRESETS.map((l) => ({ value: l.id, label: l.name }))}
          value={doc.lighting.presetId}
          onChange={onLightingChange}
        />
        <DsSwitch label="Show background" checked={doc.lighting.showBackground} onChange={onBackgroundToggle} />

        <div className="l3d-group-head" style={{ marginTop: 4 }}>
          <span className="l3d-field-label">Light source</span>
          {doc.lighting.source && (
            <DsButton tone="tertiary" size="sm" onClick={onLightSourceReset}>Reset</DsButton>
          )}
        </div>
        <DsSlider label="Direction" value={light.azimuth} min={0} max={1} step={0.01}
          format={(v) => `${Math.round((v - 0.5) * 360)}°`}
          onChange={(v) => onLightSourceChange({ azimuth: v })} />
        <DsSlider label="Height" value={light.elevation} min={0.02} max={0.98} step={0.01}
          format={(v) => (v < 0.34 ? 'high' : v < 0.66 ? 'level' : 'low')}
          onChange={(v) => onLightSourceChange({ elevation: v })} />
        <DsSlider label="Softness" value={light.size} min={0.06} max={0.8} step={0.01}
          onChange={(v) => onLightSourceChange({ size: v })} />
        <DsSlider label="Brightness" value={light.intensity} min={0} max={5} step={0.05}
          onChange={(v) => onLightSourceChange({ intensity: v })} />
      </Group>

      <Group title="Motion">
        <DsSelect
          options={[
            { value: 'static', label: 'None' },
            { value: 'turntable', label: 'Turntable' },
            { value: 'spin', label: 'Spin' },
            { value: 'orbit', label: 'Camera orbit' },
            { value: 'float', label: 'Float' },
            { value: 'oscillate', label: 'Oscillate' },
            { value: 'pulse', label: 'Pulse' },
            { value: 'wobble', label: 'Wobble' },
          ]}
          value={doc.animation.preset}
          onChange={(v) => onAnimationChange({ preset: v as AnimationState['preset'] })}
          aria-label="Motion"
        />
        {doc.animation.preset !== 'static' && (
          <>
            <DsSlider label="Speed" value={doc.animation.speed} min={0} max={4} step={0.05}
              format={(v) => `${v.toFixed(2)}x`}
              onChange={(v) => onAnimationChange({ speed: v })} />
            <DsSlider label="Seconds per turn" value={doc.animation.durationSeconds} min={1} max={30} step={0.5}
              format={(v) => `${v}s`}
              onChange={(v) => onAnimationChange({ durationSeconds: v })} />
            {doc.animation.preset === 'spin' && (
              <Field label="Axis">
                <DsSegmented
                  options={[{ value: 'y', label: 'Y' }, { value: 'x', label: 'X' }, { value: 'z', label: 'Z' }]}
                  value={doc.animation.axis}
                  onChange={(v) => onAnimationChange({ axis: v as AnimationState['axis'] })}
                  aria-label="Rotation axis"
                />
              </Field>
            )}
            <DsSwitch label="Reverse" checked={doc.animation.reverse}
              onChange={(v) => onAnimationChange({ reverse: v })} />
            {doc.render.mode === 'high' && (
              <p className="l3d-note">
                Held still while a high-quality render runs — it accumulates samples of one
                fixed frame, and a moving subject averages to a smear.
              </p>
            )}
          </>
        )}
      </Group>

      <Group title="Render">
        <DsSegmented
          options={[
            { value: 'preview', label: 'Preview' },
            { value: 'high', label: 'High quality' },
          ]}
          value={doc.render.mode}
          onChange={(v) => onRenderChange({ mode: v as RenderState['mode'] })}
          aria-label="Render quality"
        />
        {doc.render.mode === 'high' && (
          <>
            <DsSlider label="Samples" value={doc.render.targetSamples} min={32} max={2048} step={32}
              onChange={(v) => onRenderChange({ targetSamples: v })} />
            <DsSlider label="Resolution" value={doc.render.renderScale} min={0.25} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onRenderChange({ renderScale: v })} />
            {highQualityUnavailable
              ? <DsBanner tone="warning">{highQualityUnavailable}</DsBanner>
              : (
                <p className="l3d-note">
                  Traces real light: the parts of your logo reflect each other, crevices
                  darken, and glass refracts more than once. It restarts whenever anything
                  changes, and it is slow — that is the trade.
                </p>
              )}
          </>
        )}
      </Group>

      <Group title="Project">
        <DsButton tone="secondary" onClick={onReset}>Reset everything</DsButton>
      </Group>
    </div>
  );
}

/** The logo's longest side, in its own units. */
function logoExtent(doc: Studio3dDocument): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of doc.components) {
    for (const ring of c.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        if (ring[i] < minX) minX = ring[i];
        if (ring[i] > maxX) maxX = ring[i];
        if (ring[i + 1] < minY) minY = ring[i + 1];
        if (ring[i + 1] > maxY) maxY = ring[i + 1];
      }
    }
  }
  const extent = Math.max(maxX - minX, maxY - minY);
  return Number.isFinite(extent) && extent > 0 ? extent : 100;
}

/** Two significant figures — a slider step of 0.226 helps nobody. */
function round2(v: number): number {
  if (!(v > 0)) return v;
  // Via toPrecision, not by multiplying back up: 39 * 0.1 is
  // 3.9000000000000004, and a slider whose step is that is a slider that shows
  // it.
  return Number.parseFloat(v.toPrecision(2));
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="l3d-group">
      <div className="l3d-group-head">
        <span className="l3d-group-title">{title}</span>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="l3d-field">
      <span className="l3d-field-label">{label}</span>
      {children}
    </div>
  );
}
