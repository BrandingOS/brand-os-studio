import { Shuffle } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import { lockedCount } from '../utils/shuffle';

export function ShuffleControls() {
  const shuffle = useOnboardingStore(s => s.shuffle);
  const styles = useOnboardingStore(s => s.feel.styles);
  const palettes = useOnboardingStore(s => s.feel.palettes);
  const total = lockedCount(styles) + lockedCount(palettes);

  const btn = 'inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[11px] font-medium border border-cosmos-border hover:bg-cosmos-surface-hover';

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => shuffle('all')} className={btn}>
        <Shuffle size={12} />
        Reshuffle all{total > 0 ? ` (${total} locked)` : ''}
      </button>
      <button type="button" onClick={() => shuffle('styles')} className={btn}>
        <Shuffle size={12} /> Style
      </button>
      <button type="button" onClick={() => shuffle('palettes')} className={btn}>
        <Shuffle size={12} /> Palette
      </button>
    </div>
  );
}
