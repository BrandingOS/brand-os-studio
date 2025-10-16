import { supabase } from '@/integrations/supabase/client';
import { isDevMode } from '@/config/devMode';
import { localOnboardingService } from './onboarding.local';

type OnboardingAnswers = Record<string, any>;

export interface OnboardingService {
  saveAnswers(answers: OnboardingAnswers): Promise<void>;
  loadAnswers(): Promise<OnboardingAnswers | null>;
  markCompleted(): Promise<void>;
  clearAnswers(): Promise<void>;
}

export class SupabaseOnboardingService implements OnboardingService {
  async saveAnswers(answers: OnboardingAnswers): Promise<void> {
    // In dev mode, use localStorage
    if (isDevMode()) {
      return localOnboardingService.saveAnswers(answers);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No Supabase user found, skipping save');
      return;
    }

    const { error } = await supabase
      .from('onboarding_answers')
      .upsert({
        user_id: user.id,
        answers,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async loadAnswers(): Promise<OnboardingAnswers | null> {
    // In dev mode, use localStorage
    if (isDevMode()) {
      return localOnboardingService.loadAnswers();
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return (data?.answers as OnboardingAnswers) || null;
  }

  async markCompleted(): Promise<void> {
    // In dev mode, use localStorage
    if (isDevMode()) {
      return localOnboardingService.markCompleted();
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No Supabase user found, skipping completion');
      return;
    }

    const { error } = await supabase
      .from('onboarding_answers')
      .upsert({
        user_id: user.id,
        completed: true,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async clearAnswers(): Promise<void> {
    // In dev mode, use localStorage
    if (isDevMode()) {
      return localOnboardingService.clearAnswers();
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No Supabase user found, skipping clear');
      return;
    }

    const { error } = await supabase
      .from('onboarding_answers')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }
}

export const onboardingService = new SupabaseOnboardingService();