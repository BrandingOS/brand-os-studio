import { useState } from 'react';

interface Props {
  label: string;
  primary?: boolean;
  onShuffle(): void;
  title?: string;
}

export function ShuffleButton({ label, primary, onShuffle, title }: Props) {
  const [spinning, setSpinning] = useState(false);

  const handle = () => {
    onShuffle();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 520);
  };

  return (
    <button
      type="button"
      className={`shuffle-btn${primary ? ' is-primary' : ''}${spinning ? ' is-spinning' : ''}`}
      onClick={handle}
      title={title}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 3h5v5" />
        <path d="M4 20 21 3" />
        <path d="M21 16v5h-5" />
        <path d="m15 15 6 6" />
        <path d="M4 4l5 5" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
