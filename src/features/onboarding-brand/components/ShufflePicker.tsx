import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ShufflePickerProps {
  label: string;
  summary: ReactNode;
  onShuffle: () => void;
  disabled?: boolean;
}

export function ShufflePicker({
  label,
  summary,
  onShuffle,
  disabled,
}: ShufflePickerProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">
          {label}
        </div>
        <div className="text-sm text-foreground">{summary}</div>
      </div>
      <button
        type="button"
        onClick={onShuffle}
        disabled={disabled}
        className="shrink-0 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
        aria-label={`Shuffle ${label}`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${disabled ? 'animate-spin' : ''}`} />
        Shuffle
      </button>
    </div>
  );
}
