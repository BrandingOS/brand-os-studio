/**
 * The role label on a Setup logo tile — "PRIMARY", "ON DARK", "ICON" — as the
 * control that CHANGES the role.
 *
 * It used to be a decoration with `pointer-events: none`, so a click on it fell
 * through to the tile and opened the zoom preview. The onboarding review's
 * chip asks one question — which kind of logo is this? — and opens the answer:
 * the variant cards. This is the same interaction, in Setup, on Setup's own
 * option styling (`logo-variant-option`, the "Add logo variant" cards).
 */
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ADDABLE_LOGO_ROLES } from '@/shared/brand/logoRoles';
import { VariantMark } from './AddLogoVariantModal';
import { TILE_ID_BY_ROLE } from '../data/logoBoard';

/** Tile-id ↔ role, the same map SetupBoard's LOGO_ROLES is built from (kept here to avoid a circular import). */
const ROLES = ADDABLE_LOGO_ROLES.map((d) => ({ id: TILE_ID_BY_ROLE[d.role] ?? d.slot, label: d.label, variant: d.tone, role: d.role, hint: d.hint }));

interface Props {
  label: string;
  /** The tile's current role id (`primary`, `dark`, `mark`, …). */
  currentId: string;
  onPick(roleId: string): void;
}

export function LogoRoleChip({ label, currentId, onPick }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`logo-tile-name is-picker${open ? ' is-open' : ''}`}
          data-logo-role-chip
          title="Change which variant this is"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9.5 12 15.5 18 9.5" />
          </svg>
        </button>
      </PopoverTrigger>
      {/* Portaled: `data-workspace` on the content is what lets the
          `[data-workspace] .logo-variant-option` rules reach it. */}
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        data-workspace=""
        className="logo-role-pop"
        data-logo-role-picker
        onClick={(e) => e.stopPropagation()}
      >
        <div className="logo-role-pop-title">Which variant is this?</div>
        <div className="logo-variant-picker-grid is-compact">
          {ROLES.map((r) => {
            const current = r.id === currentId;
            return (
              <button
                key={r.id}
                type="button"
                className={`logo-variant-option${current ? ' is-current' : ''}`}
                aria-pressed={current}
                data-role-option={r.id}
                onClick={() => {
                  setOpen(false);
                  if (!current) onPick(r.id);
                }}
              >
                <span className="logo-variant-swatch" data-tone={r.variant} aria-hidden="true">
                  <VariantMark role={r.role} />
                </span>
                <span className="logo-variant-text">
                  <span className="logo-variant-label">{r.label}</span>
                  <span className="logo-variant-hint">{current ? 'Current' : r.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
