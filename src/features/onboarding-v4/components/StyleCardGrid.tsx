import { useV4Store } from '../store/onboardingV4Store';
import { StyleCard } from './StyleCard';

export function StyleCardGrid() {
  const styleCards = useV4Store((s) => s.styleCards);
  const brandName = useV4Store((s) => s.define.name);
  const toggle = useV4Store((s) => s.toggleStyleLock);

  return (
    <div className="style-grid">
      {styleCards.map((s) => (
        <StyleCard key={s.id} state={s} brandName={brandName} onToggleLock={toggle} />
      ))}
    </div>
  );
}
