import { useRef, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, ImagePlus } from 'lucide-react';
import { DsSwitch } from '@/shared/ds';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import { AssetSourcePopover } from '@/shared/upload/AssetSourcePopover';
import { fieldGroupsFor, findFieldForPath, type FieldGroup, type FieldSpec } from './fields';
import { getAtPath, getStringAtPath, setAtPath } from './paths';
import { invoiceTotals, formatMoney } from './compute';
import {
  isInvoice,
  nextItemId,
  type ContentKind,
  type DeliverableContent,
  type InvoiceContent,
} from './kinds';
// The `.bk-qe-*` rules this panel's classNames rely on — moved here
// (2026-08-20) from `brand-kit.css` so the panel is styled wherever it
// mounts, including the Design editor route, which never imports any
// Brand Kit page. See content.css's own header for why.
import './content.css';

/**
 * The contextual panel.
 *
 * What it replaced: the same four rails for every deliverable — Image,
 * Colors, Logos, Typography — whether you were editing a favicon or an
 * invoice, with "Image" offering to change the card's THUMBNAIL rather
 * than anything on the artifact in front of you.
 *
 * What decides the contents here is the deliverable's content kind and
 * what the user has selected. Nothing in this file knows what an invoice
 * or a deck is; it renders whatever `fieldGroupsFor` declares, so a new
 * kind is a declaration rather than another branch in a component.
 *
 * That is why the list control is RECURSIVE. A deck slide is a row with
 * its own list of bullets inside it; expressing that as "the list field
 * renders fields, and one of those fields may be a list" costs nothing,
 * whereas a second, slide-shaped control would have put deck knowledge in
 * here and left the next nested kind to write a third.
 */

type Props = {
  kind: ContentKind;
  content: DeliverableContent;
  onChange: (next: DeliverableContent) => void;
  /** Path of the bound region selected on the artifact, if any. */
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onResetContent: () => void;
  /**
   * Override the declaration. The panel renders groups, and the kind is
   * only how it looks them up — a host that owns a further set of
   * controls (the card editor's design picks) supplies them here rather
   * than growing a second panel.
   */
  groups?: FieldGroup[];
  /** Whose asset library an `image` field offers. */
  brandId?: string;
};

export function ContentPanel({
  kind,
  content,
  onChange,
  selectedPath,
  onSelect,
  onResetContent,
  groups: groupsProp,
  brandId,
}: Props) {
  const groups = groupsProp ?? fieldGroupsFor(kind);
  const selected = selectedPath ? findFieldForPath(kind, selectedPath) : null;

  const set = (path: string, value: unknown) => onChange(setAtPath(content, path, value));

  return (
    <div className="bk-qe-panel">
      {selected && selectedPath && selected.field.type !== 'list' && (
        <Group
          title="Selected"
          hint={`${selected.group.title} · click the artifact to pick something else`}
          action={
            <button
              type="button"
              className="bk-editor-group-reset"
              onClick={() => onSelect(null)}
            >
              Clear
            </button>
          }
        >
          {/* NOT autofocused. Selecting a region on the artifact means the
              caret belongs there — focusing this input the moment the panel
              appeared pulled it straight back out again, which made inline
              editing impossible: every click committed nothing and left. */}
          <FieldControl
            key={selected.absolutePath}
            spec={{ ...selected.field, path: selected.absolutePath } as FieldSpec}
            content={content}
            onSet={set}
            onChange={onChange}
            selectedPath={selectedPath}
            onSelect={onSelect}
            brandId={brandId}
          />
        </Group>
      )}

      {groups.map((group) => (
        <Group
          key={group.id}
          title={group.title}
          hint={group.hint}
          action={
            group.id === groups[0]?.id ? (
              <button
                type="button"
                className="bk-editor-group-reset"
                onClick={onResetContent}
                title="Reset content"
              >
                <RotateCcw size={12} aria-hidden />
                <span>Reset</span>
              </button>
            ) : undefined
          }
        >
          {group.fields.map((spec) => (
            <FieldControl
              key={spec.path}
              spec={spec}
              content={content}
              onSet={set}
              onChange={onChange}
              selectedPath={selectedPath}
              onSelect={onSelect}
              brandId={brandId}
            />
          ))}
        </Group>
      ))}

      {isInvoice(content) && <Totals content={content} />}
    </div>
  );
}

/* ── Dispatch ─────────────────────────────────────────────────────── */

type ControlProps = {
  spec: FieldSpec;
  content: DeliverableContent;
  onSet: (path: string, value: unknown) => void;
  onChange: (next: DeliverableContent) => void;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  brandId?: string;
};

function FieldControl(props: ControlProps) {
  const { spec } = props;
  if (spec.type === 'list') return <ListField {...props} spec={spec} />;
  if (spec.type === 'stringList') return <StringListField {...props} spec={spec} />;
  if (spec.type === 'color') return <ColorField {...props} spec={spec} />;
  if (spec.type === 'image') return <ImageField {...props} spec={spec} />;
  if (spec.type === 'boolean') return <BooleanField {...props} spec={spec} />;
  return (
    <Field
      spec={spec}
      content={props.content}
      onSet={props.onSet}
      selected={props.selectedPath === spec.path}
      onSelect={() => props.onSelect(spec.path)}
    />
  );
}

/* ── Totals ───────────────────────────────────────────────────────── */

/**
 * Read-only, and that is the point.
 *
 * These are computed from the line items on every render. There is no
 * input here because there is nothing to type: a total you can edit is a
 * total that can disagree with the invoice it belongs to, which is
 * exactly what the old hardcoded "Total · $8,715" did.
 */
function Totals({ content }: { content: InvoiceContent }) {
  const t = invoiceTotals(content);
  const money = (n: number) => formatMoney(n, content.currency);
  return (
    <div className="bk-qe-totals">
      <div className="bk-qe-total-row">
        <span>Subtotal</span>
        <span>{money(t.subtotal)}</span>
      </div>
      {t.discount > 0 && (
        <div className="bk-qe-total-row">
          <span>Discount</span>
          <span>−{money(t.discount)}</span>
        </div>
      )}
      <div className="bk-qe-total-row">
        <span>Tax</span>
        <span>{money(t.tax)}</span>
      </div>
      <div className="bk-qe-total-row is-grand">
        <span>Total</span>
        <span>{money(t.total)}</span>
      </div>
    </div>
  );
}

/* ── Lists ────────────────────────────────────────────────────────── */

/**
 * A collection of records — invoice line items, hero stats, deck slides.
 *
 * Knows nothing about any of them: the rows come from the content at the
 * declared path and every control inside a row is another `FieldControl`,
 * which is what lets a slide carry its own list of bullets.
 */
function ListField({
  spec,
  content,
  onChange,
  selectedPath,
  onSelect,
  brandId,
}: ControlProps & { spec: Extract<FieldSpec, { type: 'list' }> }) {
  const raw = getAtPath(content, spec.path);
  const items: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : [];

  const replace = (next: unknown[]) => onChange(setAtPath(content, spec.path, next));

  const add = () => {
    const prefix = spec.idPrefix ?? 'item';
    const row = {
      ...(spec.itemDefaults ?? {}),
      id: nextItemId(items as Array<{ id?: string }>, prefix),
    };
    replace([...items, row]);
  };

  const remove = (index: number) => {
    // Selection points at an INDEX, so removing a row would leave it
    // aimed at whatever slid into that slot — or past the end.
    onSelect(null);
    replace(items.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    onSelect(null);
    const next = items.slice();
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row);
    replace(next);
  };

  return (
    <div className="bk-qe-list">
      {items.map((item, index) => (
        <div
          key={typeof item.id === 'string' ? item.id : `${spec.path}-${index}`}
          className={`bk-qe-item${selectedPath?.startsWith(`${spec.path}.${index}.`) ? ' is-selected' : ''}`}
        >
          <div className="bk-qe-item-head">
            <span className="bk-qe-item-index">{String(index + 1).padStart(2, '0')}</span>
            <div className="bk-qe-item-actions">
              <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                <ArrowUp size={12} aria-hidden />
              </IconButton>
              <IconButton
                label="Move down"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              >
                <ArrowDown size={12} aria-hidden />
              </IconButton>
              <IconButton label={`Remove ${spec.itemLabel.toLowerCase()}`} onClick={() => remove(index)}>
                <Trash2 size={12} aria-hidden />
              </IconButton>
            </div>
          </div>
          <div className="bk-qe-item-fields">
            {spec.itemFields.map((itemField) => {
              const path = `${spec.path}.${index}.${itemField.path}`;
              return (
                <FieldControl
                  key={path}
                  spec={{ ...itemField, path } as FieldSpec}
                  content={content}
                  onSet={(p, v) => onChange(setAtPath(content, p, v))}
                  onChange={onChange}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  brandId={brandId}
                />
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="bk-qe-add" onClick={add}>
        <Plus size={13} aria-hidden />
        <span>Add {spec.itemLabel.toLowerCase()}</span>
      </button>
    </div>
  );
}

/**
 * A list of plain strings.
 *
 * Address lines, nav links and slide bullets are all "several short
 * strings in an order", and none of them is a record with fields. Giving
 * them a record control would have meant inventing a wrapper object for
 * every one of them purely so the panel had something to address.
 */
function StringListField({
  spec,
  content,
  onChange,
  onSelect,
}: ControlProps & { spec: Extract<FieldSpec, { type: 'stringList' }> }) {
  const raw = getAtPath(content, spec.path);
  const items: string[] = Array.isArray(raw) ? raw.map((v) => (typeof v === 'string' ? v : '')) : [];

  const replace = (next: string[]) => onChange(setAtPath(content, spec.path, next));

  return (
    <div className="bk-qe-field bk-qe-strings">
      <span className="bk-qe-field-label">{spec.label}</span>
      {items.map((value, index) => (
        <div className="bk-qe-string-row" key={`${spec.path}-${index}`}>
          <input
            className="bk-qe-input"
            type="text"
            value={value}
            placeholder={spec.placeholder}
            aria-label={`${spec.itemLabel} ${index + 1}`}
            onChange={(e) => {
              const next = items.slice();
              next[index] = e.target.value;
              replace(next);
            }}
          />
          <IconButton
            label={`Remove ${spec.itemLabel.toLowerCase()} ${index + 1}`}
            onClick={() => {
              onSelect(null);
              replace(items.filter((_, i) => i !== index));
            }}
          >
            <Trash2 size={12} aria-hidden />
          </IconButton>
        </div>
      ))}
      <button type="button" className="bk-qe-add" onClick={() => replace([...items, ''])}>
        <Plus size={13} aria-hidden />
        <span>Add {spec.itemLabel.toLowerCase()}</span>
      </button>
    </div>
  );
}

/* ── Colour ───────────────────────────────────────────────────────── */

/**
 * A hex, edited through the app's ONE colour picker.
 *
 * `data-workspace` is set on the wrapper because `ColorPickerHSV`'s
 * `cp-*` rules are scoped to it, and this panel mounts in places that are
 * not inside a workspace shell — the Design editor's properties rail
 * among them.
 */
function ColorField({
  spec,
  content,
  onSet,
  onSelect,
  selectedPath,
}: ControlProps & { spec: Extract<FieldSpec, { type: 'color' }> }) {
  const [open, setOpen] = useState(false);
  const value = getStringAtPath(content, spec.path) || '#000000';
  return (
    <div
      className={`bk-qe-field${selectedPath === spec.path ? ' is-selected' : ''}`}
      data-workspace=""
    >
      <span className="bk-qe-field-label">{spec.label}</span>
      <button
        type="button"
        className="bk-qe-color-trigger"
        onClick={() => {
          onSelect(spec.path);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
      >
        <span className="bk-qe-color-chip" style={{ background: value }} aria-hidden />
        <span className="bk-qe-color-hex">{value.toUpperCase()}</span>
      </button>
      {open && (
        <div className="cp-expand is-open bk-qe-color-picker">
          <ColorPickerHSV
            hex={value}
            compact
            onChange={(hex) => onSet(spec.path, hex)}
            onCommit={(hex) => {
              onSet(spec.path, hex);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Image ────────────────────────────────────────────────────────── */

/**
 * An image, through the canonical picker.
 *
 * `AssetSourcePopover` is the one place in the product that offers
 * "upload from device" and the brand's own library side by side, so a
 * deliverable's artwork is picked exactly the way a logo slot is. A file
 * from the desktop is read to a data url and stored inline: content is
 * saved as one JSON object, and a `blob:` url would resolve to nothing
 * the moment the page reloaded.
 */
function ImageField({
  spec,
  content,
  onSet,
  brandId,
}: ControlProps & { spec: Extract<FieldSpec, { type: 'image' }> }) {
  const value = getStringAtPath(content, spec.path);
  return (
    <div className="bk-qe-field">
      <span className="bk-qe-field-label">{spec.label}</span>
      <div className="bk-qe-image-row">
        {value ? (
          <img className="bk-qe-image-thumb" src={value} alt="" />
        ) : (
          <span className="bk-qe-image-thumb is-empty" aria-hidden />
        )}
        <AssetSourcePopover
          brandId={brandId}
          categories={['logo', 'icon', 'photo', 'application', 'mockup']}
          trigger={
            <button type="button" className="bk-qe-add bk-qe-image-btn">
              <ImagePlus size={13} aria-hidden />
              <span>{value ? 'Replace' : 'Choose image'}</span>
            </button>
          }
          onPick={(source) => {
            if (source.kind === 'asset') {
              onSet(spec.path, source.asset.url);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => onSet(spec.path, String(reader.result ?? ''));
            reader.readAsDataURL(source.file);
          }}
        />
        {value && (
          <IconButton label={`Remove ${spec.label.toLowerCase()}`} onClick={() => onSet(spec.path, '')}>
            <Trash2 size={12} aria-hidden />
          </IconButton>
        )}
      </div>
      {spec.hint && <p className="bk-qe-group-hint">{spec.hint}</p>}
    </div>
  );
}

/* ── Boolean ──────────────────────────────────────────────────────── */

function BooleanField({
  spec,
  content,
  onSet,
}: ControlProps & { spec: Extract<FieldSpec, { type: 'boolean' }> }) {
  const value = getAtPath(content, spec.path) === true;
  return (
    <div className="bk-qe-field bk-qe-boolean">
      <DsSwitch checked={value} onChange={(next) => onSet(spec.path, next)} label={spec.label} />
      {spec.hint && <p className="bk-qe-group-hint">{spec.hint}</p>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bk-qe-icon-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/* ── One field ────────────────────────────────────────────────────── */

function Group({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bk-qe-group">
      <header className="bk-qe-group-head">
        <div className="bk-qe-group-titles">
          <h3 className="bk-qe-group-title">{title}</h3>
          {hint && <p className="bk-qe-group-hint">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="bk-qe-group-body">{children}</div>
    </section>
  );
}

function Field({
  spec,
  content,
  onSet,
  selected,
  onSelect,
}: {
  spec: FieldSpec;
  content: DeliverableContent;
  onSet: (path: string, value: unknown) => void;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  if (
    spec.type === 'list' ||
    spec.type === 'stringList' ||
    spec.type === 'color' ||
    spec.type === 'image' ||
    spec.type === 'boolean'
  ) {
    return null;
  }
  const raw = getStringAtPath(content, spec.path);

  const commit = (text: string) => {
    if (spec.type === 'number' || spec.type === 'money') {
      // Keep the field usable mid-typing: an empty box or a lone "-" is
      // a state on the way to a number, not a value to write.
      if (text.trim() === '' || text.trim() === '-') {
        onSet(spec.path, 0);
        return;
      }
      const n = Number(text.replace(/[^0-9.\-]/g, ''));
      onSet(spec.path, Number.isFinite(n) ? n : 0);
      return;
    }
    onSet(spec.path, text);
  };

  const label = (
    <span className="bk-qe-field-label">
      {spec.label}
      {'suffix' in spec && spec.suffix ? (
        <span className="bk-qe-field-suffix">{spec.suffix}</span>
      ) : null}
    </span>
  );

  if (spec.type === 'select') {
    return (
      <label className={`bk-qe-field${selected ? ' is-selected' : ''}`}>
        {label}
        <select
          className="bk-qe-input"
          value={raw}
          onChange={(e) => onSet(spec.path, e.target.value)}
          onFocus={onSelect}
        >
          {spec.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (spec.type === 'textarea' || (spec.type === 'text' && spec.multiline)) {
    return (
      <label className={`bk-qe-field${selected ? ' is-selected' : ''}`}>
        {label}
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="bk-qe-input bk-qe-input--area"
          value={raw}
          rows={spec.type === 'textarea' ? (spec.rows ?? 4) : 4}
          placeholder={spec.placeholder}
          onChange={(e) => commit(e.target.value)}
          onFocus={onSelect}
        />
      </label>
    );
  }

  const numeric = spec.type === 'number' || spec.type === 'money';
  return (
    <label className={`bk-qe-field${selected ? ' is-selected' : ''}`}>
      {label}
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        className="bk-qe-input"
        type={numeric ? 'number' : 'text'}
        step={spec.type === 'number' ? (spec.step ?? 1) : spec.type === 'money' ? 0.01 : undefined}
        value={raw}
        placeholder={'placeholder' in spec ? spec.placeholder : undefined}
        onChange={(e) => commit(e.target.value)}
        onFocus={onSelect}
      />
    </label>
  );
}
