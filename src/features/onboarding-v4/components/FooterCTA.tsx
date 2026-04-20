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
  const className = variant === 'create' ? 'footer-cta footer-cta-create' : 'footer-cta';
  return (
    <div className={className}>
      {caption && <span className="cta-caption">{caption}</span>}
      <button
        type="button"
        className={variant === 'create' ? 'btn-primary' : 'cta'}
        onClick={onClick}
        disabled={disabled}
      >
        <span>{label}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </button>
      {onBack && (
        <div className="footer-back">
          <button type="button" className="btn-ghost" onClick={onBack} disabled={backDisabled}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
