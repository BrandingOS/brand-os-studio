import { DsButton } from '@/shared/ds';

interface Props {
  caption?: string;
  label: string;
  onClick(): void;
  disabled?: boolean;
  onBack?(): void;
  backDisabled?: boolean;
  variant?: 'setup' | 'create';
}

export function FooterCTA({ caption, label, onClick, disabled, onBack, backDisabled, variant = 'setup' }: Props) {
  const backButton = onBack ? (
    <DsButton tone="tertiary" onClick={onBack} disabled={backDisabled}>
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      Back
    </DsButton>
  ) : null;
  const ctaButton = (
    <DsButton tone="primary" arrow onClick={onClick} disabled={disabled}>
      {label}
    </DsButton>
  );

  // Setup variant lays out as one row: Back (when present) on the left,
  // caption + primary CTA pinned right — same spot on both panels.
  if (variant === 'setup') {
    return (
      <div className="footer-cta has-back">
        {backButton}
        <div className="footer-cta-main">
          {caption && <span className="cta-caption">{caption}</span>}
          {ctaButton}
        </div>
      </div>
    );
  }

  return (
    <div className="footer-cta footer-cta-create">
      {caption && <span className="cta-caption">{caption}</span>}
      {ctaButton}
      {backButton && (
        // Step 1 hides Back entirely (legacy .btn-ghost[disabled] was
        // opacity:0) — visibility keeps the layout slot without showing
        // a disabled button that can't do anything yet.
        <div className="footer-back" style={backDisabled ? { visibility: 'hidden' } : undefined}>
          {backButton}
        </div>
      )}
    </div>
  );
}
