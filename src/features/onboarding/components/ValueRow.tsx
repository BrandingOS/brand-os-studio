/**
 * The atomic proposal, and the section shell that holds a group of them.
 *
 * The state lives on the VALUE, never the section. A section that dashed as a
 * whole could not show three settled values beside two open ones — which is
 * what an actual review looks like — and a page of dashed rectangles reads as a
 * wireframe rather than a brand.
 *
 * Three channels carry the state, so it never depends on perceiving a line
 * weight: the rule under the value, the form of the accept control, and
 * `aria-pressed` with a label that names the value.
 */
import { useState } from 'react';
import { DsButton, DsTextArea } from '@/shared/ds';

export interface ValueRowProps {
  /** Short label — the user's word for it, not the schema's. */
  label: string;
  /** Where the belief came from: "your description", "logo.svg". */
  origin: string;
  decided: boolean;
  /** Rendered value. A specimen, a swatch row, a sentence — not an input. */
  children: React.ReactNode;
  onAccept(): void;
  /** Omitted for values with no sensible inline edit (e.g. a logo placement). */
  onEdit?(next: string): void;
  /** Seed for the inline editor. */
  editValue?: string;
  busy?: boolean;
}

export function ValueRow({
  label, origin, decided, children, onAccept, onEdit, editValue, busy,
}: ValueRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editValue ?? '');

  // Editing happens in place. A modal would move the page and turn a small
  // correction into an event.
  if (editing && onEdit) {
    return (
      <div className="onb-v" data-decided={decided}>
        <div className="onb-v-b">
          <div className="onb-v-k">{label}</div>
          <div className="onb-edit-box">
            <DsTextArea
              value={draft}
              autoFocus
              rows={3}
              aria-label={`Edit ${label.toLowerCase()}`}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="onb-edit-a">
              <DsButton
                size="sm"
                onClick={() => { onEdit(draft.trim()); setEditing(false); }}
                disabled={!draft.trim() || busy}
              >
                Save
              </DsButton>
              <DsButton size="sm" tone="tertiary" onClick={() => setEditing(false)}>
                Cancel
              </DsButton>
              <span className="onb-edit-note">Saving confirms this one.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onb-v" data-decided={decided}>
      <div className="onb-v-b">
        <div className="onb-v-k">{label}</div>
        <div className="onb-v-t">{children}</div>
        {/* Secondary to the value by size, colour and position — it explains,
            it never competes. */}
        <div className="onb-v-o">{decided ? 'Confirmed by you' : `From ${origin}`}</div>
      </div>
      <div className="onb-v-a">
        {onEdit && !decided && (
          <button
            type="button"
            className="onb-edit"
            onClick={() => { setDraft(editValue ?? ''); setEditing(true); }}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="onb-accept"
          aria-pressed={decided}
          disabled={decided || busy}
          onClick={onAccept}
        >
          <span aria-hidden="true">✓</span>
          <span className="sr-only">
            {decided ? `Confirmed — ${label}` : `Accept ${label.toLowerCase()}`}
          </span>
          <span aria-hidden="true">{decided ? 'Confirmed' : 'Accept'}</span>
        </button>
      </div>
    </div>
  );
}

export interface SectionProps {
  title: string;
  /** Total values in this section. */
  total: number;
  /** How many the user has decided. */
  decided: number;
  /** Omitted for sections with nothing to decide (Material). */
  onAcceptAll?(): void;
  /** Replaces the count when the section carries no decisions. */
  meta?: string;
  children: React.ReactNode;
  busy?: boolean;
}

export function Section({ title, total, decided, onAcceptAll, meta, children, busy }: SectionProps) {
  return (
    <section className="onb-sec">
      <header className="onb-sec-h">
        <h2 className="onb-sec-t">{title}</h2>
        <div className="onb-sec-m">
          {/*
            CONTEXTUAL only. This says how much of THIS section is settled so a
            user can see at a glance where they are in it. There is deliberately
            no global equivalent, no bar and no percentage anywhere in the flow —
            leaving things suggested is a legitimate outcome, and a completion
            meter would turn it into a debt.
          */}
          <span className="onb-count">{meta ?? `${decided} of ${total} decided`}</span>
          {onAcceptAll && (
            <button
              type="button"
              className="onb-bulk"
              onClick={onAcceptAll}
              disabled={decided === total || busy}
            >
              Looks right
            </button>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
