import { useRef, type MouseEvent, type ReactNode } from 'react';

/**
 * SpotlightCard — card with a cursor-following violet glow.
 *
 * Hover anywhere on the card and a soft radial gradient follows the
 * mouse position. Powered by CSS custom properties (`--mx`, `--my`)
 * updated in a mousemove handler. Defined in `index.css` as
 * `.spotlight-card::before` so the visual is GPU-friendly.
 */
interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientY - rect.top}px`);
    el.style.setProperty('--my', `${e.clientX - rect.left}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`spotlight-card surface ${className}`}
    >
      {children}
    </div>
  );
}
