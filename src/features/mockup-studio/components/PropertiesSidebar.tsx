/**
 * PropertiesSidebar — contextual right-panel that shows either the
 * global mockup properties or, when a zone is selected, that zone's
 * transform + design controls.
 */

import { ChevronDown, ChevronUp, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Slider } from '@/components/ui/slider';

import { DesignDropzone } from './DesignDropzone';
import { TintSwatches } from './TintSwatches';
import { BackgroundPanel } from './BackgroundPanel';
import { useMockupStore } from '../state/mockupStore';

export function PropertiesSidebar() {
  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const selection = useMockupStore((s) => s.selection);
  const setZoneDesign = useMockupStore((s) => s.setZoneDesign);
  const setZoneTransform = useMockupStore((s) => s.setZoneTransform);
  const setTint = useMockupStore((s) => s.setTint);
  const setBackground = useMockupStore((s) => s.setBackground);
  const setLightingIntensity = useMockupStore((s) => s.setLightingIntensity);
  const reset = useMockupStore((s) => s.reset);

  if (!template || !mockup) {
    return (
      <aside className="w-72 shrink-0 border-l border-border/60 bg-background p-4">
        <p className="text-xs text-muted-foreground">Pick a template to edit.</p>
      </aside>
    );
  }

  const zoneId =
    selection?.kind === 'zone' ? selection.id : template.zones[0]?.id ?? null;
  const zone = zoneId ? template.zones.find((z) => z.id === zoneId) : null;
  const zoneState = zone ? mockup.zones[zone.id] : null;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border/60 bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Properties</h2>
          <p className="text-[11px] text-muted-foreground">{template.name}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Reset"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {zone && zoneState && (
          <Section title={zone.label} defaultOpen>
            <div className="space-y-3">
              {zoneState.designUrl ? (
                <div className="space-y-2">
                  <div className="flex h-24 items-center justify-center rounded-md bg-muted/40 ring-1 ring-border/60">
                    <img
                      src={zoneState.designUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setZoneDesign(zone.id, null)}
                      className="flex-1 rounded-md bg-muted/60 px-2 py-1.5 text-xs hover:bg-muted"
                    >
                      Remove
                    </button>
                    <label className="flex-1 cursor-pointer rounded-md bg-primary px-2 py-1.5 text-center text-xs text-primary-foreground hover:bg-primary/90">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setZoneDesign(zone.id, url);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <DesignDropzone
                  compact
                  onPick={(url) => setZoneDesign(zone.id, url)}
                />
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Scale</label>
                <Slider
                  value={[zoneState.transform.scale * 100]}
                  min={(zone.constraints?.minScale ?? 0.2) * 100}
                  max={(zone.constraints?.maxScale ?? 2) * 100}
                  step={1}
                  onValueChange={([v]) =>
                    setZoneTransform(zone.id, { scale: v / 100 })
                  }
                />
                <div className="text-right text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(zoneState.transform.scale * 100)}%
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Rotation</label>
                <Slider
                  value={[zoneState.transform.rotation]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([v]) =>
                    setZoneTransform(zone.id, { rotation: v })
                  }
                />
                <div className="text-right text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(zoneState.transform.rotation)}°
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="X"
                  value={zoneState.transform.x}
                  onChange={(v) => setZoneTransform(zone.id, { x: v })}
                />
                <NumberField
                  label="Y"
                  value={zoneState.transform.y}
                  onChange={(v) => setZoneTransform(zone.id, { y: v })}
                />
              </div>
            </div>
          </Section>
        )}

        {template.tintableRegions?.map((region) => (
          <Section key={region.id} title={region.label} defaultOpen>
            <TintSwatches
              region={region}
              value={mockup.tints[region.id]?.color ?? region.defaultColor}
              onChange={(c) => setTint(region.id, c)}
            />
          </Section>
        ))}

        <Section title="Background" defaultOpen={false}>
          <BackgroundPanel value={mockup.background} onChange={setBackground} />
        </Section>

        <Section title="Lighting" defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Intensity
            </div>
            <Slider
              value={[mockup.effects.lightingIntensity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setLightingIntensity(v / 100)}
            />
            <div className="text-right text-[11px] tabular-nums text-muted-foreground">
              {Math.round(mockup.effects.lightingIntensity * 100)}%
            </div>
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="border-b border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:bg-muted/40"
      >
        {title}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rounded border border-border/70 bg-background px-2 py-1 text-xs tabular-nums"
      />
    </label>
  );
}
