import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate as renderTemplateDesign } from '../renderers';
import type { KitSectionKey } from './BrandKitSidebar';

export type EditorTarget = {
  sectionKey: KitSectionKey;
  label: string;
  /** The card's primary cover — also covers[0]. Kept as a separate
   *  field so the right-click "Download" path doesn't need to know
   *  about the picker. */
  cover: string;
  /** All cover options shown in the editor's image picker. */
  covers: string[];
  /** Real template variants pulled from the legacy brandkit library
   *  via legacy-mapping.ts. Drives the drilldown grid; empty when
   *  the card has no legacy counterpart. */
  templates?: BrandKitTemplate[];
  /** The single template the user picked from the drilldown — set
   *  when the editor opens from a variant tile. Lets the editor
   *  show the legacy renderer's preview alongside the brand
   *  controls. Absent when the editor opens from a card directly
   *  (right-click Edit) — the editor falls back to the cover
   *  image preview in that case. */
  template?: BrandKitTemplate;
};

type Props = {
  brand: MockBrand;
  /** Canonical Brand object — when provided alongside
   *  `target.template`, the preview pane renders the legacy
   *  template's live design (BusinessCardRenderer / etc.) instead
   *  of the static cover image. The selected color, when changed
   *  via the swatches, overrides the brand's primary so the
   *  preview reflects the recolor live. */
  sourceBrand?: Brand;
  target: EditorTarget | null;
  onClose: () => void;
  onSave: (target: EditorTarget) => void;
  onDownload: (target: EditorTarget) => void;
};

/**
 * Full-screen-ish (90vw × 90vh) card editor. Left half shows the card
 * cover at large size; right half is a scrollable edit rail with the
 * brand's colors, logos, and fonts. Selection state is local — the
 * intent is to wire each control to a real renderer later, when the
 * card covers are generated per-brand instead of being stock photos.
 *
 * Closes on Escape, backdrop click, or the Cancel button. Renders
 * through a portal so the dialog escapes the workspace's stacking
 * context, with the workspace's data-theme mirrored onto the dialog
 * so light/dark tokens still apply.
 */
export function BrandKitCardEditor({
  brand,
  sourceBrand,
  target,
  onClose,
  onSave,
  onDownload,
}: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [selectedFontId, setSelectedFontId] = useState<string | null>(null);

  // Reset selection whenever a new card opens so state from the
  // previous card doesn't bleed into this one.
  useEffect(() => {
    if (!target) return;
    setSelectedCover(target.cover);
    setSelectedColor(brand.colors.core[0]?.hex ?? null);
    setSelectedLogoId(brand.logos[0]?.id ?? null);
    setSelectedFontId(brand.fonts[0]?.id ?? null);
  }, [target, brand]);

  useEffect(() => {
    if (!target) return;
    const ws = document.querySelector('[data-cosmos="workspace"]');
    setTheme(ws?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [target, onClose]);

  // Brand projection used by the legacy renderer — the picked
  // swatch overrides the brand's primary so recolor previews live.
  const previewBrand = useMemo<Brand | null>(() => {
    if (!sourceBrand) return null;
    if (!selectedColor) return sourceBrand;
    return { ...sourceBrand, primaryColor: selectedColor };
  }, [sourceBrand, selectedColor]);

  if (!target) return null;

  const allColors = [...brand.colors.core, ...brand.colors.accent, ...brand.colors.grey];
  const livePreview = previewBrand && target.template
    ? renderTemplateDesign(target.template, previewBrand)
    : null;

  return createPortal(
    <div
      className="bk-editor-backdrop"
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${target.label}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bk-editor" onMouseDown={(e) => e.stopPropagation()}>
        {livePreview ? (
          <section
            className="bk-editor-preview-card bk-editor-preview-card--live"
            aria-label={`${target.label} preview`}
          >
            <div className="bk-editor-preview-frame">{livePreview}</div>
          </section>
        ) : (
          <section
            className="bk-editor-preview-card"
            aria-label={`${target.label} preview`}
            style={{ backgroundImage: `url(${selectedCover ?? target.cover})` }}
          />
        )}

        <aside className="bk-editor-rail-card" aria-label="Edit options">
          <header className="bk-editor-rail-head">
            <div className="bk-editor-rail-titles">
              <span className="bk-editor-eyebrow">{sectionLabel(target.sectionKey)}</span>
              <h2 className="bk-editor-title">{target.label}</h2>
            </div>
            <button
              type="button"
              className="bk-editor-close"
              onClick={onClose}
              aria-label="Close editor"
            >
              <CloseIcon />
            </button>
          </header>
          <div className="bk-editor-rail-body">
            <RailGroup title="Image" hint="Pick the cover for this card.">
              <div className="bk-editor-covers">
                {target.covers.map((src) => {
                  const isSelected = selectedCover === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      className={`bk-editor-cover${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedCover(src)}
                      aria-pressed={isSelected}
                      aria-label="Select image"
                    >
                      <span
                        className="bk-editor-cover-thumb"
                        style={{ backgroundImage: `url(${src})` }}
                      />
                    </button>
                  );
                })}
              </div>
            </RailGroup>

            <RailGroup title="Colors" hint="Tap a swatch to recolor the artwork.">
              <div className="bk-editor-swatches">
                {allColors.map((c) => (
                  <button
                    key={`${c.hex}-${c.name}`}
                    type="button"
                    className={`bk-editor-swatch${selectedColor === c.hex ? ' is-selected' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setSelectedColor(c.hex)}
                    title={`${c.name} — ${c.hex.toUpperCase()}`}
                    aria-pressed={selectedColor === c.hex}
                    aria-label={`${c.name} ${c.hex}`}
                  />
                ))}
              </div>
            </RailGroup>

            <RailGroup title="Logos" hint="Choose a mark to drop on the artwork.">
              <div className="bk-editor-logos">
                {brand.logos.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    className={`bk-editor-logo${selectedLogoId === logo.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedLogoId(logo.id)}
                    aria-pressed={selectedLogoId === logo.id}
                    aria-label={`${logo.label} logo`}
                  >
                    <span
                      className="bk-editor-logo-thumb"
                      dangerouslySetInnerHTML={{ __html: logo.svg }}
                      aria-hidden
                    />
                    <span className="bk-editor-logo-label">{logo.label}</span>
                  </button>
                ))}
              </div>
            </RailGroup>

            <RailGroup title="Typography" hint="Pick a face for the body copy.">
              <div className="bk-editor-fonts">
                {brand.fonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`bk-editor-font${selectedFontId === font.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedFontId(font.id)}
                    aria-pressed={selectedFontId === font.id}
                  >
                    <span className="bk-editor-font-role">{font.role}</span>
                    <span
                      className="bk-editor-font-family"
                      style={{ fontFamily: `${font.family}, ${font.fallback ?? 'sans-serif'}` }}
                    >
                      {font.family}
                    </span>
                    <span className="bk-editor-font-weights">{font.weights}</span>
                  </button>
                ))}
              </div>
            </RailGroup>
          </div>
          <footer className="bk-editor-rail-footer">
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--secondary"
              onClick={() => onDownload(target)}
            >
              Download
            </button>
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--primary"
              onClick={() => onSave(target)}
            >
              Save
            </button>
          </footer>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function RailGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bk-editor-group">
      <header className="bk-editor-group-head">
        <h3 className="bk-editor-group-title">{title}</h3>
        {hint && <p className="bk-editor-group-hint">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
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
