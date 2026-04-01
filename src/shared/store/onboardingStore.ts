import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { StepDef, OnboardingState } from '../types/onboarding';
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
    description: 'Tell us about your audience',
    component: 'TargetAudienceStep',
    required: false,
    icon: 'Users',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'brand-personality',
    title: 'Brand Personality',
    description: 'Define your brand character',
    component: 'BrandPersonalityStep',
    required: false,
    icon: 'Heart',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'business-goals',
    title: 'Business Goals',
    description: 'Set your objectives',
    component: 'BusinessGoalsStep',
    required: false,
    icon: 'Target',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'market-position',
    title: 'Market Position',
    description: 'Define your competitive space',
    component: 'MarketPositionStep',
    required: false,
    icon: 'TrendingUp',
    category: 'Strategy',
    canSkip: true,
  },
  {
    id: 'style-values',
    title: 'Style & Values',
    description: 'Colors and visual style',
    component: 'StyleValuesStep',
    required: false,
    icon: 'Palette',
    category: 'Design',
    canSkip: true,
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
      answers: {},
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
        const { steps, currentStepIndex, answers } = get();
        const currentStep = steps[currentStepIndex];
        
        // Don't allow skipping if no brand name is entered yet
        const brandName = answers['company-basics']?.brandName?.trim();
        if (!brandName) {
          return false;
        }
        
        // Don't allow skipping the first step (company-basics) since brand name is required
        if (currentStep?.id === 'company-basics') {
          return false;
        }
        
        return currentStep?.canSkip || false;
      },

      getCompletionPercentage: () => {
        const { steps, currentStepIndex, answers, skippedSteps } = get();
        const completedOrVisited = steps.filter((step, index) =>
          index < currentStepIndex || answers[step.id] !== undefined || skippedSteps.has(step.id)
        );
        return Math.round((completedOrVisited.length / steps.length) * 100);
      },

      getStepStatus: (stepId: string) => {
        const { steps, currentStepIndex, answers, skippedSteps } = get();
        const stepIndex = steps.findIndex(step => step.id === stepId);

        if (stepIndex === currentStepIndex) return 'current';
        if (skippedSteps.has(stepId)) return 'skipped';
        if (answers[stepId] !== undefined) return 'completed';
        // Past steps with no answers were implicitly skipped
        if (stepIndex < currentStepIndex) return 'skipped';
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
          if (state) {
            // Convert skippedSteps array back to Set
            if (Array.isArray(state.skippedSteps)) {
              state.skippedSteps = new Set(state.skippedSteps);
            }
            // Ensure currentStepIndex is valid
            if (state.currentStepIndex >= DEFAULT_STEPS.length) {
              state.currentStepIndex = 0;
            }
          }
        }
      }
    ),
    { name: 'onboarding-store' }
  )
);