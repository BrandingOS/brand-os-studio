/**
 * The selected page's editor.
 *
 * Two halves, separated, in the order the user reasons about them:
 *
 *   BRAND SOURCE — what this page is drawing from. A Colours page shows the
 *   palette it is rendering; a Typography page shows the typefaces. This is
 *   read-only here on purpose: it answers "where did that come from?" and hands
 *   off to the Brand panel, which is the one place brand values are edited and
 *   the one place the guideline-versus-brand distinction is enforced.
 *
 *   THIS PAGE — settings that belong to this instance and nothing else.
 *
 * Everything offered is real. There is no background picker or layout selector,
 * because at MVP each page type has exactly one design and a control that
 * pretends otherwise is the kind of thing this rebuild removed.
 */
import { ArrowDown, ArrowUp, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { DsButton, DsInput } from '@/shared/ds';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import type { Brand } from '@/shared/types/brand';
import type { GuidelinePage } from '../../model/document';
import { BRAND_SOURCE_LABEL, getPageType, type BrandSource } from '../../model/pageLibrary';

export function PagePanel({
  page,
  brand,
  index,
  total,
  isEdited,
  onChange,
  onMove,
  onDuplicate,
  onReset,
  onRemove,
  onOpenBrand,
}: {
  page: GuidelinePage;
  /** The merged brand — this block must show what the PAGE renders, overrides and all. */
  brand: Brand;
  index: number;
  total: number;
  isEdited: boolean;
  onChange: (patch: { title?: string; subtitle?: string }) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onReset: () => void;
  onRemove: () => void;
  onOpenBrand: () => void;
}) {
  const type = getPageType(page.type);
  const titleIsContent = type?.titleIsContent ?? false;

  return (
    <div className="gl-panel-body">
      <div className="gl-page-meta">
        <span className="gl-page-meta-type">{type?.name ?? page.type}</span>
        <span className="gl-page-meta-pos">Page {index + 1} of {total}</span>
      </div>
      {type?.description && <p className="gl-panel-note">{type.description}</p>}

      {type && type.brandSources.length > 0 && (
        <section className="gl-field-group">
          <h3 className="gl-field-group-title">From the brand</h3>
          {type.brandSources.map((source) => (
            <BrandSourceRow key={source} source={source} brand={brand} />
          ))}
          <DsButton tone="secondary" size="sm" onClick={onOpenBrand}>
            Edit brand values
          </DsButton>
        </section>
      )}

      <hr className="gl-panel-rule" />

      <section className="gl-field-group">
        <h3 className="gl-field-group-title">This page</h3>

        <div className="gl-field">
          <label className="gl-field-label" htmlFor="gl-page-title">
            {titleIsContent ? 'Title' : 'Name in outline'}
          </label>
          <DsInput
            id="gl-page-title"
            value={page.title ?? ''}
            placeholder={type?.name ?? 'Page'}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          {!titleIsContent && (
            <p className="gl-field-hint">
              Names the page in the outline. The page’s own headings are edited on
              the page itself.
            </p>
          )}
        </div>

        {titleIsContent && (
          <div className="gl-field">
            <label className="gl-field-label" htmlFor="gl-page-subtitle">Subtitle</label>
            <DsInput
              id="gl-page-subtitle"
              value={page.subtitle ?? ''}
              placeholder="Optional"
              onChange={(e) => onChange({ subtitle: e.target.value })}
            />
          </div>
        )}

        <p className="gl-field-hint">
          Click any text or image on the page to edit it directly. Changes save
          as you type.
        </p>
      </section>

      <section className="gl-field-group">
        <h3 className="gl-field-group-title">Arrange</h3>
        <div className="gl-action-grid">
          <PageAction icon={ArrowUp} label="Move up" disabled={index === 0} onClick={() => onMove(-1)} />
          <PageAction icon={ArrowDown} label="Move down" disabled={index === total - 1} onClick={() => onMove(1)} />
          <PageAction icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <PageAction
            icon={RotateCcw}
            label="Reset"
            // Nothing to undo when the page has never been edited — a live
            // button here would report success for doing nothing.
            disabled={!isEdited}
            onClick={onReset}
          />
        </div>
        <button type="button" className="gl-danger-btn" onClick={onRemove}>
          <Trash2 size={14} strokeWidth={1.8} aria-hidden />
          Remove page
        </button>
      </section>
    </div>
  );
}

function PageAction({
  icon: Icon, label, onClick, disabled,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="gl-action" onClick={onClick} disabled={disabled}>
      <Icon size={15} strokeWidth={1.8} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

function BrandSourceRow({ source, brand }: { source: BrandSource; brand: Brand }) {
  return (
    <div className="gl-source">
      <span className="gl-source-label">{BRAND_SOURCE_LABEL[source]}</span>
      <div className="gl-source-value">{renderSource(source, brand)}</div>
    </div>
  );
}

function renderSource(source: BrandSource, brand: Brand) {
  switch (source) {
    case 'colors': {
      const swatches = [brand.primaryColor, brand.secondaryColor].filter(Boolean) as string[];
      return (
        <div className="gl-source-swatches">
          {swatches.map((hex) => (
            <span key={hex} className="gl-source-swatch" style={{ background: hex }} title={hex} />
          ))}
          <span className="gl-source-text">{swatches.join(' · ') || 'Not set'}</span>
        </div>
      );
    }
    case 'typography':
      return (
        <span className="gl-source-text">
          {[brand.fonts?.primary, brand.fonts?.secondary].filter(Boolean).join(' · ') || 'Not set'}
        </span>
      );
    case 'logo': {
      const logo = pickLogoOnBackground(brand, '#ffffff');
      return logo?.url
        ? <img className="gl-source-logo" src={logo.url} alt="" />
        : <span className="gl-source-text">No logo yet</span>;
    }
    case 'voice':
      return <span className="gl-source-text">{brand.tone || 'Not set'}</span>;
    case 'strategy':
      return (
        <span className="gl-source-text">
          {brand.guidelines?.strategy?.mission || brand.strategy || 'Not set'}
        </span>
      );
    default:
      return null;
  }
}
