import { useV4Store } from '../store/onboardingV4Store';
import { StyleCardGrid } from '../components/StyleCardGrid';
import { PaletteGrid } from '../components/PaletteGrid';
import { ShuffleButton } from '../components/ShuffleButton';

export function FeelStep() {
  const shuffleStyles = useV4Store((s) => s.shuffleStyles);
  const shufflePalettes = useV4Store((s) => s.shufflePalettes);

  const shuffleAll = () => {
    shuffleStyles();
    shufflePalettes();
  };

  return (
    <section className="panel is-active">
      <div className="shuffle-bar">
        <ShuffleButton label="Shuffle all" primary onShuffle={shuffleAll} title="Shuffle everything unlocked" />
      </div>
      <div className="feel-grid">
        <div>
          <div className="feel-col-head">
            <span className="feel-col-num">01</span>
            <h2 className="feel-col-title">Style direction</h2>
            <span className="feel-col-hint">Click to lock what pulls you</span>
            <ShuffleButton label="Shuffle" onShuffle={shuffleStyles} title="Shuffle unlocked styles" />
          </div>
          <StyleCardGrid />
        </div>

        <div>
          <div className="feel-col-head">
            <span className="feel-col-num">02</span>
            <h2 className="feel-col-title">Color mood</h2>
            <span className="feel-col-hint">Tap to focus · tap again to edit</span>
            <ShuffleButton label="Shuffle" onShuffle={shufflePalettes} title="Shuffle unlocked palettes" />
          </div>
          <PaletteGrid />
        </div>
      </div>
    </section>
  );
}
