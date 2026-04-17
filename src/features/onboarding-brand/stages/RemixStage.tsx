import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Shuffle, Wand2 } from 'lucide-react';
import {
  shuffleColorSchemeAsync,
  shuffleFontPairing,
} from '@/features/brand-board/engine/shuffle';
import { LivePreview } from '../components/LivePreview';
import { ShufflePicker } from '../components/ShufflePicker';
import { DeviceFrame } from '../components/DeviceFrame';
import type { BrandTone, GeneratedBrand } from '../types';

interface RemixStageProps {
  initialBrand: GeneratedBrand;
  isSaving: boolean;
  onBack: () => void;
  onCreate: (brand: GeneratedBrand) => void;
}

const VOICE_VARIANTS: Array<{
  traits: [string, string, string];
  tone: BrandTone;
}> = [
  { traits: ['Confident', 'Clear', 'Warm'], tone: 'professional' },
  { traits: ['Playful', 'Direct', 'Bright'], tone: 'playful' },
  { traits: ['Grounded', 'Honest', 'Gentle'], tone: 'casual' },
  { traits: ['Bold', 'Decisive', 'Sharp'], tone: 'authoritative' },
  { traits: ['Curious', 'Friendly', 'Open'], tone: 'friendly' },
];

export function RemixStage({
  initialBrand,
  isSaving,
  onBack,
  onCreate,
}: RemixStageProps) {
  const [brand, setBrand] = useState<GeneratedBrand>(initialBrand);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [shuffling, setShuffling] = useState<string | null>(null);
  const [voiceCursor, setVoiceCursor] = useState(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        shuffleEverything();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  async function shuffleColors() {
    setShuffling('colors');
    try {
      const scheme = await shuffleColorSchemeAsync(brand.colors.primary);
      setBrand((b) => ({
        ...b,
        colors: {
          ...b.colors,
          primary: scheme.primary,
          secondary: scheme.secondary,
          accent: scheme.accent,
          neutrals: scheme.neutrals.slice(0, 4),
        },
      }));
    } finally {
      setShuffling(null);
    }
  }

  function shuffleFonts() {
    setShuffling('fonts');
    try {
      const pair = shuffleFontPairing();
      setBrand((b) => ({
        ...b,
        fonts: { heading: pair.heading, body: pair.body, style: pair.style },
      }));
    } finally {
      setShuffling(null);
    }
  }

  function shuffleVoice() {
    setShuffling('voice');
    try {
      const next = (voiceCursor + 1) % VOICE_VARIANTS.length;
      setVoiceCursor(next);
      const pick = VOICE_VARIANTS[next];
      setBrand((b) => ({
        ...b,
        voice: { traits: pick.traits, tone: pick.tone },
      }));
    } finally {
      setShuffling(null);
    }
  }

  async function shuffleEverything() {
    setShuffling('all');
    try {
      const [scheme] = await Promise.all([
        shuffleColorSchemeAsync(brand.colors.primary),
      ]);
      const pair = shuffleFontPairing();
      const nextVoice = (voiceCursor + 1) % VOICE_VARIANTS.length;
      const voice = VOICE_VARIANTS[nextVoice];
      setVoiceCursor(nextVoice);
      setBrand((b) => ({
        ...b,
        colors: {
          ...b.colors,
          primary: scheme.primary,
          secondary: scheme.secondary,
          accent: scheme.accent,
          neutrals: scheme.neutrals.slice(0, 4),
        },
        fonts: { heading: pair.heading, body: pair.body, style: pair.style },
        voice: { traits: voice.traits, tone: voice.tone },
      }));
    } finally {
      setShuffling(null);
    }
  }

  const paletteDots = useMemo(
    () => [brand.colors.primary, brand.colors.secondary, brand.colors.accent],
    [brand.colors.primary, brand.colors.secondary, brand.colors.accent],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            disabled={isSaving}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-sm font-medium">Almost there — remix it</h1>
          <button
            type="button"
            onClick={() => onCreate(brand)}
            disabled={isSaving}
            className="text-sm font-semibold px-4 h-9 rounded-lg bg-foreground text-background hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isSaving ? 'Creating…' : 'Create my brand'}
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        <aside className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">Tweak your brand</h2>
          </div>

          <ShufflePicker
            label="Colors"
            summary={
              <div className="flex items-center gap-1.5">
                {paletteDots.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="w-5 h-5 rounded-full border border-border"
                    style={{ background: c }}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {brand.colors.mood}
                </span>
              </div>
            }
            onShuffle={shuffleColors}
            disabled={shuffling === 'colors'}
          />

          <ShufflePicker
            label="Typography"
            summary={
              <div className="text-sm">
                <span
                  style={{ fontFamily: `'${brand.fonts.heading}', sans-serif` }}
                  className="font-semibold"
                >
                  {brand.fonts.heading}
                </span>{' '}
                <span className="text-muted-foreground">+</span>{' '}
                <span style={{ fontFamily: `'${brand.fonts.body}', sans-serif` }}>
                  {brand.fonts.body}
                </span>
              </div>
            }
            onShuffle={shuffleFonts}
            disabled={shuffling === 'fonts'}
          />

          <ShufflePicker
            label="Voice & feel"
            summary={
              <div className="flex flex-wrap gap-1.5">
                {brand.voice.traits.map((trait) => (
                  <span
                    key={trait}
                    className="px-2 py-0.5 rounded-full text-[11px] bg-muted"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            }
            onShuffle={shuffleVoice}
            disabled={shuffling === 'voice'}
          />

          <div className="pt-2">
            <button
              type="button"
              onClick={shuffleEverything}
              disabled={shuffling !== null}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 shadow-md"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle everything
              <kbd className="ml-2 hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-white/20 rounded px-1.5 py-0.5">
                SPACE
              </kbd>
            </button>
          </div>

          <div className="pt-4 text-xs text-muted-foreground leading-relaxed">
            <p className="mb-1 font-medium text-foreground/80">Tips</p>
            <p>Press <span className="font-mono">SPACE</span> to shuffle everything at once.</p>
            <p>Tap any section to try a different direction.</p>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Live preview
              </div>
              <div
                className="text-xl font-bold mt-0.5"
                style={{ fontFamily: `'${brand.fonts.heading}', sans-serif` }}
              >
                {brand.name}
              </div>
            </div>
            <DeviceFrame value={device} onChange={setDevice} />
          </div>

          <motion.div
            key={`${brand.colors.primary}-${brand.fonts.heading}-${brand.voice.tone}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <LivePreview brand={brand} device={device} />
          </motion.div>
        </section>
      </main>
    </div>
  );
}
