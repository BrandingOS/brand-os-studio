import { useOnboardingStore } from '../store/onboardingStore';
import { PaletteCard } from './PaletteCard';
import { PaletteEditor } from './PaletteEditor';

export function PaletteCardList() {
  const palettes = useOnboardingStore(s => s.feel.palettes);
  const selectedId = useOnboardingStore(s => s.feel.selectedPaletteId);
  const selectPalette = useOnboardingStore(s => s.selectPalette);
  const toggleLock = useOnboardingStore(s => s.togglePaletteLock);
  const updateColors = useOnboardingStore(s => s.updatePaletteColors);

  return (
    <div className="flex flex-col gap-3">
      {palettes.map(p => (
        <div key={p.id}>
          <PaletteCard
            palette={p}
            selected={selectedId === p.id}
            onSelect={selectPalette}
            onToggleLock={toggleLock}
          />
          {selectedId === p.id && (
            <PaletteEditor
              palette={p}
              onChange={(colors) => updateColors(p.id, colors)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
