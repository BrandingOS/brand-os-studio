import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { generateDescriptionStream } from '../services/generateDescription';
import { useOnboardingStore } from '../store/onboardingStore';

interface Props {
  brandName: string;
  assetContext?: string[];
  onText(text: string): void;
  onError?(err: string): void;
}

export function SparkleAssist({ brandName, assetContext, onText, onError }: Props) {
  const sessionId = useOnboardingStore(s => s.sessionId);
  const [running, setRunning] = useState(false);

  const disabled = !brandName.trim() || running;

  async function run() {
    setRunning(true);
    try {
      let accumulated = '';
      for await (const chunk of generateDescriptionStream(sessionId, brandName.trim(), assetContext)) {
        accumulated += chunk;
        onText(accumulated);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-cosmos-border px-2.5 py-1 text-[11px] font-medium bg-cosmos-surface hover:bg-cosmos-surface-hover disabled:opacity-40"
      aria-label="Draft description with AI"
    >
      <motion.span
        animate={running ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: running ? Infinity : 0, ease: 'linear' }}
        className="inline-flex"
      >
        <Sparkles size={12} />
      </motion.span>
      {running ? 'Drafting…' : 'Draft with AI'}
    </button>
  );
}
