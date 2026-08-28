/**
 * "Add logo variant" — the role is chosen BEFORE the file.
 *
 * The old affordance was a bare `+` tile that opened a file picker, and
 * whatever landed became a tile called "Logo" holding no role at all. So the
 * user could not add a wordmark; they could add an untitled logo and then go
 * looking for the right-click menu that renames it. Nothing said the roles
 * existed, and an upload that skipped that second step was unpersistable —
 * a tile with no role has no slot to be written to.
 *
 * Asking first fixes both halves: the file arrives already knowing what it is,
 * and the list of roles is the thing the user reads rather than something they
 * have to discover.
 *
 * The roles come from `shared/brand/logoRoles`, the same list the onboarding
 * review offers, so a variant is called one thing across the product. A role
 * another tile already holds is shown as taken and adds to it as a replacement
 * rather than silently creating a second.
 */
import { DsButton, DsModal } from '@/shared/ds';
import { ADDABLE_LOGO_ROLES, type LogoRoleDef } from '@/shared/brand/logoRoles';
import type { LogoRole } from '@/shared/types/brandAssets';

type Props = {
  open: boolean;
  /** Roles the board already holds — shown as "replaces". */
  taken: ReadonlySet<LogoRole>;
  onClose(): void;
  onPick(def: LogoRoleDef): void;
};

export function AddLogoVariantModal({ open, taken, onClose, onPick }: Props) {
  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Add logo variant"
      actions={
        <DsButton tone="secondary" onClick={onClose}>
          Cancel
        </DsButton>
      }
    >
      <p style={{ margin: '-8px 0 4px', fontSize: 13, color: 'var(--ds-text-muted)' }}>
        Which variant is this? You’ll pick the file next.
      </p>
      <div className="logo-variant-picker-grid">
        {ADDABLE_LOGO_ROLES.map((def) => {
          const held = taken.has(def.role);
          return (
            <button
              key={def.role}
              type="button"
              className={`logo-variant-option${held ? ' is-taken' : ''}`}
              onClick={() => onPick(def)}
            >
              <span
                className="logo-variant-swatch"
                data-tone={def.tone}
                aria-hidden="true"
              >
                <VariantMark role={def.role} />
              </span>
              <span className="logo-variant-text">
                <span className="logo-variant-label">{def.label}</span>
                <span className="logo-variant-hint">{held ? 'Replaces the current one' : def.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </DsModal>
  );
}

/**
 * A tiny diagram of what each variant IS.
 *
 * Drawn rather than described because the difference between a wordmark and a
 * horizontal lockup is a shape, and a shape is faster to recognise than a
 * sentence about one.
 */
export function VariantMark({ role }: { role: LogoRole }) {
  const ink = 'currentColor';
  switch (role) {
    case 'iconmark':
      return (
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden>
          <rect x="14" y="4" width="12" height="12" rx="3" fill={ink} />
        </svg>
      );
    case 'wordmark':
      return (
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden>
          <rect x="6" y="9" width="28" height="5" rx="2.5" fill={ink} />
        </svg>
      );
    case 'stacked':
      return (
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden>
          <rect x="16" y="3" width="8" height="8" rx="2" fill={ink} />
          <rect x="11" y="14" width="18" height="4" rx="2" fill={ink} />
        </svg>
      );
    case 'horizontal':
      return (
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden>
          <rect x="3" y="8" width="8" height="8" rx="2" fill={ink} />
          <rect x="14" y="10" width="23" height="4" rx="2" fill={ink} />
        </svg>
      );
    default:
      // Primary, Secondary and On dark are all "the logo" — a mark beside the
      // name. What separates them is which one, and the ground it sits on.
      return (
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden>
          <rect x="5" y="7" width="10" height="10" rx="2.5" fill={ink} />
          <rect x="18" y="9" width="17" height="6" rx="3" fill={ink} />
        </svg>
      );
  }
}

export default AddLogoVariantModal;
