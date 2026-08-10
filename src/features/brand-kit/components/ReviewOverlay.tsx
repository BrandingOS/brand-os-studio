import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { useKitStore } from '../kit/kitStore';
import { candidateItems, deriveStatus, type DeliverableKey } from '../kit/types';
import { DELIVERABLES, getDeliverableByKey } from '../kit/registry';
import { renderKitPreview, templateForVariant } from '../kit/preview';
import { variantsForCard } from '../data/legacy-mapping';
import type { GenerationContext } from '../kit/generation';
import { TemplatePickerModal } from './TemplatePickerModal';

/**
 * Review queue — the moment of ownership. Every generated deliverable
 * passes through here: the user sees the candidates, picks one (or
 * asks for more / browses the full library / skips), and only then
 * does it join their kit. One deliverable at a time, one click per
 * decision.
 *
 * The queue is derived from the store (all deliverables currently in
 * `review`, registry order), so approving/skipping advances naturally:
 * the current key leaves the queue and the next one takes its place.
 * Closing the overlay keeps pending reviews — cards show their badge
 * and review resumes from the kit page.
 */
type Props = {
  open: boolean;
  /** Deliverable to focus first (when opened from a specific card). */
  focusKey: DeliverableKey | null;
  brand: MockBrand;
  sourceBrand?: Brand;
  ctx: GenerationContext;
  onClose: () => void;
  /** Approve + open the card editor on the new item. */
  onCustomize: (key: DeliverableKey, itemId: string) => void;
};

const SECTION_LABELS: Record<string, string> = {
  stationery: 'Stationery',
  social: 'Social Media',
  web: 'Web',
  'brand-guides': 'Brand Guides',
  presentations: 'Presentations',
  animations: 'Animations',
};

export function ReviewOverlay({
  open,
  focusKey,
  brand,
  sourceBrand,
  ctx,
  onClose,
  onCustomize,
}: Props) {
  const deliverables = useKitStore((s) => s.deliverables);
  const generatingKeys = useKitStore((s) => s.generatingKeys);
  const approve = useKitStore((s) => s.approve);
  const approveTopCandidates = useKitStore((s) => s.approveTopCandidates);
  const dismissCandidates = useKitStore((s) => s.dismissCandidates);
  const regenerate = useKitStore((s) => s.regenerate);
  const addApprovedItem = useKitStore((s) => s.addApprovedItem);

  // Registry-ordered queue of everything awaiting review. `generating`
  // keys stay in the queue so a regenerate doesn't collapse the view.
  const queue = useMemo(
    () =>
      DELIVERABLES.filter((d) => {
        const status = deriveStatus(deliverables[d.key], generatingKeys.includes(d.key));
        return status === 'review' || status === 'generating';
      }).map((d) => d.key),
    [deliverables, generatingKeys],
  );

  const [currentKey, setCurrentKey] = useState<DeliverableKey | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Pick the focused/first key on open; keep the current key while it
  // stays in the queue; advance to the next when it leaves.
  useEffect(() => {
    if (!open) {
      setCurrentKey(null);
      setBrowseOpen(false);
      return;
    }
    setCurrentKey((prev) => {
      if (prev && queue.includes(prev)) return prev;
      if (focusKey && queue.includes(focusKey)) return focusKey;
      return queue[0] ?? null;
    });
  }, [open, queue, focusKey]);

  // Everything reviewed → close.
  useEffect(() => {
    if (open && queue.length === 0) onClose();
  }, [open, queue.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const ws = document.querySelector('[data-workspace]');
    setTheme(ws?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !browseOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, browseOpen]);

  const def = currentKey ? getDeliverableByKey(currentKey) : undefined;
  const record = currentKey ? deliverables[currentKey] : undefined;
  const candidates = candidateItems(record);
  const isGenerating = currentKey ? generatingKeys.includes(currentKey) : false;

  // Reset the selection when the deliverable (or its candidate set)
  // changes; default to the ranked-first candidate.
  const candidateIdsKey = candidates.map((c) => c.id).join(',');
  useEffect(() => {
    setSelectedItemId((prev) =>
      prev && candidates.some((c) => c.id === prev) ? prev : candidates[0]?.id ?? null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, candidateIdsKey]);

  const advance = () => {
    // The store update hasn't landed in `queue` yet — compute the next
    // key excluding the current one.
    const rest = queue.filter((k) => k !== currentKey);
    setCurrentKey(rest[0] ?? null);
    if (rest.length === 0) onClose();
  };

  if (!open || !def) return null;

  const position = queue.indexOf(def.key);
  const selected = candidates.find((c) => c.id === selectedItemId) ?? candidates[0];

  const handleApprove = () => {
    if (!selected) return;
    approve(def.key, selected.id);
    advance();
  };

  const handleCustomize = () => {
    if (!selected) return;
    approve(def.key, selected.id);
    onCustomize(def.key, selected.id);
  };

  const handleSkip = () => {
    dismissCandidates(def.key);
    advance();
  };

  const handleApproveAllRemaining = () => {
    approveTopCandidates(queue);
    onClose();
  };

  const allTemplates = variantsForCard(def.sectionKey, def.label, brand);

  return createPortal(
    <div
      className="bk-review-backdrop"
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-label={`Review ${def.label}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bk-review" onMouseDown={(e) => e.stopPropagation()}>
        <header className="bk-review-head">
          <div className="bk-review-titles">
            <span className="bk-review-eyebrow">
              {SECTION_LABELS[def.sectionKey] ?? def.sectionKey}
            </span>
            <h2 className="bk-review-title">{def.label}</h2>
          </div>
          <div className="bk-review-progress" aria-label={`Reviewing ${position + 1} of ${queue.length}`}>
            {queue.length > 1 && (
              <span className="bk-review-progress-text">
                {position + 1} of {queue.length}
              </span>
            )}
            <button
              type="button"
              className="bk-review-close"
              onClick={onClose}
              aria-label="Close review"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="bk-review-body">
          {isGenerating ? (
            <div className="bk-review-generating">
              <div className="bk-deliverable-shimmer" aria-hidden />
              <span>Generating {def.label.toLowerCase()} designs…</span>
            </div>
          ) : (
            <div className="bk-review-grid" data-aspect={def.aspect >= 1 ? 'landscape' : 'portrait'}>
              {candidates.map((item) => {
                const template = templateForVariant(def, brand, item.variantId);
                const preview = renderKitPreview(def, template, null, sourceBrand, brand);
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`bk-review-candidate${isSelected ? ' is-selected' : ''}`}
                    style={{ aspectRatio: `${def.aspect}` }}
                    onClick={() => setSelectedItemId(item.id)}
                    onDoubleClick={() => {
                      setSelectedItemId(item.id);
                      approve(def.key, item.id);
                      advance();
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${template?.name ?? 'Design'}${isSelected ? ' (selected)' : ''}`}
                  >
                    <span className="bk-review-candidate-render" aria-hidden>
                      {preview}
                    </span>
                    <span className="bk-review-candidate-name">{template?.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="bk-review-foot">
          <div className="bk-review-foot-secondary">
            <button type="button" className="bk-review-btn" onClick={handleSkip} disabled={isGenerating}>
              Skip
            </button>
            <button
              type="button"
              className="bk-review-btn"
              onClick={() => regenerate(def.key, ctx)}
              disabled={isGenerating}
            >
              Show me more
            </button>
            <button
              type="button"
              className="bk-review-btn"
              onClick={() => setBrowseOpen(true)}
              disabled={isGenerating}
            >
              Browse all
            </button>
          </div>
          <div className="bk-review-foot-primary">
            {queue.length > 1 && (
              <button
                type="button"
                className="bk-review-btn"
                onClick={handleApproveAllRemaining}
                disabled={isGenerating}
                title="Approve the first candidate of every remaining deliverable"
              >
                Approve all remaining ({queue.length})
              </button>
            )}
            <button
              type="button"
              className="bk-review-btn"
              onClick={handleCustomize}
              disabled={isGenerating || !selected}
            >
              Use &amp; customize
            </button>
            <button
              type="button"
              className="bk-review-btn bk-review-btn--primary"
              onClick={handleApprove}
              disabled={isGenerating || !selected}
            >
              Use this design
            </button>
          </div>
        </footer>

        <TemplatePickerModal
          open={browseOpen}
          title={`All ${def.label.toLowerCase()} designs`}
          tileAspect={def.aspect}
          templates={allTemplates}
          excludedIds={[]}
          sourceBrand={sourceBrand}
          mockBrand={brand}
          onPick={(tpl) => {
            setBrowseOpen(false);
            addApprovedItem(def.key, tpl.id);
            dismissCandidates(def.key);
            advance();
          }}
          onClose={() => setBrowseOpen(false)}
        />
      </div>
    </div>,
    document.body,
  );
}

