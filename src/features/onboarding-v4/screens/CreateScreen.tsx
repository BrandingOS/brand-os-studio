import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CosmosShell } from '../components/CosmosShell';
import { FlowSwitch } from '../components/FlowSwitch';
import { StepDots } from '../components/StepDots';
import { FooterCTA } from '../components/FooterCTA';
import { DefineStep } from '../steps/DefineStep';
import { FeelStep } from '../steps/FeelStep';
import { useV4Store } from '../store/onboardingV4Store';
import { STYLE_CARDS, poolForCard } from '../data/styleCards';
import { createBrandResilient } from '../services/createBrand';

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
  // Synchronous re-entrancy gate — `busy` only disables the CTA on the
  // NEXT render, so a same-tick double click would create two brands.
  const busyRef = useRef(false);

  const meta = STEP_META[step];
  const canAdvance = step === 1 ? define.name.trim().length > 0 && define.description.trim().length >= 10 : true;

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const state = useV4Store.getState();
      const palette =
        state.palettes.find((p) => p.id === state.selectedPaletteId) ||
        state.palettes.find((p) => p.locked) ||
        state.palettes[0];
      const cardState =
        state.styleCards.find((s) => s.locked) || state.styleCards[0];
      const cardDef =
        STYLE_CARDS.find((d) => d.id === cardState.id) || STYLE_CARDS[0];
      const pool = poolForCard(cardDef);
      const uniqueFonts = Array.from(new Map(pool.map((f) => [f.name, f])).values());
      const headingFont =
        uniqueFonts[cardState.fontIdx % uniqueFonts.length] ||
        uniqueFonts[0] || { name: 'Inter', weight: 500 };
      const bodyFont =
        uniqueFonts.find((f) => f.name !== headingFont.name) || headingFont;

      const primary = palette.colors[1] ?? palette.colors[0];
      const secondary = palette.colors[2] ?? palette.colors[palette.colors.length - 1];
      const accent = palette.colors[3] ?? palette.colors[palette.colors.length - 1];
      const description = state.define.description.trim();

      const guidelines = {
        strategy: {
          mission: description,
          values: [],
          personality: [cardDef.label],
          positioning: `${cardDef.label} direction`,
          targetAudience: description,
        },
        colorPalette: {
          primary: { hex: primary, name: 'Primary', rgb: '', cmyk: '', usage: 'Primary brand color' },
          secondary: { hex: secondary, name: 'Secondary', rgb: '', cmyk: '', usage: 'Secondary brand color' },
          accent: { hex: accent, name: 'Accent', rgb: '', cmyk: '', usage: 'Accent color' },
        },
        voiceAndTone: {
          voice: cardDef.label,
          toneAttributes: [cardDef.label],
        },
      };

      const input = {
        name: state.define.name.trim(),
        primaryColor: primary,
        secondaryColor: secondary,
        fonts: {
          primary: headingFont.name,
          secondary: bodyFont.name,
        },
        tone: cardDef.label,
        audience: description,
        guidelines,
      };

      const brand = await createBrandResilient(input);

      toast.success('Brand created!');
      useV4Store.getState().reset();
      navigate(then ?? `/b/${brand.slug}/setup`);
    } catch (err) {
      console.error('Failed to create brand:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create brand');
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const setupHref = then ? `/onboard-brand?then=${encodeURIComponent(then)}` : '/onboard-brand';

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
