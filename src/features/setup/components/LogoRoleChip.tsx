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
import { TILE_ID_BY_ROLE, TILE_LABEL } from '../data/logoBoard';

/** Tile-id ↔ role, the same map SetupBoard's LOGO_ROLES is built from (kept here to avoid a circular import). */
const ROLES = ADDABLE_LOGO_ROLES.map((d) => ({ id: TILE_ID_BY_ROLE[d.role] ?? d.slot, label: TILE_LABEL[d.role] ?? d.label, variant: d.tone, role: d.role, hint: d.hint }));

interface Props {
  label: string;
  /** The tile's current role id (`primary`, `dark`, `mark`, …). */
  currentId: string;
  onPick(roleId: string): void;
  /** Absent when the surface cannot persist a name. */
  onRename?(label: string): void;
}

export function LogoRoleChip({ label, currentId, onPick, onRename }: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(label);
  const commitRename = () => {
    const next = draft.trim();
    setRenaming(false);
    if (next && next !== label) onRename?.(next);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRenaming(false); }}>
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
        {onRename && (
          <div className="logo-role-rename" data-logo-role-rename>
            {renaming ? (
              <>
                <input
                  className="logo-role-rename-input"
                  autoFocus
                  value={draft}
                  maxLength={24}
                  placeholder="Variant name"
                  data-logo-role-rename-input
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                />
                <button type="button" className="logo-role-rename-btn is-primary" onClick={commitRename}>Save</button>
                <button type="button" className="logo-role-rename-btn" onClick={() => setRenaming(false)}>Cancel</button>
              </>
            ) : (
              <button
                type="button"
                className="logo-role-rename-btn is-link"
                data-logo-role-rename-open
                onClick={() => {
                  setDraft(label);
                  setRenaming(true);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                Rename “{label}”
              </button>
            )}
          </div>
        )}
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
