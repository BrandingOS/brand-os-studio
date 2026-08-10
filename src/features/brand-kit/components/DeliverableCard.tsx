import { useMemo } from 'react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { useKitStore, statusOf } from '../kit/kitStore';
import { candidateItems, primaryItem, approvedItems } from '../kit/types';
import type { DeliverableDef } from '../kit/registry';
import { renderKitPreview, templateForVariant } from '../kit/preview';

/**
 * State-driven card for one generatable deliverable. Replaces the
 * stock-cover card for the six deliverable sections: nothing pretends
 * to exist until the user generates and approves it.
 *
 *   not-created → quiet empty tile with a Generate affordance + a
 *                 multi-select checkbox
 *   generating  → shimmer
 *   review      → top candidate, live-rendered, "Review · N" badge
 *   approved    → the user's primary item, live-rendered, count badge
 *   error       → message + Retry
 */
type Props = {
  def: DeliverableDef;
  brand: MockBrand;
  sourceBrand?: Brand;
  selected: boolean;
  /** True once any card is selected — keeps every checkbox visible. */
  selectionActive: boolean;
  onToggleSelect: (key: string) => void;
  onGenerate: (key: string) => void;
  onOpenReview: (key: string) => void;
  /** Open the owned-collection drilldown (approved only). */
  onOpen: (def: DeliverableDef, origin?: { x: number; y: number }) => void;
  onEdit: (def: DeliverableDef, itemId: string) => void;
  onDownload: (def: DeliverableDef, itemId: string) => void;
};

export function DeliverableCard({
  def,
  brand,
  sourceBrand,
  selected,
  selectionActive,
  onToggleSelect,
  onGenerate,
  onOpenReview,
  onOpen,
  onEdit,
  onDownload,
}: Props) {
  const record = useKitStore((s) => s.deliverables[def.key]);
  const generating = useKitStore((s) => s.generatingKeys.includes(def.key));
  const status = statusOf({ deliverables: { [def.key]: record }, generatingKeys: generating ? [def.key] : [] }, def.key);

  const primary = primaryItem(record);
  const topCandidate = candidateItems(record)[0];
  const shownItem = status === 'approved' ? primary : topCandidate;
  const approvedCount = approvedItems(record).length;
  const candidateCount = candidateItems(record).length;

  const preview = useMemo(() => {
    if (!shownItem) return null;
    const template = templateForVariant(def, brand, shownItem.variantId);
    return renderKitPreview(def, template, shownItem.customization, sourceBrand, brand);
  }, [shownItem, def, brand, sourceBrand]);

  const error = record?.error ?? null;

  if (status === 'not-created' && error) {
    return (
      <figure className="bk-card bk-deliverable" data-status="error">
        <div className="bk-card-cover bk-card-cover--state">
          <div className="bk-deliverable-state">
            <span className="bk-deliverable-error-text">{error}</span>
            <button
              type="button"
              className="bk-deliverable-cta"
              onClick={() => onGenerate(def.key)}
            >
              Retry
            </button>
          </div>
        </div>
        <figcaption className="bk-card-label">{def.label}</figcaption>
      </figure>
    );
  }

  if (status === 'not-created') {
    return (
      <figure className="bk-card bk-deliverable" data-status="not-created">
        <div
          className="bk-card-cover bk-card-cover--state bk-card-cover--empty"
          onClick={() => (selectionActive ? onToggleSelect(def.key) : onGenerate(def.key))}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (selectionActive) onToggleSelect(def.key);
              else onGenerate(def.key);
            }
          }}
          aria-label={
            selectionActive
              ? `Select ${def.label} for generation`
              : `Generate ${def.label}`
          }
        >
          <label
            className={`bk-deliverable-check${selected ? ' is-checked' : ''}${selectionActive ? ' is-visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(def.key)}
              aria-label={`Select ${def.label}`}
            />
            <span className="bk-deliverable-check-box" aria-hidden>
              {selected && <CheckMark />}
            </span>
          </label>
          <div className="bk-deliverable-state">
            <span className="bk-deliverable-empty-hint">Not created yet</span>
            <span className="bk-deliverable-cta">
              <SparkIcon />
              Generate
            </span>
          </div>
        </div>
        <figcaption className="bk-card-label">{def.label}</figcaption>
      </figure>
    );
  }

  if (status === 'generating') {
    return (
      <figure className="bk-card bk-deliverable" data-status="generating">
        <div className="bk-card-cover bk-card-cover--state">
          <div className="bk-deliverable-shimmer" aria-hidden />
          <div className="bk-deliverable-state">
            <span className="bk-deliverable-generating-text">Generating…</span>
          </div>
        </div>
        <figcaption className="bk-card-label">{def.label}</figcaption>
      </figure>
    );
  }

  if (status === 'review') {
    return (
      <figure
        className="bk-card bk-deliverable"
        data-status="review"
        onClick={() => onOpenReview(def.key)}
      >
        <div className="bk-card-cover">
          {preview ? (
            <span className="bk-card-render" aria-hidden>
              {preview}
            </span>
          ) : (
            <div className="bk-deliverable-state">
              <span className="bk-deliverable-empty-hint">Ready to review</span>
            </div>
          )}
          <span className="bk-deliverable-badge bk-deliverable-badge--review">
            Review · {candidateCount}
          </span>
        </div>
        <figcaption className="bk-card-label">{def.label}</figcaption>
      </figure>
    );
  }

  // approved
  return (
    <figure
      className="bk-card bk-deliverable"
      data-status="approved"
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onOpen(def, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
    >
      <div className="bk-card-cover">
        {preview ? (
          <span className="bk-card-render" aria-hidden>
            {preview}
          </span>
        ) : (
          <div className="bk-deliverable-state">
            <span className="bk-deliverable-empty-hint">{def.label}</span>
          </div>
        )}
        {approvedCount > 1 && (
          <span className="bk-deliverable-badge">{approvedCount} designs</span>
        )}
        <div className="bk-card-actions">
          {primary && (
            <>
              <button
                type="button"
                className="bk-card-action"
                aria-label={`Customize ${def.label}`}
                title={`Customize ${def.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(def, primary.id);
                }}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="bk-card-action"
                aria-label={`Download ${def.label}`}
                title={`Download ${def.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(def, primary.id);
                }}
              >
                <DownloadIcon />
              </button>
            </>
          )}
        </div>
      </div>
      <figcaption className="bk-card-label">{def.label}</figcaption>
    </figure>
  );
}

function CheckMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
