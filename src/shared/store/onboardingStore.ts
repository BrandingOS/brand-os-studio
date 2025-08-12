import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StepDef, OnboardingState } from '../types/onboarding';

const DEFAULT_STEPS: StepDef[] = [
  {
    id: 'brand-name',
    title: 'Brand Name',
    description: 'What\'s your brand name?',
    component: 'BrandNameStep',
    required: true,
    validation: (value: string) => !value?.trim() ? 'Brand name is required' : null,
  },
  {
    id: 'logo-upload',
    title: 'Logo Upload',
    description: 'Upload your logo (optional)',
    component: 'LogoUploadStep',
    required: false,
  },
  {
    id: 'primary-color',
    title: 'Primary Color',
    description: 'Choose your primary brand color',
    component: 'ColorPickerStep',
    required: true,
    validation: (value: string) => !value ? 'Primary color is required' : null,
  },
  {
    id: 'tone',
    title: 'Brand Tone',
    description: 'How does your brand speak?',
    component: 'ToneStep',
    required: true,
    validation: (value: string) => !value ? 'Brand tone is required' : null,
  },
  {
    id: 'audience',
    title: 'Target Audience',
    description: 'Who is your target audience?',
    component: 'AudienceStep',
    required: true,
    validation: (value: string) => !value ? 'Target audience is required' : null,
  },
];

interface OnboardingStore extends OnboardingState {
  setAnswer: (stepId: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
  validateCurrentStep: () => string | null;
  canProceed: () => boolean;
  getCompletionPercentage: () => number;
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    (set, get) => ({
      steps: DEFAULT_STEPS,
      currentStepIndex: 0,
      answers: {},
      isComplete: false,

      setAnswer: (stepId: string, value: any) => {
        set((state) => ({
          answers: { ...state.answers, [stepId]: value }
        }), false, 'setAnswer');
      },

      nextStep: () => {
        const { currentStepIndex, steps } = get();
        if (currentStepIndex < steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 }, false, 'nextStep');
        } else {
          set({ isComplete: true }, false, 'completeOnboarding');
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 }, false, 'prevStep');
        }
      },

      goToStep: (index: number) => {
        const { steps } = get();
        if (index >= 0 && index < steps.length) {
          set({ currentStepIndex: index }, false, 'goToStep');
        }
      },

      reset: () => {
        set({
          currentStepIndex: 0,
          answers: {},
          isComplete: false
        }, false, 'reset');
      },

      validateCurrentStep: () => {
        const { steps, currentStepIndex, answers } = get();
        const currentStep = steps[currentStepIndex];
        if (!currentStep) return null;
        
        const value = answers[currentStep.id];
        return currentStep.validation ? currentStep.validation(value) : null;
      },

      canProceed: () => {
        const { validateCurrentStep } = get();
        return validateCurrentStep() === null;
      },

      getCompletionPercentage: () => {
        const { steps, answers } = get();
        const requiredSteps = steps.filter(step => step.required);
        const completedRequired = requiredSteps.filter(step => 
          answers[step.id] !== undefined && answers[step.id] !== ''
        );
        return Math.round((completedRequired.length / requiredSteps.length) * 100);
      },
    }),
    { name: 'onboarding-store' }
  )
);