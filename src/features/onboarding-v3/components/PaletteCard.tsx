import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FeelPalette } from '../types';
import { LockBadge } from './LockBadge';

interface Props {
  palette: FeelPalette;
  selected: boolean;
  onSelect(id: string): void;
  onToggleLock(id: string): void;
}

export function PaletteCard({ palette, selected, onSelect, onToggleLock }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(palette.id)}
      className="group relative rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface w-full text-left"
      animate={{
        scale: selected ? 1.01 : 1,
        rotateX: palette.locked ? -1 : 0,
        translateZ: palette.locked ? 8 : 0,
      }}
      style={{
        outline: selected ? '2px solid var(--accent)' : 'none',
        outlineOffset: 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="flex h-20">
        {palette.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <p className="text-[13px] font-medium text-cosmos-primary">{palette.name}</p>
          <p className="text-[11px] uppercase tracking-wider text-cosmos-muted">{palette.mood}</p>
        </div>
        {selected && (
          <div className="grid place-items-center w-5 h-5 rounded-full bg-cosmos-accent text-cosmos-accent-contrast">
            <Check size={12} />
          </div>
        )}
      </div>
      <LockBadge locked={palette.locked} onToggle={() => onToggleLock(palette.id)} />
    </motion.button>
  );
}
