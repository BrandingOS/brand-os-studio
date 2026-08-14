import { useEffect, useRef, useState } from 'react';
import { generateNameSuggestions } from '../utils/nameGen';

interface Props {
  value: string;
  description: string;
  onChange(value: string): void;
  placeholder?: string;
}

export function MagicWandInput({ value, description, onChange, placeholder = 'e.g. Noor Studio' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [chips, setChips] = useState<string[]>([]);

  const wandVisible = description.trim().length > 0;

  const openAndGenerate = () => {
    setChips(generateNameSuggestions(description, 5));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    // let fade run
    setTimeout(() => setChips([]), 260);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleWandClick = () => {
    if (open) {
      setChips(generateNameSuggestions(description, 5));
    } else {
      openAndGenerate();
    }
  };

  return (
    <div className={`brand-input-wrap${open ? ' is-suggesting' : ''}`} ref={wrapRef}>
      <input
        id="brand-name"
        className={`input${wandVisible ? ' has-wand' : ''}`}
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="brand-suggestions" role="listbox" aria-label="Brand name suggestions">
        {open &&
          chips.map((c) => (
            <button
              key={c}
              type="button"
              className="brand-chip"
              onClick={() => {
                onChange(c);
                close();
              }}
            >
              {c}
            </button>
          ))}
      </div>

      <button
        type="button"
        className="wand-btn"
        data-visible={wandVisible ? 'true' : 'false'}
        data-open={open ? 'true' : 'false'}
        aria-label="Suggest brand names"
        title="Suggest names from your description"
        onClick={handleWandClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20 L13 11" />
          <path d="M15.5 3 L16.7 6.3 L20 7.5 L16.7 8.7 L15.5 12 L14.3 8.7 L11 7.5 L14.3 6.3 Z" fill="currentColor" stroke="none" />
          <path d="M7 4.5 L7.35 5.4 L8.3 5.7 L7.35 6 L7 6.95 L6.65 6 L5.7 5.7 L6.65 5.4 Z" fill="currentColor" stroke="none" opacity={0.55} />
          <path d="M19 16 L19.28 16.72 L20 17 L19.28 17.28 L19 18 L18.72 17.28 L18 17 L18.72 16.72 Z" fill="currentColor" stroke="none" opacity={0.55} />
        </svg>
      </button>
    </div>
  );
}
