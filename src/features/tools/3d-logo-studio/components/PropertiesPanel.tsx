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

import type { CameraView, GeometryMode, Studio3dDocument } from '../engine/document';
import { currentCameraView } from '../engine/document';
import { MATERIAL_PRESETS } from '../materials/presets';
import { LIGHTING_PRESETS } from '../materials/lighting';

export interface PropertiesPanelProps {
  doc: Studio3dDocument;
  onModeChange: (mode: GeometryMode) => void;
  onModePatch: (patch: Record<string, unknown>) => void;
  onMaterialChange: (id: string) => void;
  onLightingChange: (id: string) => void;
  onBackgroundToggle: (visible: boolean) => void;
  onViewChange: (view: CameraView) => void;
  onReset: () => void;
}

const MODES: { value: GeometryMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'extrude', label: 'Extrude' },
  { value: 'inflate', label: 'Inflate' },
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
  onReset,
}: PropertiesPanelProps) {
  const { mode } = doc.geometry;
  const view = currentCameraView(doc);

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
            <DsSlider label="Thickness" value={doc.geometry.inflate.thickness} min={0.5} max={30} step={0.5}
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

        {mode === 'extrude' && (
          <>
            <DsSlider label="Depth" value={doc.geometry.extrude.depth} min={0} max={60} step={0.5}
              onChange={(v) => onModePatch({ depth: v })} />
            <Field label="Alignment">
              <DsSegmented
                options={[{ value: 'front', label: 'Front' }, { value: 'center', label: 'Center' }, { value: 'back', label: 'Back' }]}
                value={doc.geometry.extrude.alignment}
                onChange={(v) => onModePatch({ alignment: v })}
                aria-label="Depth alignment"
              />
            </Field>
            <DsSlider label="Bevel size" value={doc.geometry.extrude.bevelSize} min={0} max={12} step={0.25}
              onChange={(v) => onModePatch({ bevelSize: v })} />
            <DsSlider label="Bevel depth" value={doc.geometry.extrude.bevelThickness} min={0} max={12} step={0.25}
              onChange={(v) => onModePatch({ bevelThickness: v })} />
            <DsSlider label="Bevel profile" value={doc.geometry.extrude.bevelProfile} min={0} max={1} step={0.01}
              onChange={(v) => onModePatch({ bevelProfile: v })} />
            <DsSlider label="Curve quality" value={doc.geometry.extrude.curveQuality} min={0} max={1} step={0.05}
              onChange={(v) => onModePatch({ curveQuality: v })} />
          </>
        )}

        {mode === 'flat' && (
          <>
            <DsSlider label="Thickness" value={doc.geometry.flat.thickness} min={0} max={4} step={0.05}
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
            <DsSlider label="Axis offset" value={doc.geometry.revolve.offset} min={-60} max={60} step={0.5}
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
          options={MATERIAL_PRESETS.map((m) => ({ value: m.id, label: m.name }))}
          value={doc.materials.defaultId}
          onChange={onMaterialChange}
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
          value={view ?? 'front'}
          onChange={(v) => onViewChange(v as CameraView)}
          aria-label="Camera view"
        />
      </Group>

      <Group title="Lighting">
        <DsSelect
          options={LIGHTING_PRESETS.map((l) => ({ value: l.id, label: l.name }))}
          value={doc.lighting.presetId}
          onChange={onLightingChange}
        />
        <DsSwitch label="Show background" checked={doc.lighting.showBackground} onChange={onBackgroundToggle} />
      </Group>

      <Group title="Project">
        <DsButton tone="secondary" onClick={onReset}>Reset everything</DsButton>
      </Group>
    </div>
  );
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
