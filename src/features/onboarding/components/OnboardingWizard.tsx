import { useEffect } from 'react';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { BrandNameStep } from './steps/BrandNameStep';
import { LogoUploadStep } from './steps/LogoUploadStep';
import { ColorPickerStep } from './steps/ColorPickerStep';
import { ToneStep } from './steps/ToneStep';
import { AudienceStep } from './steps/AudienceStep';

const stepComponents = {
  BrandNameStep,
  LogoUploadStep,
  ColorPickerStep,
  ToneStep,
  AudienceStep,
};

export function OnboardingWizard() {
  const {
    steps,
    currentStepIndex,
    answers,
    nextStep,
    prevStep,
    canProceed,
    getCompletionPercentage,
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

  const StepComponent = stepComponents[currentStep.component as keyof typeof stepComponents];

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) {
      alert(error); // In real app, use toast
      return;
    }
    nextStep();
  };

  const handleComplete = async () => {
    try {
      await createBrandFromAnswers();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to create brand. Please try again.');
    }
  };

  return (
    <Section container={false} className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium">{completionPercentage}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-2">{currentStep.title}</h1>
            <p className="text-muted-foreground">{currentStep.description}</p>
          </div>

          <div className="mb-8">
            <StepComponent value={answers[currentStep.id]} stepId={currentStep.id} />
          </div>

          {/* Navigation */}
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

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

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
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Section>
  );
}