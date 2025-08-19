import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { StepDef, OnboardingState } from '../types/onboarding';
import { demoOnboardingAnswers } from '@/data/demo';
import { onboardingService } from '@/shared/services/onboarding.supabase';
import { useSessionStore } from './sessionStore';

const DEFAULT_STEPS: StepDef[] = [
  {
    id: 'company-basics',
    title: 'Company Basics',
    description: 'Tell us about your company',
    component: 'CompanyBasicsStep',
    required: true,
    icon: 'Building2',
    category: 'Foundation',
    canSkip: false,
    validation: (value: any) => !value?.brandName?.trim() ? 'Brand name is required' : null,
  },
  {
    id: 'target-audience',
    title: 'Target Audience',
    description: 'Who are you building for? (Select 2-4 groups)',
    component: 'TargetAudienceStep',
    required: true,
    icon: 'Users',
    category: 'Strategy',
    canSkip: false,
    validation: (value: any) => !value?.length ? 'Please select at least one audience' : null,
  },
  {
    id: 'brand-personality',
    title: 'Brand Personality',
    description: 'How does your brand speak and feel?',
    component: 'BrandPersonalityStep',
    required: true,
    icon: 'Heart',
    category: 'Identity',
    canSkip: false,
    validation: (value: any) => !value?.tone ? 'Brand tone is required' : null,
  },
  {
    id: 'business-goals',
    title: 'Business Goals',
    description: 'What are your primary objectives?',
    component: 'BusinessGoalsStep',
    required: false,
    icon: 'Target',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'market-position',
    title: 'Market Position',
    description: 'How do you position against competitors?',
    component: 'MarketPositionStep',
    required: false,
    icon: 'TrendingUp',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'style-values',
    title: 'Style & Values',
    description: 'Visual style and core values',
    component: 'StyleValuesStep',
    required: true,
    icon: 'Palette',
    category: 'Design',
    canSkip: false,
    validation: (value: any) => !value?.primaryColor ? 'Primary color is required' : null,
  },
  {
    id: 'logo-assets',
    title: 'Logo & Assets',
    description: 'Upload your brand assets',
    component: 'LogoAssetsStep',
    required: false,
    icon: 'Image',
    category: 'Assets',
    canSkip: true,
  },
];

interface OnboardingStore extends OnboardingState {
  setAnswer: (stepId: string, value: any) => void;
  skipStep: (stepId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
  validateCurrentStep: () => string | null;
  canProceed: () => boolean;
  canSkipCurrent: () => boolean;
  getCompletionPercentage: () => number;
  getStepStatus: (stepId: string) => 'completed' | 'skipped' | 'current' | 'pending';
  addDynamicStep: (step: StepDef, afterStepId?: string) => void;
  removeDynamicStep: (stepId: string) => void;
  loadFromSupabase: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    persist(
      (set, get) => ({
      steps: DEFAULT_STEPS,
      currentStepIndex: 0,
      answers: demoOnboardingAnswers, // Pre-fill with demo data
      skippedSteps: new Set(),
      isComplete: false,
      dynamicSteps: true,

      setAnswer: (stepId: string, value: any) => {
        set((state) => {
          const newAnswers = { ...state.answers, [stepId]: value };
          
          // Auto-save for authenticated users
          const { mode } = useSessionStore.getState();
          if (mode === 'user') {
            onboardingService.saveAnswers(newAnswers).catch(console.error);
          }
          
          return {
            answers: newAnswers,
            skippedSteps: new Set([...state.skippedSteps].filter(id => id !== stepId))
          };
        }, false, 'setAnswer');
      },

      skipStep: (stepId: string) => {
        set((state) => ({
          skippedSteps: new Set([...state.skippedSteps, stepId])
        }), false, 'skipStep');
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
        console.log('Resetting onboarding store');
        
        // Clear from Supabase for authenticated users
        const { mode } = useSessionStore.getState();
        if (mode === 'user') {
          onboardingService.clearAnswers().catch(console.error);
        }
        
        set({ 
          currentStepIndex: 0, 
          answers: {}, 
          skippedSteps: new Set(),
          isComplete: false 
        }, false, 'reset');
      },

      // Load answers from Supabase when user authenticates
      loadFromSupabase: async () => {
        try {
          const answers = await onboardingService.loadAnswers();
          if (answers) {
            set((state) => ({ ...state, answers }));
          }
        } catch (error) {
          console.error('Failed to load onboarding answers:', error);
        }
      },

      // Sync guest data to Supabase when user authenticates
      syncToSupabase: async () => {
        const state = get();
        if (Object.keys(state.answers).length > 0) {
          try {
            await onboardingService.saveAnswers(state.answers);
          } catch (error) {
            console.error('Failed to sync onboarding data:', error);
          }
        }
      },

      validateCurrentStep: () => {
        const { steps, currentStepIndex, answers, skippedSteps } = get();
        const currentStep = steps[currentStepIndex];
        if (!currentStep) return null;
        
        // Skip validation if step is skipped
        if (skippedSteps.has(currentStep.id)) return null;
        
        const value = answers[currentStep.id];
        return currentStep.validation ? currentStep.validation(value) : null;
      },

      canProceed: () => {
        const { validateCurrentStep } = get();
        return validateCurrentStep() === null;
      },

      canSkipCurrent: () => {
        const { steps, currentStepIndex } = get();
        const currentStep = steps[currentStepIndex];
        return currentStep?.canSkip || false;
      },

      getCompletionPercentage: () => {
        const { steps, answers, skippedSteps } = get();
        const completedSteps = steps.filter(step => 
          answers[step.id] !== undefined || skippedSteps.has(step.id)
        );
        return Math.round((completedSteps.length / steps.length) * 100);
      },

      getStepStatus: (stepId: string) => {
        const { steps, currentStepIndex, answers, skippedSteps } = get();
        const stepIndex = steps.findIndex(step => step.id === stepId);
        const currentStep = steps[currentStepIndex];
        
        if (stepIndex === currentStepIndex) return 'current';
        if (skippedSteps.has(stepId)) return 'skipped';
        if (answers[stepId] !== undefined) return 'completed';
        return 'pending';
      },

      addDynamicStep: (step: StepDef, afterStepId?: string) => {
        set((state) => {
          const steps = [...state.steps];
          if (afterStepId) {
            const insertIndex = steps.findIndex(s => s.id === afterStepId) + 1;
            steps.splice(insertIndex, 0, step);
          } else {
            steps.push(step);
          }
          return { steps };
        }, false, 'addDynamicStep');
      },

      removeDynamicStep: (stepId: string) => {
        set((state) => ({
          steps: state.steps.filter(step => step.id !== stepId)
        }), false, 'removeDynamicStep');
      },
      }),
      {
        name: 'onboarding-store',
        partialize: (state) => ({ 
          answers: state.answers,
          currentStepIndex: state.currentStepIndex,
          skippedSteps: Array.from(state.skippedSteps)
        }),
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.skippedSteps)) {
            state.skippedSteps = new Set(state.skippedSteps);
          }
        }
      }
    ),
    { name: 'onboarding-store' }
  )
);