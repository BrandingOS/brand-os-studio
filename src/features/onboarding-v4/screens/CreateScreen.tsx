import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CosmosShell } from '../components/CosmosShell';
import { FlowSwitch } from '../components/FlowSwitch';
import { StepDots } from '../components/StepDots';
import { FooterCTA } from '../components/FooterCTA';
import { DefineStep } from '../steps/DefineStep';
import { FeelStep } from '../steps/FeelStep';
import { useV4Store } from '../store/onboardingV4Store';

const STEP_META: Record<1 | 2, { title: string; subtitle: string; caption: string; label: string }> = {
  1: {
    title: 'Create your Brand',
    subtitle: 'Start from scratch. Define who you are, then feel what you look like.',
    caption: 'Ready to set the vibe?',
    label: 'Continue',
  },
  2: {
    title: 'Pick the feel',
    subtitle: 'Lock the directions that pull you. Shuffle the rest.',
    caption: 'Happy with this direction?',
    label: 'Create brand',
  },
};

export function CreateScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const step = useV4Store((s) => s.step);
  const setStep = useV4Store((s) => s.setStep);
  const define = useV4Store((s) => s.define);
  const [busy, setBusy] = useState(false);

  const meta = STEP_META[step];
  const canAdvance = step === 1 ? define.name.trim().length > 0 && define.description.trim().length >= 10 : true;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setBusy(true);
      // TODO: wire real brand creation on step 2 submit.
      window.setTimeout(() => {
        setBusy(false);
        navigate(then ?? '/onboarding-v4');
      }, 600);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const setupHref = then ? `/onboarding-v4?then=${encodeURIComponent(then)}` : '/onboarding-v4';

  return (
    <CosmosShell variant="create">
      <header className="cosmos-header cosmos-header-create">
        <h1>{meta.title}</h1>
        <p className="subtitle">{meta.subtitle}</p>
        <FlowSwitch to={setupHref} prefix="Already have a brand?" emphasis="Upload it" />
        <StepDots current={step} />
      </header>

      {step === 1 && <DefineStep />}
      {step === 2 && <FeelStep />}

      <FooterCTA
        variant="create"
        caption={meta.caption}
        label={busy ? 'Creating…' : meta.label}
        onClick={handleNext}
        disabled={!canAdvance || busy}
        onBack={handleBack}
        backDisabled={step === 1}
      />
    </CosmosShell>
  );
}
