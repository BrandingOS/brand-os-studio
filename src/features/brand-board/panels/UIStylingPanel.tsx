import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBoardStore, type ShadowIntensity, type Spacing } from '../store/useBrandBoardStore';
import { SHADOW_MAP } from '../engine/uiPresets';
import { shuffleUIStyle } from '../engine/shuffle';

const SHADOW_OPTIONS: { value: ShadowIntensity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
];

const SPACING_OPTIONS: { value: Spacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

export function UIStylingPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setUIStyle = useBrandBoardStore((s) => s.setUIStyle);

  const { borderRadius, shadowIntensity, spacing } = draft.uiStyle;

  const handleShuffle = () => {
    const preset = shuffleUIStyle();
    setUIStyle({
      borderRadius: preset.borderRadius,
      shadowIntensity: preset.shadowIntensity as ShadowIntensity,
      spacing: preset.spacing as Spacing,
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">UI Styling</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleShuffle}
          title="Shuffle UI style"
        >
          <Shuffle className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Border Radius slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Corner Radius
          </label>
          <span className="text-xs font-mono text-muted-foreground">
            {borderRadius}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={2}
          value={borderRadius}
          onChange={(e) => setUIStyle({ borderRadius: Number(e.target.value) })}
          className="w-full accent-primary h-1.5"
        />
      </div>

      {/* Shadow selector */}
      <div className="mb-4">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
          Shadow
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {SHADOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                shadowIntensity === opt.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/60 hover:border-border'
              }`}
              onClick={() => setUIStyle({ shadowIntensity: opt.value })}
            >
              <div
                className="w-8 h-6 rounded bg-background border border-border/40"
                style={{
                  boxShadow: SHADOW_MAP[opt.value],
                  borderRadius: `${Math.min(borderRadius, 8)}px`,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacing selector */}
      <div className="mb-4">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
          Spacing
        </label>
        <div className="flex rounded-lg border border-border/60 overflow-hidden">
          {SPACING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex-1 text-xs py-1.5 transition-colors ${
                spacing === opt.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background hover:bg-muted/60 text-muted-foreground'
              }`}
              onClick={() => setUIStyle({ spacing: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons preview card */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
          Button Preview
        </label>
        <div className="rounded-xl border border-border/60 p-4 flex flex-wrap gap-2 bg-muted/20">
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium text-white transition-colors"
            style={{
              backgroundColor: draft.colors.primary,
              borderRadius: `${borderRadius}px`,
              boxShadow: SHADOW_MAP[shadowIntensity],
            }}
          >
            Primary
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium border transition-colors"
            style={{
              borderColor: draft.colors.primary,
              color: draft.colors.primary,
              borderRadius: `${borderRadius}px`,
              backgroundColor: 'transparent',
            }}
          >
            Outline
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
            style={{
              borderRadius: `${borderRadius}px`,
              backgroundColor: 'transparent',
            }}
          >
            Ghost
          </button>
        </div>
      </div>
    </section>
  );
}
