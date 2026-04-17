import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '../data/examplePrompts';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

const ROTATION_MS = 3200;
const MIN_CHARS = 5;
const MAX_CHARS = 200;

export function PromptInput({ onSubmit, disabled }: PromptInputProps) {
  const [value, setValue] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (value.length > 0) return;
    const id = window.setInterval(
      () => setExampleIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length),
      ROTATION_MS,
    );
    return () => window.clearInterval(id);
  }, [value]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS || disabled) return;

    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      const next = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      }));
      setSparkles(next);
      window.setTimeout(() => setSparkles([]), 900);
    }

    onSubmit(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  function handleExampleClick(text: string) {
    setValue(text);
    inputRef.current?.focus();
  }

  const canSubmit = value.trim().length >= MIN_CHARS && !disabled;

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={MAX_CHARS}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value ? '' : EXAMPLE_PROMPTS[exampleIndex]}
          disabled={disabled}
          className="w-full h-[88px] md:h-[104px] px-6 md:px-8 pr-32 md:pr-44 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl text-2xl md:text-3xl font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent shadow-xl transition-all"
          aria-label="Describe your business"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-[72px] md:h-[84px] px-4 md:px-7 rounded-2xl bg-foreground text-background font-semibold text-base md:text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-transform flex items-center gap-2 shadow-lg"
          aria-label="Generate my brand"
        >
          <Sparkles className="w-5 h-5" />
          <span className="hidden md:inline">Generate my brand</span>
          <ArrowRight className="w-5 h-5 md:hidden" />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <span className="text-xs text-muted-foreground self-center mr-1">Try:</span>
        {EXAMPLE_PROMPTS.slice(0, 4).map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleExampleClick(prompt)}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            initial={{ opacity: 1, scale: 0, x: s.x, y: s.y }}
            animate={{
              opacity: 0,
              scale: 1.5,
              x: s.x + (Math.random() - 0.5) * 200,
              y: s.y + (Math.random() - 0.5) * 200,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed top-0 left-0 w-3 h-3 pointer-events-none z-50"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(124,58,237,0.6) 60%, transparent 100%)',
              borderRadius: '50%',
            }}
          />
        ))}
      </AnimatePresence>
    </form>
  );
}
