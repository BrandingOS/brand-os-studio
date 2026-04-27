import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KitSectionKey } from './BrandKitSidebar';

export type VariantsTarget = {
  sectionKey: KitSectionKey;
  label: string;
  /** The cover currently associated with this card. The variants modal
   *  repeats this cover across every tile — a stand-in for per-variant
   *  renders that will replace the placeholder later. */
  cover: string;
  /** All cover options for the underlying card, forwarded into the
   *  editor when a variant is picked. */
  covers: string[];
};

type Props = {
  target: VariantsTarget | null;
  /** Number of variant tiles to render in the scroller. Defaults to 60
   *  — well past one viewport, so vertical scroll is the natural way to
   *  get to the lower variants. */
  count?: number;
  /** When another modal sits above this one (e.g. the card editor),
   *  set paused=true so this modal's Escape-to-close handler doesn't
   *  fire alongside the upper modal's. Both modals attach their own
   *  window keydown listeners; without pausing, one Escape collapses
   *  the whole stack instead of just the top layer. */
  paused?: boolean;
  onClose: () => void;
  onPickVariant: () => void;
};

/**
 * Variants modal — full-width (92vw × 90vh) panel sitting between the
 * Brand Kit grid and the per-card editor. Opens on a card click; renders
 * a horizontal rail of tiles, each showing the same cover as a stand-in
 * for the eventual per-variant render. Picking a tile defers to the
 * caller, which opens BrandKitCardEditor on top.
 *
 * Closes on Escape, backdrop click, or the close button. Renders through
 * a portal so it escapes the workspace's stacking context.
 */
export function BrandKitVariantsModal({
  target,
  count = 60,
  paused = false,
  onClose,
  onPickVariant,
}: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme + body-scroll lock — runs whenever the modal is open,
  // independently of `paused`.
  useEffect(() => {
    if (!target) return;
    const ws = document.querySelector('[data-cosmos="workspace"]');
    setTheme(ws?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [target]);

  // Escape-to-close — only attached when this modal is the topmost
  // layer. When `paused` is true (an upper modal is open), the upper
  // modal owns Escape so it can close itself without taking us down too.
  useEffect(() => {
    if (!target || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [target, paused, onClose]);

  if (!target) return null;

  return createPortal(
    <div
      className="bk-variants-backdrop"
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-label={`${target.label} variants`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bk-variants" onMouseDown={(e) => e.stopPropagation()}>
        <header className="bk-variants-head">
          <div className="bk-variants-titles">
            <span className="bk-variants-eyebrow">{sectionLabel(target.sectionKey)}</span>
            <h2 className="bk-variants-title">{target.label}</h2>
            <p className="bk-variants-subtitle">
              Pick a variant to open the editor.
            </p>
          </div>
          <button
            type="button"
            className="bk-variants-close"
            onClick={onClose}
            aria-label="Close variants"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="bk-variants-scroller">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className="bk-variant-tile"
              style={{ backgroundImage: `url(${target.cover})` }}
              onClick={onPickVariant}
              aria-label={`${target.label} variant ${i + 1}`}
            >
              <span className="bk-variant-tile-index">{String(i + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function sectionLabel(key: KitSectionKey): string {
  const map: Record<KitSectionKey, string> = {
    stationery: 'Stationery',
    social: 'Social Media',
    web: 'Web',
    mockups: 'Mockups',
    'brand-guides': 'Brand Guides',
    presentations: 'Presentations',
    animations: 'Animations',
    'qr-code': 'QR Code',
  };
  return map[key];
}
