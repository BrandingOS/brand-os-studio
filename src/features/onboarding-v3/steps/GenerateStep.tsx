import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { generateBrandVariations, isAIConfigured } from '@/features/onboarding-brand/services/brandGenerator';
import { GeneratedBrandCard } from '@/features/onboarding-brand/components/GeneratedBrandCard';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';

interface Props { onBack(): void; onPick(variation: GeneratedBrand): void }

function buildPrompt(state: ReturnType<typeof useOnboardingStore.getState>): string {
  const { define, feel } = state;
  const style = feel.styles.find(s => s.id === feel.selectedStyleId);
  const palette = feel.palettes.find(p => p.id === feel.selectedPaletteId);
  return [
    `Brand: ${define.name}`,
    `Description: ${define.description}`,
    define.audience && `Audience: ${define.audience}`,
    define.market && `Market: ${define.market}`,
    define.goals && `Goals: ${define.goals}`,
    define.values && `Values: ${define.values}`,
    style && `Visual style: ${style.label} (${style.moodKeywords.join(', ')})`,
    palette && `Preferred palette: ${palette.name} — colors ${palette.colors.join(', ')}, mood ${palette.mood}`,
    `Produce three variations that RESPECT the palette colors and style mood.`,
  ].filter(Boolean).join('\n');
}

export function GenerateStep({ onBack, onPick }: Props) {
  const aiState = useOnboardingStore(s => s.aiState);
  const variations = useOnboardingStore(s => s.variations);
  const error = useOnboardingStore(s => s.variationsError);
  const setAiState = useOnboardingStore(s => s.setAiState);
  const setVariations = useOnboardingStore(s => s.setVariations);
  const setError = useOnboardingStore(s => s.setVariationsError);
  const [retries, setRetries] = useState(0);
  const [shufflingIndex, setShufflingIndex] = useState<number | null>(null);

  async function run() {
    setAiState('generating'); setError(null);
    if (!isAIConfigured()) {
      toast.message('AI offline — showing local variations.');
      setVariations([]);
      setAiState('idle');
      return;
    }
    try {
      const prompt = buildPrompt(useOnboardingStore.getState());
      const out = await generateBrandVariations(prompt);
      setVariations(out);
      setAiState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAiState('error');
    }
  }

  async function shuffleOne(index: number) {
    if (!variations) return;
    setShufflingIndex(index);
    try {
      const prompt = buildPrompt(useOnboardingStore.getState());
      const fresh = await generateBrandVariations(prompt);
      const updated = variations.map((v, i) => i === index ? fresh[0] ?? v : v);
      setVariations(updated);
    } catch {
      toast.error('Could not regenerate this variation.');
    } finally {
      setShufflingIndex(null);
    }
  }

  useEffect(() => {
    if (aiState === 'idle' && variations == null) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[820px] mx-auto">
      <AnimatePresence mode="wait">
        {aiState === 'generating' && (
          <motion.div key="loading" className="h-[320px] relative rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="absolute inset-y-0 w-1/3"
              style={{ background: 'linear-gradient(90deg, transparent, var(--accent-muted), transparent)' }}
              animate={{ x: ['-40%', '140%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 grid place-items-center text-[13px] text-cosmos-secondary">
              Crafting three directions…
            </div>
          </motion.div>
        )}

        {aiState === 'error' && (
          <motion.div key="error" className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5 text-[13px] text-red-600">
            <p>Generation failed: {error}</p>
            <button type="button" onClick={() => { setRetries(r => r + 1); run(); }}
              disabled={retries >= 3}
              className="mt-3 rounded-full h-9 px-4 bg-cosmos-accent text-cosmos-accent-contrast disabled:opacity-40">
              Retry
            </button>
          </motion.div>
        )}

        {aiState === 'idle' && variations && (
          <motion.div key="results"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            {variations.map((v, i) => (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <GeneratedBrandCard
                  brand={v}
                  onShuffle={() => shuffleOne(i)}
                  onAccept={() => onPick(v)}
                  isShuffling={shufflingIndex === i}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="text-[13px] text-cosmos-secondary">← Previous</button>
      </footer>
    </div>
  );
}
