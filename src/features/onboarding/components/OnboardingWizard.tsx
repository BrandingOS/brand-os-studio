import { useEffect, useState } from 'react';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import {
  ArrowLeft, ArrowRight, CheckCircle,
  Building2, Users, Heart, Target, TrendingUp, Palette, Image, SkipForward
} from 'lucide-react';

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

const iconMap = { Building2, Users, Heart, Target, TrendingUp, Palette, Image };

export function OnboardingWizard() {
  const {
    steps, currentStepIndex, answers, nextStep, prevStep, goToStep,
    canProceed, canSkipCurrent, skipStep, getCompletionPercentage,
    getStepStatus, isComplete, validateCurrentStep,
  } = useOnboardingStore();
  const { createBrandFromAnswers } = useOnboardingFlow();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const completionPercentage = getCompletionPercentage();

  // Auto-create brand when onboarding is complete and user is authenticated
  useEffect(() => { 
    if (isComplete && isAuthenticated && !showAuthModal) {
      createBrandFromAnswers().catch(console.error); 
    }
  }, [isComplete, isAuthenticated, showAuthModal, createBrandFromAnswers]);
  
  if (!currentStep) return <div>Loading...</div>;

  const StepComponent = stepComponents[currentStep.component as keyof typeof stepComponents];

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) { alert(error); return; }
    nextStep();
  };
  const handleSkip = () => { if (canSkipCurrent()) { skipStep(currentStep.id); nextStep(); } };
  const handleComplete = async () => {
    const error = validateCurrentStep();
    if (error) { alert(error); return; }
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    try { await createBrandFromAnswers(); }
    catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert(error instanceof Error ? error.message : 'Failed to create brand. Please try again.');
    }
  };
  // Close auth modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

useEffect(() => {
  // lock scrolling on mount
  document.body.style.overflow = "hidden";
  return () => {
    // restore scrolling on unmount
    document.body.style.overflow = "";
  };
}, []);

  return (
<Section container={false} className="h-screen overflow-hidden bg-background">
      {/* Shell: header (sticky) + content (page scroll) + footer (fixed) */}
  <div className="h-full flex flex-col">
        {/* COMPACT HEADER */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3">
            {/* Single-row meta like the reference */}
            <div className="grid grid-cols-3 items-center">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
              <div className="text-center">
                <h1 className="text-lg sm:text-xl font-semibold">Brand Identity Brief</h1>
                <p className="hidden sm:block text-xs text-muted-foreground">Help us craft the perfect brand strategy for you</p>
              </div>
              <div className="text-right text-xs sm:text-sm font-medium">
                {completionPercentage}% Complete
              </div>
            </div>

            {/* Slim progress bar */}
            <div className="mt-3 mb-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-1.5 bg-foreground/90 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Small step icons row (scrollable if tight) */}
           <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const IconComponent = iconMap[step.icon as keyof typeof iconMap];
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
                  <span className={`text-xs text-center max-w-16 leading-tight ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        </header>

        {/* MAIN (page scroll) */}
        {/* Bottom padding matches fixed footer height so content never hides behind it */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 pt-3 pb-28">
            <Card className="p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                {/* <div className="flex items-center justify-center mb-3">
                  {(() => {
                    const IconComponent = iconMap[currentStep.icon as keyof typeof iconMap];
                    return <IconComponent className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />;
                  })()}
                </div> */}
                <h2 className="text-xl sm:text-2xl font-semibold mb-1">{currentStep.title}</h2>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div> 

              <div className="max-w-2xl mx-auto">
                <StepComponent value={answers[currentStep.id]} stepId={currentStep.id} />
              </div>
            </Card>
          </div>
        </main>

        {/* FIXED FOOTER (always visible, no more scrolling past it) */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>

              <div className="flex gap-2 sm:gap-3">
                {canSkipCurrent() && (
                  <Button variant="ghost" onClick={handleSkip} className="flex items-center gap-2">
                    <SkipForward className="h-4 w-4" /> Skip
                  </Button>
                )}

                {isLastStep ? (
                  <Button onClick={handleComplete} disabled={!canProceed()} className="flex items-center gap-2">
                    Complete Setup <CheckCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={!canProceed()} className="flex items-center gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal for completion */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
      />
    </Section>
  );
}
