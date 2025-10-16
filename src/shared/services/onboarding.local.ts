/**
 * Local Storage Onboarding Service
 * Used in development mode to store onboarding data in localStorage
 */

type OnboardingAnswers = Record<string, any>;

const STORAGE_KEY = 'onboarding_answers';
const COMPLETION_KEY = 'onboarding_completed';

export interface OnboardingService {
  saveAnswers(answers: OnboardingAnswers): Promise<void>;
  loadAnswers(): Promise<OnboardingAnswers | null>;
  markCompleted(): Promise<void>;
  clearAnswers(): Promise<void>;
}

export class LocalOnboardingService implements OnboardingService {
  async saveAnswers(answers: OnboardingAnswers): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
      console.log('💾 Saved onboarding answers to localStorage');
    } catch (error) {
      console.error('Failed to save onboarding answers:', error);
      throw error;
    }
  }

  async loadAnswers(): Promise<OnboardingAnswers | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load onboarding answers:', error);
      return null;
    }
  }

  async markCompleted(): Promise<void> {
    try {
      localStorage.setItem(COMPLETION_KEY, 'true');
      console.log('✅ Marked onboarding as completed in localStorage');
    } catch (error) {
      console.error('Failed to mark onboarding as completed:', error);
      throw error;
    }
  }

  async clearAnswers(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMPLETION_KEY);
      console.log('🗑️ Cleared onboarding data from localStorage');
    } catch (error) {
      console.error('Failed to clear onboarding answers:', error);
      throw error;
    }
  }
}

export const localOnboardingService = new LocalOnboardingService();
