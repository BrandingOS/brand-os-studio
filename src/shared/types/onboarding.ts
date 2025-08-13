export interface StepDef {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  icon: string;
  category: string;
  canSkip: boolean;
  skippedByDefault?: boolean;
  validation?: (value: any) => string | null;
}

export interface OnboardingAnswer {
  stepId: string;
  value: any;
  completedAt?: Date;
}

export interface OnboardingState {
  steps: StepDef[];
  currentStepIndex: number;
  answers: Record<string, any>;
  skippedSteps: Set<string>;
  isComplete: boolean;
  dynamicSteps: boolean;
}