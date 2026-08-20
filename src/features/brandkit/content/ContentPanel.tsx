import { useRef } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { fieldGroupsFor, findFieldForPath, type FieldSpec } from './fields';
import { getStringAtPath, setAtPath } from './paths';
import { invoiceTotals, formatMoney } from './compute';
import {
  isInvoice,
  nextLineItemId,
  type ContentKind,
  type DeliverableContent,
  type InvoiceContent,
} from './kinds';

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
 * is; it renders whatever `fieldGroupsFor` declares, so a new kind is a
 * declaration rather than another branch in a component.
 */

type Props = {
  kind: ContentKind;
  content: DeliverableContent;
  onChange: (next: DeliverableContent) => void;
  /** Path of the bound region selected on the artifact, if any. */
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onResetContent: () => void;
};

export function ContentPanel({
  kind,
  content,
  onChange,
  selectedPath,
  onSelect,
  onResetContent,
}: Props) {
  const groups = fieldGroupsFor(kind);
  const selected = selectedPath ? findFieldForPath(kind, selectedPath) : null;

  const set = (path: string, value: unknown) => onChange(setAtPath(content, path, value));

  return (
    <div className="bk-qe-panel">
      {selected && selectedPath && (
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
          <Field
            key={selectedPath}
            spec={{ ...selected.field, path: selectedPath } as FieldSpec}
            content={content}
            onSet={set}
          />
        </Group>
      )}

      {groups.map((group) => (
        <Group
          key={group.id}
          title={group.title}
          hint={group.hint}
          action={
            group.id === groups[0].id ? (
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
          {group.fields.map((spec) =>
            spec.type === 'list' ? (
              <LineItems
                key={spec.path}
                spec={spec}
                content={content}
                onChange={onChange}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ) : (
              <Field
                key={spec.path}
                spec={spec}
                content={content}
                onSet={set}
                selected={selectedPath === spec.path}
                onSelect={() => onSelect(spec.path)}
              />
            ),
          )}
        </Group>
      ))}

      {isInvoice(content) && <Totals content={content} />}
    </div>
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

/* ── Line items ───────────────────────────────────────────────────── */

function LineItems({
  spec,
  content,
  onChange,
  selectedPath,
  onSelect,
}: {
  spec: Extract<FieldSpec, { type: 'list' }>;
  content: DeliverableContent;
  onChange: (next: DeliverableContent) => void;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
}) {
  if (!isInvoice(content)) return null;
  const items = content.lineItems;

  const replace = (next: typeof items) =>
    onChange({ ...content, lineItems: next } as DeliverableContent);

  const add = () =>
    replace([...items, { id: nextLineItemId(items), label: '', qty: 1, unitPrice: 0 }]);

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
          key={item.id}
          className={`bk-qe-item${selectedPath?.startsWith(`${spec.path}.${index}.`) ? ' is-selected' : ''}`}
        >
          <div className="bk-qe-item-head">
            <span className="bk-qe-item-index">{String(index + 1).padStart(2, '0')}</span>
            <div className="bk-qe-item-actions">
              <IconButton
                label="Move up"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                <ArrowUp size={12} aria-hidden />
              </IconButton>
              <IconButton
                label="Move down"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              >
                <ArrowDown size={12} aria-hidden />
              </IconButton>
              <IconButton label="Remove item" onClick={() => remove(index)}>
                <Trash2 size={12} aria-hidden />
              </IconButton>
            </div>
          </div>
          <div className="bk-qe-item-fields">
            {spec.itemFields.map((itemField) => {
              const path = `${spec.path}.${index}.${itemField.path}`;
              return (
                <Field
                  key={path}
                  spec={{ ...itemField, path } as FieldSpec}
                  content={content}
                  onSet={(p, v) => onChange(setAtPath(content, p, v))}
                  selected={selectedPath === path}
                  onSelect={() => onSelect(path)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="bk-qe-add" onClick={add}>
        <Plus size={13} aria-hidden />
        <span>Add item</span>
      </button>
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
  if (spec.type === 'list') return null;
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

  if (spec.type === 'text' && spec.multiline) {
    return (
      <label className={`bk-qe-field${selected ? ' is-selected' : ''}`}>
        {label}
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="bk-qe-input bk-qe-input--area"
          value={raw}
          rows={4}
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
