// CountChip — 1–4 candidates per generation. Local segmented pill in
// the panel's own visual family (matches ModeToggle next to it).

export function CountChip({
  value, onChange, disabled, max = 4,
}: { value: number; onChange: (n: number) => void; disabled?: boolean; max?: number }) {
  return (
    <div
      role="radiogroup"
      aria-label="Number of images"
      data-generate-count
      className="inline-flex h-8 items-center gap-0.5 rounded-lg border px-0.5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      title="Images per generation"
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            data-generate-count-value={n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="h-6 min-w-6 rounded-md px-1.5 text-[11px] font-medium tabular-nums transition-colors disabled:opacity-50"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-contrast)' : 'var(--text-secondary)',
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
