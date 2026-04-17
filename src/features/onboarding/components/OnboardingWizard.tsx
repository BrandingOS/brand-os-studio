import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Building2,
  Users,
  Heart,
  Target,
  TrendingUp,
  Palette,
  Image,
  SkipForward,
  Sparkles,
  Upload,
  Eye,
  Globe,
  FileUp,
  UserCircle,
  X,
} from 'lucide-react';
import type { StepDef } from '@/shared/types/onboarding';

// Flow selector
import { FlowSelector, type OnboardingFlow } from './FlowSelector';

// Start Fresh flow steps
import { BrandBasicsStep } from './steps/BrandBasicsStep';
import { AudienceMarketStep } from './steps/AudienceMarketStep';
import { PersonalityStep } from './steps/PersonalityStep';
import { VisualPreferencesStep } from './steps/VisualPreferencesStep';
import { ReviewStep } from './steps/ReviewStep';

// Import Brand flow steps
import { BrandInfoStep } from './steps/BrandInfoStep';
import { UploadAssetsStep } from './steps/UploadAssetsStep';
import { BrandProfileStep } from './steps/BrandProfileStep';

// Legacy step components (kept for backward compatibility)
import { CompanyBasicsStep } from './steps/CompanyBasicsStep';
import { TargetAudienceStep } from './steps/TargetAudienceStep';
import { BrandPersonalityStep } from './steps/BrandPersonalityStep';
import { BusinessGoalsStep } from './steps/BusinessGoalsStep';
import { MarketPositionStep } from './steps/MarketPositionStep';
import { StyleValuesStep } from './steps/StyleValuesStep';
import { LogoAssetsStep } from './steps/LogoAssetsStep';

// ---------------------------------------------------------------------------
// Step component registry
// ---------------------------------------------------------------------------

const stepComponents: Record<string, React.ComponentType<{ value?: any; stepId: string }>> = {
  // New — Start Fresh
  BrandBasicsStep,
  AudienceMarketStep,
  PersonalityStep,
  VisualPreferencesStep,
  ReviewStep,
  // New — Import Brand
  BrandInfoStep,
  UploadAssetsStep,
  BrandProfileStep,
  // Legacy
  CompanyBasicsStep,
  TargetAudienceStep,
  BrandPersonalityStep,
  BusinessGoalsStep,
  MarketPositionStep,
  StyleValuesStep,
  LogoAssetsStep,
};

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Users,
  Heart,
  Target,
  TrendingUp,
  Palette,
  Image,
  Sparkles,
  Upload,
  Eye,
  Globe,
  FileUp,
  UserCircle,
};

// ---------------------------------------------------------------------------
// Flow step definitions
// ---------------------------------------------------------------------------

const START_FRESH_STEPS: StepDef[] = [
  {
    id: 'brand-basics',
    title: 'Brand Basics',
    description: 'Name, industry, tagline, and description',
    component: 'BrandBasicsStep',
    required: true,
    icon: 'Building2',
    category: 'Foundation',
    canSkip: false,
    validation: (value: any) =>
      !value?.brandName?.trim() ? 'Brand name is required' : null,
  },
  {
    id: 'audience-market',
    title: 'Audience & Market',
    description: 'Target audience, competitors, market position',
    component: 'AudienceMarketStep',
    required: false,
    icon: 'Users',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'brand-personality',
    title: 'Brand Personality',
    description: 'Personality traits, voice, tone, and values',
    component: 'PersonalityStep',
    required: false,
    icon: 'Heart',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'visual-preferences',
    title: 'Visual Preferences',
    description: 'Color mood, style direction, visual references',
    component: 'VisualPreferencesStep',
    required: false,
    icon: 'Palette',
    category: 'Design',
    canSkip: true,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your brand profile and create',
    component: 'ReviewStep',
    required: true,
    icon: 'Eye',
    category: 'Review',
    canSkip: false,
  },
];

const IMPORT_BRAND_STEPS: StepDef[] = [
  {
    id: 'brand-info',
    title: 'Brand Info',
    description: 'Name, industry, and website',
    component: 'BrandInfoStep',
    required: true,
    icon: 'Globe',
    category: 'Foundation',
    canSkip: false,
    validation: (value: any) =>
      !value?.brandName?.trim() ? 'Brand name is required' : null,
  },
  {
    id: 'upload-assets',
    title: 'Upload Assets',
    description: 'Logo files, guidelines, colors, and fonts',
    component: 'UploadAssetsStep',
    required: false,
    icon: 'FileUp',
    category: 'Assets',
    canSkip: true,
  },
  {
    id: 'brand-profile',
    title: 'Brand Profile',
    description: 'Personality, voice, and target audience',
    component: 'BrandProfileStep',
    required: false,
    icon: 'UserCircle',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your brand profile and create',
    component: 'ReviewStep',
    required: true,
    icon: 'Eye',
    category: 'Review',
    canSkip: false,
  },
];

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const store = useOnboardingStore();
  const {
    steps,
    currentStepIndex,
    answers,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    canSkipCurrent,
    skipStep,
    getCompletionPercentage,
    getStepStatus,
    isComplete,
    validateCurrentStep,
  } = store;

  const { createBrandFromAnswers } = useOnboardingFlow();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<OnboardingFlow | null>(null);

  // Lets the user bail out of onboarding. Uses browser history so they land
  // back where they came from (landing page, dashboard, a specific brand —
  // whatever). Only falls back to a default if there's no history to pop
  // (e.g. they opened /onboarding directly from a bookmark).
  //
  // Wizard steps don't push history entries (internal state, same URL), so
  // navigate(-1) always escapes /onboarding rather than just undoing a step.
  const handleExit = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  }, [navigate, isAuthenticated]);

  // ----- Flow selection -----
  const handleFlowSelect = useCallback(
    (flow: OnboardingFlow) => {
      setSelectedFlow(flow);
      // Replace the store's steps with the flow-specific ones
      const newSteps = flow === 'start-fresh' ? START_FRESH_STEPS : IMPORT_BRAND_STEPS;
      // Use the store's internal method to swap steps — we do it via reset + manual set
      store.reset();
      // We need to set steps directly — the store exposes addDynamicStep / removeDynamicStep
      // but it's cleaner to just set the steps property. We'll use a small workaround:
      // call reset (which sets currentStepIndex=0) then replace steps via the setter.
      useOnboardingStore.setState({ steps: newSteps, currentStepIndex: 0 });
    },
    [store],
  );

  // ----- Auto-create brand when complete + authenticated -----
  useEffect(() => {
    if (isComplete && isAuthenticated && !showAuthModal) {
      createBrandFromAnswers().catch(console.error);
    }
  }, [isComplete, isAuthenticated, showAuthModal, createBrandFromAnswers]);

  // Close auth modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

  // Lock scrolling while wizard is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ----- If no flow selected yet, show the selector -----
  if (!selectedFlow) {
    return (
      <Section container={false} className="h-screen overflow-hidden bg-background">
        <div className="h-full flex flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur shrink-0">
            <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-3 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className="justify-self-start gap-1.5"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold text-center">
                Brand Identity Setup
              </h1>
              <div />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <FlowSelector onSelect={handleFlowSelect} />
          </main>
        </div>
      </Section>
    );
  }

  // ----- Normal wizard flow -----
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const completionPercentage = getCompletionPercentage();

  if (!currentStep) return <div>Loading...</div>;

  const StepComponent = stepComponents[currentStep.component as keyof typeof stepComponents];

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) {
      toast({ title: 'Validation', description: error, variant: 'destructive' });
      return;
    }
    nextStep();
  };

  const handleSkip = () => {
    if (canSkipCurrent()) {
      skipStep(currentStep.id);
      nextStep();
    }
  };

  const handleComplete = async () => {
    const error = validateCurrentStep();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsCreatingBrand(true);
    try {
      await createBrandFromAnswers();
      toast({ title: 'Success!', description: 'Your brand has been created. Redirecting...' });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create brand.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      // Go back to flow selection
      setSelectedFlow(null);
    } else {
      prevStep();
    }
  };

  return (
    <Section container={false} className="h-screen overflow-hidden bg-background">
      <div className="h-full flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3">
            {/* Meta row */}
            <div className="grid grid-cols-3 items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExit}
                  className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
                  aria-label="Exit onboarding"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit</span>
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <div className="text-center">
                <h1 className="text-lg sm:text-xl font-semibold">Brand Identity Brief</h1>
                <p className="hidden sm:block text-xs text-muted-foreground">
                  {selectedFlow === 'start-fresh'
                    ? 'Building your brand from scratch'
                    : 'Importing your existing brand'}
                </p>
              </div>
              <div className="text-right text-xs sm:text-sm font-medium">
                {completionPercentage}% Complete
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 mb-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-1.5 bg-foreground/90 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Step icons */}
            <div className="flex justify-between items-center">
              {steps.map((step, index) => {
                const IconComponent = iconMap[step.icon] || Building2;
                const status = getStepStatus(step.id);
                const isActive = index === currentStepIndex;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => goToStep(index)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                        status === 'completed'
                          ? 'bg-primary text-primary-foreground'
                          : status === 'skipped'
                          ? 'bg-muted text-muted-foreground'
                          : isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : status === 'skipped' ? (
                        <SkipForward className="h-5 w-5" />
                      ) : (
                        <IconComponent className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs text-center max-w-16 leading-tight ${
                        isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 pt-3 pb-28">
            <Card className="p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-1">
                  {currentStep.title}
                </h2>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>

              <div className="max-w-2xl mx-auto">
                {StepComponent ? (
                  <StepComponent value={answers[currentStep.id]} stepId={currentStep.id} />
                ) : (
                  <p className="text-center text-muted-foreground">
                    Unknown step component: {currentStep.component}
                  </p>
                )}
              </div>
            </Card>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStepIndex === 0 ? 'Change Flow' : 'Previous'}
              </Button>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={!canSkipCurrent()}
                  className="flex items-center gap-2"
                >
                  <SkipForward className="h-4 w-4" /> Skip
                </Button>

                {isLastStep ? (
                  <Button
                    onClick={handleComplete}
                    disabled={!canProceed() || isCreatingBrand}
                    className="flex items-center gap-2"
                  >
                    {isCreatingBrand ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Brand...
                      </>
                    ) : (
                      <>
                        Complete Setup <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </Section>
  );
}
