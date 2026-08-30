/**
 * Editing the brand's strategy, from inside the Brand Kit.
 *
 * The Strategy card was read-only: it printed the eleven answers and the
 * only way to change one was to leave the kit, find Setup, scroll to
 * Brand Strategy and come back (`.audit/OURS.md` D45 — the overview card
 * offered "Edit Strategy" and the drilldown had a Back button).
 *
 * Three rules it exists to keep, and the first is the whole design:
 *
 *  • **Nothing here reimplements strategy editing.** Setup already owns
 *    both ways of answering these questions — `StrategyEditorModal` for
 *    one answer by hand (chips where a closed vocabulary exists, prose
 *    where the meaning is in the wording) and `StrategyImportModal` for
 *    the AI handoff, refusal layers and all. This panel is a LIST that
 *    opens them and a write that commits what they returned. A second
 *    implementation of "Personality, pick up to five" would be a second
 *    vocabulary to keep in step, and it would drift.
 *  • **Every write goes down the Setup chain**: `brandToMockBrand` →
 *    mutate the whole MockBrand → `mockBrandToPatch(next, brand)` →
 *    `useBrandStore.update`. `mockBrandToPatch` diffs a WHOLE MockBrand,
 *    so the draft always starts from `brandToMockBrand` and only the
 *    strategy is touched: a hand-built partial emits destructive diffs.
 *  • **Nothing is written without a confirmation that NAMES the change.**
 *    Strategy is printed in the brand book, in the guideline and in every
 *    export; the dialog says which answers change and what to, not "Save?".
 *
 * Scope is the ELEVEN ANSWERS and nothing else. The free-form notes
 * (`brand.about`) are a different editor in Setup and are left alone —
 * a panel that quietly rewrote both would make its own confirmation a lie.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DsButton, DsConfirmDialog, DsModal } from '@/shared/ds';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { BrandStrategyFields, MockBrand } from '@/features/setup/data/mockBrand';
import {
  STRATEGY_CARDS,
  contentOf,
  selectionOf,
  type StrategyKey,
} from '@/features/setup/data/strategyCards';
import {
  StrategyEditorModal,
  type StrategyEditTarget,
} from '@/features/setup/components/StrategyEditorModal';
import { StrategyImportModal } from '@/features/setup/components/StrategyImportModal';
import {
  applyStrategyFields,
  type ParsedStrategyField,
} from '@/features/setup/strategy/parseStrategyBrief';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import './assets.css';

export type StrategyEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
};

/** Whether two answers are the same, whichever shape the card stores. */
function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = Array.isArray(a) ? a : a ? [a] : [];
    const y = Array.isArray(b) ? b : b ? [b] : [];
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  return String(a ?? '') === String(b ?? '');
}

export function StrategyEditor({
  open,
  onClose,
  brand,
  sourceBrand,
  onBrandChange,
}: StrategyEditorProps) {
  const [draft, setDraft] = useState<BrandStrategyFields>(brand.strategy);
  const [original, setOriginal] = useState<BrandStrategyFields>(brand.strategy);
  const [editing, setEditing] = useState<StrategyEditTarget | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed on open: the panel shows the brand as it is NOW, never a
  // draft abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    setDraft(brand.strategy);
    setOriginal(brand.strategy);
    setEditing(null);
    setImporting(false);
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo<MockBrand>(() => ({ ...brand, strategy: draft }), [brand, draft]);

  // Live preview — the kit behind the panel repaints as the draft changes.
  // Driven by the DRAFT alone: `preview` is derived from `brand`, and
  // `onBrandChange` is what replaces `brand`, so depending on either makes
  // the panel answer its own update.
  useEffect(() => {
    if (!open) return;
    onBrandChange?.({ ...brand, strategy: draft });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    for (const card of STRATEGY_CARDS) {
      if (same(draft[card.key], original[card.key])) continue;
      const before = contentOf(card, original);
      const after = contentOf(card, draft);
      if (!before) out.push(`Answer ${card.name} — ${after}`);
      else if (!after) out.push(`Clear ${card.name} (was ${before})`);
      else out.push(`${card.name}: ${before} → ${after}`);
    }
    return out;
  }, [draft, original]);

  const openCard = useCallback(
    (key: StrategyKey) => {
      const card = STRATEGY_CARDS.find((c) => c.key === key);
      if (!card) return;
      setEditing({
        card,
        selected: selectionOf(card, draft),
        text: card.vocab ? '' : String(draft[key] ?? ''),
      });
    },
    [draft],
  );

  const saveOne = useCallback(({ key, value }: { key: StrategyKey; value: string | string[] }) => {
    setEditing(null);
    setDraft((prev) => ({ ...prev, [key]: value }) as BrandStrategyFields);
  }, []);

  const applyImport = useCallback((fields: ParsedStrategyField[]) => {
    setImporting(false);
    if (fields.length === 0) return;
    // ONE edit, exactly as Setup applies it: the answers were decided
    // together and the confirmation that follows should carry them together.
    setDraft((prev) => applyStrategyFields(prev, fields));
  }, []);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand) return;
    setSaving(true);
    setError(null);
    try {
      // The Setup chain, exactly. The draft starts from the WHOLE
      // projection so the patch diffs a whole brand — see the header.
      const whole = brandToMockBrand(sourceBrand);
      const next: MockBrand = { ...whole, strategy: draft };
      await useBrandStore.getState().update(sourceBrand.id, mockBrandToPatch(next, sourceBrand));
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The strategy could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [draft, sourceBrand, onClose]);

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Brand strategy"
        secondaryActions={
          <DsButton tone="tertiary" size="sm" onClick={() => setImporting(true)}>
            Build with AI
          </DsButton>
        }
        actions={
          <>
            <DsButton tone="secondary" size="sm" onClick={onClose}>
              Cancel
            </DsButton>
            <DsButton
              tone="primary"
              size="sm"
              disabled={!canWrite || changes.length === 0 || saving}
              onClick={() => setConfirming(true)}
            >
              {saving ? 'Saving…' : 'Save strategy'}
            </DsButton>
          </>
        }
      >
        <div className="bka-strategy">
          {/* Every card, answered or not. An unanswered one is a question
              waiting, not a row missing — hiding it is how a brand ends up
              with four of eleven answers and no idea which four. */}
          <div className="bka-strategy-list">
            {STRATEGY_CARDS.map((card) => {
              const value = contentOf(card, draft);
              const changed = !same(draft[card.key], original[card.key]);
              return (
                <button
                  key={card.key}
                  type="button"
                  className={`bka-strategy-row${changed ? ' is-changed' : ''}`}
                  onClick={() => openCard(card.key)}
                  aria-label={`Edit ${card.name}`}
                >
                  <span className="bka-strategy-name">{card.name}</span>
                  <span className={`bka-strategy-value${value ? '' : ' is-empty'}`}>
                    {value || 'Not answered'}
                  </span>
                </button>
              );
            })}
          </div>
          {error && <p className="bka-strategy-error">{error}</p>}
        </div>
      </DsModal>

      {/* Setup's own editors, not ours. See the header. */}
      <StrategyEditorModal target={editing} onClose={() => setEditing(null)} onSave={saveOne} />
      <StrategyImportModal
        open={importing}
        brandName={brand.name}
        strategy={draft}
        description={draft.products || undefined}
        onClose={() => setImporting(false)}
        onApply={applyImport}
      />

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's strategy?"
        description={
          <>
            The strategy is printed in the brand book, in the brand guideline and in every export
            that describes the brand.
            <ul className="bka-strategy-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the strategy"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
