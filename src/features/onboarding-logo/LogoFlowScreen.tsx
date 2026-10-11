/**
 * /onboard-brand/logo — Start From Logo.
 *
 * The step is in the URL (`?step=`); the router owns it, so Back/Forward and
 * reload behave like any page. A step that cannot render with what the draft
 * holds is clamped to the furthest one that can — never an empty screen.
 *
 * Wears the onboarding shell (`CosmosShell`, its header and footer) so the two
 * paths into BrandingOS look like one product. Read `README.md` before
 * changing the flow.
 */
import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CosmosShell } from '@/features/onboarding-v4/components/CosmosShell';
import { BrandMark } from '@/features/onboarding-v4/components/BrandMark';
import { FlowSwitch } from '@/features/onboarding-v4/components/FlowSwitch';
import { FooterCTA } from '@/features/onboarding-v4/components/FooterCTA';
import { useLogoFlow } from './model/flowStore';
import { SECTIONS, STEP_META, canEnter, contextComplete, furthestReachable, isStep, nextStep, prevStep, type StepId } from './model/steps';
import { FlowRail } from './components/FlowRail';
import { UploadStep } from './steps/UploadStep';
import { ReadStep } from './steps/ReadStep';
import { ContextStep } from './steps/ContextStep';
import { DirectionsStep } from './steps/DirectionsStep';
import { SystemStep } from './steps/SystemStep';
import { BuildStep } from './steps/BuildStep';
import { PackageStep } from './steps/PackageStep';
import './styles/logoFlow.css';

const WIDTH: Record<StepId, string> = {
  logo: 'lf-w-narrow',
  read: 'lf-w-medium',
  context: 'lf-w-medium',
  directions: 'lf-w-wide',
  system: 'lf-w-wide',
  build: 'lf-w-narrow',
  package: 'lf-w-wide',
};

export function LogoFlowScreen() {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('step');
  const requested: StepId = isStep(raw) ? raw : 'logo';
  const state = useLogoFlow();
  const then = sp.get('then');

  const go = (step: StepId, replace = false) => {
    const next = new URLSearchParams(sp);
    if (step === 'logo') next.delete('step');
    else next.set('step', step);
    setSp(next, { replace });
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [requested]);

  // Clamp: a cold load of ?step=system with no draft lands on the logo step.
  const allowed = furthestReachable(requested, state);
  if (allowed !== requested) {
    const next = new URLSearchParams(sp);
    if (allowed === 'logo') next.delete('step');
    else next.set('step', allowed);
    return <Navigate to={{ search: next.toString() ? `?${next}` : '' }} replace />;
  }
  // Once built, the draft steps are behind the owner; the hub is where they are.
  if (state.committed && requested !== 'package' && requested !== 'build') {
    return <Navigate to={{ search: `?step=package${then ? `&then=${encodeURIComponent(then)}` : ''}` }} replace />;
  }

  const step = requested;
  const meta = STEP_META[step];
  const forward = nextStep(step);
  const back = prevStep(step);
  const existingHref = then ? `/onboard-brand?then=${encodeURIComponent(then)}` : '/onboard-brand';

  const footer = (() => {
    switch (step) {
      case 'logo':
        return { label: 'Read my logo', caption: undefined, disabled: !canEnter('read', state) };
      case 'read':
        return { label: 'Continue', caption: 'Did we read it right?', disabled: !state.read };
      case 'context':
        return {
          label: 'Show me directions',
          caption: contextComplete(state.context) ? 'Ready when you are.' : 'Answer 1–4 to continue.',
          disabled: !contextComplete(state.context),
        };
      case 'directions':
        return {
          label: 'Continue',
          caption: state.system ? `Continuing with ${state.system.directionName}.` : 'Choose a direction above.',
          disabled: !state.system,
        };
      case 'system': {
        const left = SECTIONS.length - (state.system?.approved.length ?? 0);
        return {
          label: 'Build my brand',
          caption: left ? `${left} part${left === 1 ? '' : 's'} not yet approved — they’ll be built as shown.` : 'Everything approved.',
          disabled: false,
        };
      }
      default:
        return null;
    }
  })();

  return (
    <CosmosShell variant="create">
      <div className={`lf-page ${WIDTH[step]}`} data-step={step}>
        <header className="cosmos-header cosmos-header-create lf-header">
          <BrandMark />
          <h1>{meta.title}</h1>
          <p className="subtitle">{meta.subtitle}</p>
          {step === 'logo' && <FlowSwitch to={existingHref} prefix="Already have a full brand?" emphasis="Upload it instead" />}
          {step !== 'build' && <FlowRail current={step} />}
        </header>

        {step === 'logo' && <UploadStep onSubmit={() => go('read')} />}
        {step === 'read' && <ReadStep />}
        {step === 'context' && <ContextStep />}
        {step === 'directions' && <DirectionsStep onChosen={() => go('system')} />}
        {step === 'system' && <SystemStep />}
        {step === 'build' && <BuildStep onDone={() => go('package', true)} />}
        {step === 'package' && <PackageStep />}

        {footer && (
          <FooterCTA
            variant="setup"
            caption={footer.caption}
            label={footer.label}
            disabled={footer.disabled}
            onClick={() => forward && go(forward)}
            onBack={back && step !== 'logo' ? () => go(back) : undefined}
          />
        )}
      </div>
    </CosmosShell>
  );
}
