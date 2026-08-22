/**
 * Choose the card's cover: a logo, and the colour it sits on.
 *
 * The card decides both of these for itself by measuring the artwork, and it is
 * right most of the time. When it is not — a primary-colour mark on the
 * primary-colour ground, which the fallback in `brandCardFace` will pick when
 * no pairing reads — the two halves have to be fixable TOGETHER. Choosing the
 * logo was already possible and never helped on its own: whichever variant you
 * forced, the ground moved to suit it.
 *
 * So the whole design of this dialog is that you see the answer while you make
 * it. The preview is not a courtesy; it is the feature. Every logo tile is
 * drawn on the ground currently selected, so "which of these can I actually
 * see" is answered by looking rather than by trying one and closing the dialog.
 *
 * The preview is rendered by `brandCardFace` — the same function the dashboard
 * card calls — over a draft of the card. A preview that computed its own
 * appearance would be a second opinion about the thing it claims to preview,
 * and would drift.
 */
import { useMemo, useState } from 'react';
import { DsButton, DsModal } from '@/shared/ds';
import {
  brandCardGrounds,
  brandCardLabel,
  useBrandCardFace,
  type CardGroundOption,
} from '@/shared/brand/workspaceCard';
import { FACE_PRIORITY, variantsInPriorityOrder } from '@/shared/brand/logoOnBackground';
import { logoRoleLabel } from '@/shared/brand/logoRoles';
import type { Brand } from '@/shared/types/brand';
import './cardCoverModal.css';

/** What the dialog hands back. `undefined` in either half means automatic. */
export interface CoverChoice {
  logoRole?: string;
  coverBackground?: string;
}

const AUTOMATIC = '__auto__';

export function CardCoverModal({
  brand,
  onSave,
  onClose,
}: {
  brand: Brand;
  onSave: (choice: CoverChoice) => void | Promise<void>;
  onClose: () => void;
}) {
  const [role, setRole] = useState<string>(brand.workspaceCard?.logoRole ?? AUTOMATIC);
  const [ground, setGround] = useState<string>(brand.workspaceCard?.coverBackground ?? AUTOMATIC);
  const [saving, setSaving] = useState(false);

  const variants = useMemo(() => variantsInPriorityOrder(brand, FACE_PRIORITY), [brand]);
  const grounds = useMemo(() => brandCardGrounds(brand), [brand]);

  const choice: CoverChoice = useMemo(
    () => ({
      logoRole: role === AUTOMATIC ? undefined : role,
      coverBackground: ground === AUTOMATIC ? undefined : ground,
    }),
    [role, ground],
  );

  // The draft card, run through the real decision. What this returns is exactly
  // what the dashboard will draw the moment Save lands.
  const draft = useMemo(
    () => ({ ...brand, workspaceCard: { ...brand.workspaceCard, ...choice } }) as Brand,
    [brand, choice],
  );
  const face = useBrandCardFace(draft);

  // Logo tiles are drawn on the ground that is actually selected, so a variant
  // that cannot be seen on it looks exactly as invisible here as it would on
  // the dashboard. That is the point of the dialog.
  const tileGround = face.background;

  const commit = async () => {
    setSaving(true);
    try {
      await onSave(choice);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DsModal
      open
      onClose={onClose}
      title="Change cover"
      eyebrow={brandCardLabel(brand)}
      actions={
        <>
          <DsButton tone="tertiary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton onClick={() => void commit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </DsButton>
        </>
      }
    >
      <div className="ccm">
        <div
          className="ccm-preview"
          style={{ background: face.background, color: face.color }}
          aria-label="Cover preview"
        >
          {face.logoUrl ? (
            <img className="ccm-preview-logo" src={face.logoUrl} alt="" />
          ) : (
            <span className="ccm-preview-letter">{face.letter}</span>
          )}
        </div>

        <section className="ccm-section">
          <h3 className="ccm-heading">Logo</h3>
          <div className="ccm-tiles" role="radiogroup" aria-label="Logo">
            <LogoChoice
              label="Automatic"
              selected={role === AUTOMATIC}
              ground={tileGround}
              onSelect={() => setRole(AUTOMATIC)}
            />
            {variants.map((variant) => (
              <LogoChoice
                key={variant.role}
                label={logoRoleLabel(variant.role)}
                url={variant.resolved.url}
                selected={role === variant.role}
                ground={tileGround}
                onSelect={() => setRole(variant.role)}
              />
            ))}
          </div>
          {variants.length === 0 && (
            <p className="ccm-note">
              This brand has no logo yet, so the card shows its initial.
            </p>
          )}
        </section>

        <section className="ccm-section">
          <h3 className="ccm-heading">Background</h3>
          <div className="ccm-swatches" role="radiogroup" aria-label="Background">
            <GroundChoice
              option={{ hex: '', name: 'Automatic' }}
              selected={ground === AUTOMATIC}
              onSelect={() => setGround(AUTOMATIC)}
            />
            {grounds.map((option) => (
              <GroundChoice
                key={option.hex}
                option={option}
                selected={ground.toLowerCase() === option.hex.toLowerCase()}
                onSelect={() => setGround(option.hex)}
              />
            ))}
          </div>
        </section>
      </div>
    </DsModal>
  );
}

function LogoChoice({
  label,
  url,
  ground,
  selected,
  onSelect,
}: {
  label: string;
  url?: string;
  ground: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      className={selected ? 'ccm-tile is-selected' : 'ccm-tile'}
      onClick={onSelect}
    >
      <span className="ccm-tile-stage" style={{ background: ground }}>
        {url ? (
          <img src={url} alt="" className="ccm-tile-logo" />
        ) : (
          <span className="ccm-tile-auto" aria-hidden="true">
            Auto
          </span>
        )}
      </span>
      <span className="ccm-tile-label">{label}</span>
    </button>
  );
}

function GroundChoice({
  option,
  selected,
  onSelect,
}: {
  option: CardGroundOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      // The name alone is ambiguous between two neutrals; the value is what
      // tells a screen reader which swatch this is.
      aria-label={option.hex ? `${option.name} ${option.hex}` : option.name}
      title={option.hex ? `${option.name} · ${option.hex}` : option.name}
      className={selected ? 'ccm-swatch is-selected' : 'ccm-swatch'}
      onClick={onSelect}
    >
      <span
        className={option.hex ? 'ccm-swatch-chip' : 'ccm-swatch-chip ccm-swatch-chip--auto'}
        style={option.hex ? { background: option.hex } : undefined}
      />
      <span className="ccm-swatch-label">{option.name}</span>
    </button>
  );
}
