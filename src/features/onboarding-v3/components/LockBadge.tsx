import { Lock, Unlock } from 'lucide-react';

interface Props {
  locked: boolean;
  onToggle(): void;
  className?: string;
}

export function LockBadge({ locked, onToggle, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={
        `absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full border ` +
        `${locked ? 'bg-cosmos-accent text-cosmos-accent-contrast border-cosmos-accent' : 'bg-cosmos-surface text-cosmos-secondary border-cosmos-border opacity-0 group-hover:opacity-100'} ` +
        `transition-opacity ` + className
      }
      aria-label={locked ? 'Unlock' : 'Lock'}
    >
      {locked ? <Lock size={12} /> : <Unlock size={12} />}
    </button>
  );
}
