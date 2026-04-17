import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PromptStage } from './stages/PromptStage';
import { RevealStage } from './stages/RevealStage';
import { RemixStage } from './stages/RemixStage';
import { Confetti } from './components/Confetti';
import { useBrandGenerator } from './hooks/useBrandGenerator';
import { useBrandCreator } from './hooks/useBrandCreator';
import {
  playChime,
  playShuffle,
  playWoosh,
} from './services/soundEffects';
import type { GeneratedBrand, OnboardingBrandStage } from './types';

export function OnboardingBrand() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [stage, setStage] = useState<OnboardingBrandStage>('prompt');
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<GeneratedBrand | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const { variations, isGenerating, generate, shuffleOne } =
    useBrandGenerator();
  const { createBrand, goToBrand, isSaving } = useBrandCreator();

  const handlePrompt = useCallback(
    async (value: string) => {
      playWoosh();
      setPrompt(value);
      setStage('reveal');
      await generate(value);
    },
    [generate],
  );

  const handleShuffleOne = useCallback(
    async (index: number) => {
      playShuffle();
      await shuffleOne(index);
    },
    [shuffleOne],
  );

  const handleAccept = useCallback(
    (index: number) => {
      const picked = variations[index];
      if (!picked) return;
      playWoosh();
      setSelected(picked);
      setStage('remix');
    },
    [variations],
  );

  const handleCreate = useCallback(
    async (brand: GeneratedBrand) => {
      if (!isAuthenticated) {
        toast.info('Sign in to save your brand');
        navigate('/?auth=required');
        return;
      }
      const result = await createBrand(brand);
      if (!result) return;
      playChime();
      setCelebrating(true);
      window.setTimeout(() => goToBrand(result.slug), 1800);
    },
    [createBrand, goToBrand, isAuthenticated, navigate],
  );

  const confettiColors = selected
    ? [
        selected.colors.primary,
        selected.colors.secondary,
        selected.colors.accent,
        ...selected.colors.neutrals,
      ]
    : ['#7C3AED', '#06B6D4', '#F97316', '#EC4899'];

  return (
    <div className="bg-background">
      <AnimatePresence mode="wait">
        {stage === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PromptStage
              onSubmit={handlePrompt}
              disabled={isGenerating || isSaving}
            />
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RevealStage
              userPrompt={prompt}
              variations={variations}
              isGenerating={isGenerating}
              onShuffle={handleShuffleOne}
              onAccept={handleAccept}
              onBack={() => setStage('prompt')}
            />
          </motion.div>
        )}

        {stage === 'remix' && selected && (
          <motion.div
            key="remix"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RemixStage
              initialBrand={selected}
              isSaving={isSaving}
              onBack={() => setStage('reveal')}
              onCreate={handleCreate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {celebrating && <Confetti colors={confettiColors} />}
    </div>
  );
}

export default OnboardingBrand;
