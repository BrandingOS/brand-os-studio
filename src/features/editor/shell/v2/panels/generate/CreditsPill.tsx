// CreditsPill — the balance, in the product's own unit.
//
// "Credits", never provider tokens: what a user needs to know is how much they
// can still make. The dollar equivalent is a tooltip, not the headline.

import { Coins } from 'lucide-react';
import { creditsToUsdLabel, formatCredits } from '@/features/image-generation';

export function CreditsPill({
  balance, reserved, loading, onClick,
}: { balance: number | null; reserved?: number; loading?: boolean; onClick?: () => void }) {
  const low = balance != null && balance < 20;
  const empty = balance != null && balance <= 0;
  const label = loading || balance == null ? '—' : formatCredits(balance);

  return (
    <button
      type="button"
      onClick={onClick}
      data-credits-pill
      data-credits-low={low || undefined}
      aria-label={balance == null ? 'Credits' : `${label} credits remaining`}
      title={balance == null ? 'Credits' : `${label} credits ≈ ${creditsToUsdLabel(balance)}${reserved ? ` · ${reserved} held for running jobs` : ''}`}
      className="is-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 32, padding: '0 12px',
        borderRadius: 'var(--ds-radius-pill, 999px)',
        border: '1px solid var(--ds-border, var(--border))',
        background: empty
          ? 'color-mix(in oklab, var(--ds-danger, #d64545) 10%, transparent)'
          : 'var(--ds-surface, var(--surface))',
        color: empty ? 'var(--ds-danger, #d64545)' : 'var(--ds-text, var(--text-primary))',
        fontSize: 12.5, fontWeight: 500, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Coins size={14} strokeWidth={1.8} aria-hidden />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
      <span style={{ color: 'var(--ds-text-muted, var(--text-muted))', fontWeight: 400 }}>credits</span>
    </button>
  );
}
