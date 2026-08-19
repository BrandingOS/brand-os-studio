/**
 * The selected page's editor.
 *
 * Compact by rule. A previous version explained the page back to the user —
 * its type, "Page 5 of 30", a sentence describing what the page is for, a
 * "FROM THE BRAND" heading, and a hint under every field. If you selected a
 * page you already know which page it is. This shows values, controls and
 * actions, and nothing else.
 *
 * The one non-control element is the brand row at the top: the values this
 * page draws from, as swatches and names, which doubles as the way into the
 * Brand panel. It earns its place because "where did that colour come from?"
 * is the question this panel is otherwise silent about.
 */
import { ArrowDown, ArrowUp, ChevronRight, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { DsInput } from '@/shared/ds';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import type { Brand } from '@/shared/types/brand';
import type { GuidelinePage } from '../../model/document';
import { getPageType, type BrandSource } from '../../model/pageLibrary';

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
  /** The merged brand — this must show what the PAGE renders, overrides and all. */
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
      {type && type.brandSources.length > 0 && (
        <button type="button" className="gl-brand-row" onClick={onOpenBrand}>
          <span className="gl-brand-row-values">
            {type.brandSources.map((source) => (
              <SourceValue key={source} source={source} brand={brand} />
            ))}
          </span>
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      <div className="gl-field">
        <label className="gl-field-label" htmlFor="gl-page-title">
          {titleIsContent ? 'Title' : 'Name'}
        </label>
        <DsInput
          id="gl-page-title"
          value={page.title ?? ''}
          placeholder={type?.name ?? 'Page'}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      {titleIsContent && (
        <div className="gl-field">
          <label className="gl-field-label" htmlFor="gl-page-subtitle">Subtitle</label>
          <DsInput
            id="gl-page-subtitle"
            value={page.subtitle ?? ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
          />
        </div>
      )}

      <div className="gl-tool-row">
        <Tool icon={ArrowUp} label="Move up" disabled={index === 0} onClick={() => onMove(-1)} />
        <Tool icon={ArrowDown} label="Move down" disabled={index === total - 1} onClick={() => onMove(1)} />
        <Tool icon={Copy} label="Duplicate" onClick={onDuplicate} />
        {/* Nothing to undo when the page has never been edited — a live button
            here would report success for doing nothing. */}
        <Tool icon={RotateCcw} label="Reset to template" disabled={!isEdited} onClick={onReset} />
        <Tool icon={Trash2} label="Remove page" danger onClick={onRemove} />
      </div>
    </div>
  );
}

function Tool({
  icon: Icon, label, onClick, disabled, danger,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`gl-tool${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon size={15} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

function SourceValue({ source, brand }: { source: BrandSource; brand: Brand }) {
  switch (source) {
    case 'colors': {
      const swatches = [brand.primaryColor, brand.secondaryColor].filter(Boolean) as string[];
      if (swatches.length === 0) return <span className="gl-brand-row-text">No colours</span>;
      return (
        <>
          {swatches.map((hex) => (
            <span key={hex} className="gl-brand-swatch" style={{ background: hex }} title={hex} />
          ))}
        </>
      );
    }
    case 'typography':
      return <span className="gl-brand-row-text">{brand.fonts?.primary || 'No typeface'}</span>;
    case 'logo': {
      const logo = pickLogoOnBackground(brand, '#ffffff');
      return logo?.url
        ? <img className="gl-brand-logo" src={logo.url} alt="" />
        : <span className="gl-brand-row-text">No logo</span>;
    }
    case 'voice':
      return <span className="gl-brand-row-text">{brand.tone || 'No tone'}</span>;
    case 'strategy':
      return <span className="gl-brand-row-text">Strategy</span>;
    default:
      return null;
  }
}
