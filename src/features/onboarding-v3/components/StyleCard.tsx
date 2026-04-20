import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FeelStyle } from '../types';
import { LockBadge } from './LockBadge';

interface Props {
  style: FeelStyle;
  selected: boolean;
  onSelect(id: string): void;
  onToggleLock(id: string): void;
}

export function StyleCard({ style, selected, onSelect, onToggleLock }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(style.id)}
      className="group relative aspect-square rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface"
      animate={{
        scale: selected ? 1.02 : 1,
        rotateX: style.locked ? -1 : 0,
        translateZ: style.locked ? 8 : 0,
      }}
      whileHover={{ scale: 1.02 }}
      style={{
        outline: selected ? '2px solid var(--accent)' : 'none',
        outlineOffset: 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <img src={style.imageUrl} alt={style.label} className="absolute inset-0 w-full h-full object-cover" />
      <LockBadge locked={style.locked} onToggle={() => onToggleLock(style.id)} />
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
        <span className="text-[11px] font-medium text-white uppercase tracking-wider">{style.label}</span>
      </div>
      {selected && (
        <div className="absolute top-2 left-2 grid place-items-center w-5 h-5 rounded-full bg-cosmos-accent text-cosmos-accent-contrast">
          <Check size={12} />
        </div>
      )}
    </motion.button>
  );
}
