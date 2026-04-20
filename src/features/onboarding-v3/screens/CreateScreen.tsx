import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { StepDots } from '../components/StepDots';
import { DefineStep } from '../steps/DefineStep';
import { FeelStep } from '../steps/FeelStep';
import { GenerateStep } from '../steps/GenerateStep';
import { createBrandFromOnboardingV3 } from '@/features/onboarding/utils/createBrandFromAnswers';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';

export function CreateScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then') || null;
  const [busy, setBusy] = useState(false);

  const step = useOnboardingStore(s => s.step);
  const setStep = useOnboardingStore(s => s.setStep);
  const setFlow = useOnboardingStore(s => s.setFlow);
  const reset = useOnboardingStore(s => s.reset);

  useEffect(() => {
    setFlow('create');
  }, [setFlow]);

  async function onPick(variation: GeneratedBrand) {
    setBusy(true);
    try {
      const { slug } = await createBrandFromOnboardingV3({
        mode: 'generate',
        define: useOnboardingStore.getState().define,
        feel: useOnboardingStore.getState().feel,
        chosenVariation: variation,
      });
      reset();
      navigate(then ?? `/b/${slug}/identity`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-onboarding="cosmos" className="min-h-screen">
      <OnboardingHeader
        title="Create your Brand"
        crossLink={{ to: `/onboarding-v3${then ? `?then=${encodeURIComponent(then)}` : ''}`, label: 'or import an existing one →' }}
      />
      <StepDots current={step} />
      <main className="px-6 py-6">
        {busy && <p className="text-center text-[13px] text-cosmos-secondary mb-4">Creating brand…</p>}
        {step === 1 && <DefineStep onNext={() => setStep(2)} />}
        {step === 2 && <FeelStep onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <GenerateStep onBack={() => setStep(2)} onPick={onPick} />}
      </main>
    </div>
  );
}
