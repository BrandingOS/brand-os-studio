// Properties panel — context-sensitive editor for the selected layer.
// Phase 1 scope: position, size, opacity, lock, plus per-kind essentials
// (text content + size + color, shape fill, etc.).

import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type {
  BrandOSDocument,
  Layer,
  ResolvedValue,
  SelectionState,
  ShapeLayer,
  TextLayer,
} from '@/features/editor/schema';

interface Props {
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  selection: SelectionState;
}

export function EditorPropertiesPanel({ adapter, doc, selection }: Props) {
  const page = doc.pages.find((p) => p.id === selection.pageId) ?? doc.pages[0];
  if (!page) return <Empty />;
  if (selection.layerIds.length !== 1) return <Empty />;
  const layer = page.layers.find((l) => l.id === selection.layerIds[0]);
  if (!layer) return <Empty />;

  const update = (patch: Partial<Layer>) => adapter.updateLayer(page.id, layer.id, patch);

  return (
    <aside className="flex w-72 flex-col border-l bg-background">
      <header className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Properties · {layer.kind}
      </header>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Section title="Layer">
          <Field label="Name">
            <input
              type="text"
              value={layer.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full rounded border bg-background px-2 py-1 text-xs"
            />
          </Field>
          <ToggleField
            label="Visible"
            value={layer.visible}
            onChange={(v) => update({ visible: v })}
          />
          <ToggleField
            label="Locked"
            value={layer.locked}
            onChange={(v) => update({ locked: v })}
          />
          <ToggleField
            label="Brand-managed"
            value={layer.brandLocked}
            onChange={(v) => update({ brandLocked: v })}
            help="When on, brand-derived values are read-only and reapplied when the brand kit changes."
          />
        </Section>

        <Section title="Transform">
          <NumberPair
            label="Position"
            a={['X', layer.transform.x]}
            b={['Y', layer.transform.y]}
            onChange={(x, y) =>
              update({ transform: { ...layer.transform, x, y } })
            }
          />
          <NumberPair
            label="Size"
            a={['W', layer.transform.width]}
            b={['H', layer.transform.height]}
            onChange={(width, height) =>
              update({ transform: { ...layer.transform, width, height } })
            }
          />
          <Field label="Rotation (°)">
            <input
              type="number"
              value={layer.transform.rotation}
              onChange={(e) =>
                update({
                  transform: { ...layer.transform, rotation: Number(e.target.value) },
                })
              }
              className="w-full rounded border bg-background px-2 py-1 text-xs"
            />
          </Field>
          <Field label={`Opacity ${(layer.opacity * 100).toFixed(0)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={layer.opacity}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </Section>

        {layer.kind === 'text' ? <TextProps layer={layer} update={update} /> : null}
        {layer.kind === 'shape' ? <ShapeProps layer={layer} update={update} /> : null}
      </div>
    </aside>
  );
}

function Empty() {
  return (
    <aside className="flex w-72 flex-col items-center justify-center border-l bg-background text-xs text-muted-foreground">
      Select a layer to edit its properties.
    </aside>
  );
}

function TextProps({
  layer,
  update,
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
}) {
  return (
    <Section title="Text">
      <Field label="Content">
        <textarea
          value={layer.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Size">
        <input
          type="number"
          value={layer.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Weight">
        <input
          type="number"
          step={100}
          value={layer.fontWeight}
          onChange={(e) => update({ fontWeight: Number(e.target.value) })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <ColorField label="Color" value={layer.color} onChange={(v) => update({ color: v })} />
    </Section>
  );
}

function ShapeProps({
  layer,
  update,
}: {
  layer: ShapeLayer;
  update: (patch: Partial<ShapeLayer>) => void;
}) {
  return (
    <Section title="Shape">
      <ColorField
        label="Fill"
        value={layer.fill ?? '#000000'}
        onChange={(v) => update({ fill: v })}
        nullable
        onClear={() => update({ fill: null })}
      />
      <ColorField
        label="Stroke"
        value={layer.stroke ?? '#000000'}
        onChange={(v) => update({ stroke: v })}
        nullable
        onClear={() => update({ stroke: null })}
      />
      <Field label="Stroke width">
        <input
          type="number"
          value={layer.strokeWidth}
          onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      {layer.shape === 'rectangle' ? (
        <Field label="Corner radius">
          <input
            type="number"
            value={layer.cornerRadius}
            onChange={(e) => update({ cornerRadius: Number(e.target.value) })}
            className="w-full rounded border bg-background px-2 py-1 text-xs"
          />
        </Field>
      ) : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px]"
      />
      <span>
        <span className="text-foreground">{label}</span>
        {help ? <span className="block opacity-70">{help}</span> : null}
      </span>
    </label>
  );
}

function NumberPair({
  label,
  a,
  b,
  onChange,
}: {
  label: string;
  a: [string, number];
  b: [string, number];
  onChange: (a: number, b: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <Pair label={a[0]} value={a[1]} onChange={(v) => onChange(v, b[1])} />
        <Pair label={b[0]} value={b[1]} onChange={(v) => onChange(a[1], v)} />
      </div>
    </Field>
  );
}

function Pair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-1 items-center gap-1 rounded border bg-background px-1.5 py-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 bg-transparent text-xs outline-none"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  nullable,
  onClear,
}: {
  label: string;
  value: ResolvedValue;
  onChange: (v: string) => void;
  nullable?: boolean;
  onClear?: () => void;
}) {
  // Phase 1: only literal colors editable. SlotRefs render as a read-only chip.
  if (typeof value !== 'string') {
    return (
      <Field label={label}>
        <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1 text-xs">
          <span className="opacity-70">slot:</span>
          <span className="font-mono">{value.type}</span>
        </div>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border bg-background"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded border bg-background px-2 py-1 font-mono text-xs"
        />
        {nullable && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            None
          </button>
        ) : null}
      </div>
    </Field>
  );
}
