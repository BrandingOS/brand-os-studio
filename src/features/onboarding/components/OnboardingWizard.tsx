import { useEffect } from 'react';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Building2,
  Users,
  Heart,
  Target,
  TrendingUp,
  Palette,
  Image,
  SkipForward,
} from 'lucide-react';

// Import step components
import { CompanyBasicsStep } from './steps/CompanyBasicsStep';
import { TargetAudienceStep } from './steps/TargetAudienceStep';
import { BrandPersonalityStep } from './steps/BrandPersonalityStep';
import { BusinessGoalsStep } from './steps/BusinessGoalsStep';
import { MarketPositionStep } from './steps/MarketPositionStep';
import { StyleValuesStep } from './steps/StyleValuesStep';
import { LogoAssetsStep } from './steps/LogoAssetsStep';

const stepComponents = {
  CompanyBasicsStep,
  TargetAudienceStep,
  BrandPersonalityStep,
  BusinessGoalsStep,
  MarketPositionStep,
  StyleValuesStep,
  LogoAssetsStep,
};

const iconMap = {
  Building2,
  Users,
  Heart,
  Target,
  TrendingUp,
  Palette,
  Image,
};

export function OnboardingWizard() {
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
  } = useOnboardingStore();

  const { createBrandFromAnswers } = useOnboardingFlow();

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const completionPercentage = getCompletionPercentage();

  useEffect(() => {
    if (isComplete) {
      createBrandFromAnswers().catch(console.error);
    }
  }, [isComplete, createBrandFromAnswers]);

  if (!currentStep) {
    return <div>Loading...</div>;
  }

  const StepComponent =
    stepComponents[currentStep.component as keyof typeof stepComponents];

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) {
      alert(error);
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
      alert(error);
      return;
    }

    try {
      await createBrandFromAnswers();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create brand. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <Section container={false} className="min-h-screen bg-background">
      {/* Page shell: header (sticky) + scroll area + footer (sticky) */}
      <div className="min-h-screen flex flex-col">
        {/* HEADER (sticky) */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-4">
            {/* Title */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-1">Brand Identity Brief</h1>
              <p className="text-muted-foreground text-sm">
                Help us craft the perfect brand strategy for you
              </p>
            </div>

            {/* Steps summary + percentage */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium">
                {completionPercentage}% Complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Step Icons */}
            <nav
              aria-label="Onboarding steps"
              className="flex justify-between items-center pb-1"
            >
              {steps.map((step, index) => {
                const IconComponent = iconMap[step.icon as keyof typeof iconMap];
                const status = getStepStatus(step.id);
                const isActive = index === currentStepIndex;

                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className="flex flex-col items-center group focus:outline-none"
                    aria-current={isActive ? 'step' : undefined}
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
                        isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* MAIN SCROLL AREA */}
        {/* Add fixed top/bottom paddings so content always starts from same Y and never hides under footer */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-28">
            {/* Step Content */}
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  {(() => {
                    const IconComponent =
                      iconMap[currentStep.icon as keyof typeof iconMap];
                    return <IconComponent className="h-8 w-8 text-primary" />;
                  })()}
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  {currentStep.title}
                </h2>
                <p className="text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <StepComponent
                  value={answers[currentStep.id]}
                  stepId={currentStep.id}
                />
              </div>
            </Card>
          </div>
        </main>

        {/* FOOTER (sticky) */}
        <footer className="sticky bottom-0 z-40 border-t bg-background/80 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-3">
                {canSkipCurrent() && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex items-center gap-2"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                )}

                {isLastStep ? (
                  <Button
                    onClick={handleComplete}
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                  >
                    Complete Setup
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Section>
  );
}
