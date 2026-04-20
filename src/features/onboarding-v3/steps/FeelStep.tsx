import { useOnboardingStore } from '../store/onboardingStore';
import { StyleCardGrid } from '../components/StyleCardGrid';
import { PaletteCardList } from '../components/PaletteCardList';
import { ShuffleControls } from '../components/ShuffleControls';

interface Props { onNext(): void; onBack(): void }

export function FeelStep({ onNext, onBack }: Props) {
  const selectedStyleId = useOnboardingStore(s => s.feel.selectedStyleId);
  const selectedPaletteId = useOnboardingStore(s => s.feel.selectedPaletteId);
  const canProceed = !!selectedStyleId && !!selectedPaletteId;
  const label = 'text-[11px] font-medium uppercase tracking-wider text-cosmos-muted';

  return (
    <div className="flex flex-col gap-8 max-w-[820px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className={label}>Feel</h2>
        <ShuffleControls />
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-[13px] font-medium text-cosmos-primary">Choose a style</h3>
        <StyleCardGrid />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-[13px] font-medium text-cosmos-primary">Pick a palette</h3>
        <PaletteCardList />
      </section>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack}
          className="text-[13px] text-cosmos-secondary">← Previous</button>
        <button type="button" onClick={onNext} disabled={!canProceed}
          className="rounded-full h-10 px-5 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40">
          Generate →
        </button>
      </footer>
    </div>
  );
}
