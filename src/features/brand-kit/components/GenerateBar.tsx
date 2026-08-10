/**
 * Floating selection bar — appears once the user checks ≥1 not-created
 * deliverable. One-click bulk generation plus select-all/clear.
 */
type Props = {
  selectedCount: number;
  /** Total not-created deliverables available to select. */
  availableCount: number;
  onGenerate: () => void;
  onSelectAll: () => void;
  onClear: () => void;
};

export function GenerateBar({
  selectedCount,
  availableCount,
  onGenerate,
  onSelectAll,
  onClear,
}: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="bk-generate-bar" role="toolbar" aria-label="Generate selected deliverables">
      <span className="bk-generate-bar-count">
        {selectedCount} selected
      </span>
      {selectedCount < availableCount && (
        <button type="button" className="bk-generate-bar-ghost" onClick={onSelectAll}>
          Select all ({availableCount})
        </button>
      )}
      <button type="button" className="bk-generate-bar-ghost" onClick={onClear}>
        Clear
      </button>
      <button type="button" className="bk-generate-bar-primary" onClick={onGenerate}>
        Generate {selectedCount === 1 ? 'deliverable' : `${selectedCount} deliverables`}
      </button>
    </div>
  );
}
