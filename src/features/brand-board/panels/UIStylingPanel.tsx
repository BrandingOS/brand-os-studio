/**
 * UIStylingPanel — Relume-style UI controls.
 *
 * Two preview cards: Buttons & Forms (with live radius/shadow) and
 * Cards & Images. Corner-radius slider + shadow/spacing selectors
 * live inside the respective cards instead of a flat control stack.
 */
import { Shuffle } from 'lucide-react';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { SHADOW_MAP } from '../engine/uiPresets';

type ShadowIntensity = 'none' | 'subtle' | 'medium' | 'bold';
type Spacing = 'compact' | 'comfortable' | 'spacious';

const SHADOW_OPTIONS: { value: ShadowIntensity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
];

const SPACING_OPTIONS: { value: Spacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Cozy' },
  { value: 'spacious', label: 'Roomy' },
];

function ShuffleButton({ onClick, hint }: { onClick: () => void; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors"
    >
      <Shuffle className="h-3.5 w-3.5" />
      <span>Shuffle</span>
      <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted/70 rounded text-muted-foreground">
        {hint}
      </kbd>
    </button>
  );
}

export function UIStylingPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setBorderRadius = useBrandBoardStore((s) => s.setBorderRadius);
  const setShadowIntensity = useBrandBoardStore((s) => s.setShadowIntensity);
  const setSpacing = useBrandBoardStore((s) => s.setSpacing);
  const shuffleUI = useBrandBoardStore((s) => s.shuffleUI);

  const { borderRadius, shadowIntensity, spacing } = draft.uiStyle;
  const primary = draft.colors.primary;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground">UI Styling</h3>
        <ShuffleButton onClick={shuffleUI} hint="U" />
      </div>

      <div className="space-y-3">
        {/* ── Buttons & Forms ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-[11px] font-semibold text-muted-foreground mb-3">
            Buttons &amp; Forms
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white"
              style={{
                background: primary,
                borderRadius: `${borderRadius}px`,
                boxShadow: SHADOW_MAP[shadowIntensity],
              }}
            >
              Button
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium"
              style={{
                border: `1px solid ${primary}`,
                color: primary,
                borderRadius: `${borderRadius}px`,
              }}
            >
              Button
            </button>
          </div>

          <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Label
          </div>
          <input
            type="text"
            placeholder="Placeholder"
            className="w-full text-sm px-3 py-2 bg-background text-foreground"
            style={{
              border: '1px solid var(--border)',
              borderRadius: `${borderRadius}px`,
            }}
          />

          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Corner radius
                </label>
                <span className="text-xs font-mono text-muted-foreground">
                  {borderRadius}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="w-full accent-primary h-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Shadow
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SHADOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShadowIntensity(opt.value)}
                    className={`py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                      shadowIntensity === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Cards & Images ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-[11px] font-semibold text-muted-foreground mb-3">
            Cards &amp; Images
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div
              className="aspect-[4/3] bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800"
              style={{
                borderRadius: `${borderRadius}px`,
                boxShadow: SHADOW_MAP[shadowIntensity],
              }}
            />
            <div
              className="p-3 bg-background border border-border/60 flex flex-col justify-between"
              style={{
                borderRadius: `${borderRadius}px`,
                boxShadow: SHADOW_MAP[shadowIntensity],
              }}
            >
              <div>
                <div className="text-[11px] font-semibold mb-1">Outlined Card</div>
                <div className="text-[10px] text-muted-foreground leading-snug">
                  Match this card to your aesthetic.
                </div>
              </div>
              <button
                type="button"
                className="self-start mt-2 px-2.5 py-1 text-[10px] font-medium text-white"
                style={{
                  background: primary,
                  borderRadius: `${Math.max(borderRadius - 2, 2)}px`,
                }}
              >
                Button
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Spacing
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SPACING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpacing(opt.value)}
                  className={`py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                    spacing === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
