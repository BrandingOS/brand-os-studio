import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MeshGradient } from '../components/MeshGradient';
import { GeneratedBrandCard } from '../components/GeneratedBrandCard';
import type { GeneratedBrand } from '../types';

interface RevealStageProps {
  userPrompt: string;
  variations: GeneratedBrand[];
  isGenerating: boolean;
  onShuffle: (index: number) => Promise<void> | void;
  onAccept: (index: number) => void;
  onBack: () => void;
}

const LOADING_LINES = [
  'Reading your prompt…',
  'Sketching identity directions…',
  'Balancing colors…',
  'Pairing typography…',
  'Finding your voice…',
];

export function RevealStage({
  userPrompt,
  variations,
  isGenerating,
  onShuffle,
  onAccept,
  onBack,
}: RevealStageProps) {
  const [index, setIndex] = useState(0);
  const [shufflingIndex, setShufflingIndex] = useState<number | null>(null);
  const [loadingLine, setLoadingLine] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(
      () => setLoadingLine((i) => (i + 1) % LOADING_LINES.length),
      900,
    );
    return () => window.clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(variations.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [variations.length]);

  async function handleShuffle() {
    setShufflingIndex(index);
    try {
      await onShuffle(index);
    } finally {
      setShufflingIndex(null);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 50) setIndex((i) => Math.max(0, i - 1));
    if (dx < -50) setIndex((i) => Math.min(variations.length - 1, i + 1));
    setTouchStartX(null);
  }

  const current = variations[index];

  return (
    <div className="relative min-h-screen flex flex-col">
      <MeshGradient />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-xs text-muted-foreground max-w-[60%] truncate text-center">
          <span className="opacity-60">Your prompt: </span>
          <span className="italic">"{userPrompt}"</span>
        </div>
        <div className="w-16" />
      </header>

      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isGenerating && variations.length === 0 ? (
          <LoadingView line={LOADING_LINES[loadingLine]} />
        ) : current ? (
          <>
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-30 flex items-center justify-center"
                aria-label="Previous brand"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm text-muted-foreground tabular-nums">
                Brand{' '}
                <span className="font-semibold text-foreground">
                  {index + 1}
                </span>{' '}
                of {variations.length}
              </div>
              <button
                type="button"
                onClick={() =>
                  setIndex((i) => Math.min(variations.length - 1, i + 1))
                }
                disabled={index === variations.length - 1}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-30 flex items-center justify-center"
                aria-label="Next brand"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <GeneratedBrandCard
                key={index}
                brand={current}
                onShuffle={handleShuffle}
                onAccept={() => onAccept(index)}
                isShuffling={shufflingIndex === index}
              />
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-2">
              {variations.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? 'w-8 bg-foreground'
                      : 'w-2 bg-foreground/25 hover:bg-foreground/50'
                  }`}
                  aria-label={`Go to brand ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          <LoadingView line="Preparing…" />
        )}
      </main>
    </div>
  );
}

function LoadingView({ line }: { line: string }) {
  return (
    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-cyan-500 to-pink-500 mb-6 shadow-lg"
      >
        <Loader2 className="w-7 h-7 text-white" strokeWidth={2.5} />
      </motion.div>
      <h2 className="text-2xl md:text-3xl font-semibold mb-2">
        Crafting your brand…
      </h2>
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-muted-foreground"
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
