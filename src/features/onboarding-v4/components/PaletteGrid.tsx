import { useV4Store } from '../store/onboardingV4Store';
import { PaletteCard } from './PaletteCard';

export function PaletteGrid() {
  const palettes = useV4Store((s) => s.palettes);
  const selectedId = useV4Store((s) => s.selectedPaletteId);
  const editingId = useV4Store((s) => s.editingPaletteId);
  const select = useV4Store((s) => s.selectPalette);
  const toggleLock = useV4Store((s) => s.togglePaletteLock);
  const setEditing = useV4Store((s) => s.setEditingPalette);
  const updateColors = useV4Store((s) => s.updatePaletteColors);

  const focused = selectedId !== null;
  const editing = editingId !== null;

  return (
    <div className={`palette-wrap${focused ? ' is-focused' : ''}${editing ? ' is-editing' : ''}`}>
      <div className="palette-grid">
        {palettes.map((p) => (
          <PaletteCard
            key={p.id}
            palette={p}
            selected={selectedId === p.id}
            editing={editingId === p.id}
            onSelect={() => select(p.id)}
            onToggleLock={() => toggleLock(p.id)}
            onEdit={() => setEditing(p.id)}
            onStopEdit={() => setEditing(null)}
            onUpdateColors={(cs) => updateColors(p.id, cs)}
          />
        ))}
      </div>
    </div>
  );
}
