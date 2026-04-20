import { useOnboardingStore } from '../store/onboardingStore';
import { StyleCard } from './StyleCard';

export function StyleCardGrid() {
  const styles = useOnboardingStore(s => s.feel.styles);
  const selectedId = useOnboardingStore(s => s.feel.selectedStyleId);
  const selectStyle = useOnboardingStore(s => s.selectStyle);
  const toggleLock = useOnboardingStore(s => s.toggleStyleLock);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {styles.map(style => (
        <StyleCard
          key={style.id}
          style={style}
          selected={selectedId === style.id}
          onSelect={selectStyle}
          onToggleLock={toggleLock}
        />
      ))}
    </div>
  );
}
