import type { ReactNode } from 'react';
import '../settings.css';

/**
 * A titled block with a description and a body of rows.
 *
 * Feature-local on purpose (decision ladder rung F). `.ws-card` is a
 * navigation LINK card built for a grid — thumb, eyebrow, title, sub — and the
 * DS has no form-section primitive. One page needing this shape is not a reason
 * to put a product concept in `shared/ds`; if a second surface ever wants the
 * same thing for the same reason, it gets promoted then.
 */
export function SettingsSection({
  title,
  description,
  action,
  danger,
  children,
}: {
  title: string;
  description?: string;
  /** Optional control aligned to the title, e.g. an Edit button. */
  action?: ReactNode;
  /** Destructive framing — the Danger Zone is the only caller. */
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`settings-section${danger ? ' is-danger' : ''}`}>
      <div className="settings-section-head">
        <h2 className="settings-section-title">{title}</h2>
        {action}
      </div>
      {description && <p className="settings-section-desc">{description}</p>}
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

/**
 * One labelled setting: label + optional hint on the left, its control on the
 * right. `stacked` puts the control on its own line for anything wider than a
 * button — a text field, or the two-up interface picker.
 */
export function SettingsRow({
  label,
  hint,
  stacked,
  children,
}: {
  label?: string;
  hint?: string;
  stacked?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`settings-row${stacked ? ' is-stacked' : ''}`}>
      {(label || hint) && (
        <div>
          {label && <div className="settings-row-label">{label}</div>}
          {hint && <p className="settings-row-hint">{hint}</p>}
        </div>
      )}
      {children && <div className="settings-row-control">{children}</div>}
    </div>
  );
}
