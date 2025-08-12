import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { brandsService } from '@/features/brand/services/brands.local';
import type { CreateBrandInput } from '@/shared/types/brand';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { answers, isComplete, reset } = useOnboardingStore();

  const createBrandFromAnswers = async (): Promise<void> => {
    console.log('Creating brand from answers:', answers);
    
    const brandInput: CreateBrandInput = {
      name: answers['brand-name'] || 'Untitled Brand',
      logo: answers['logo-upload'],
      primaryColor: answers['primary-color'] || '#000000',
      secondaryColor: answers['secondary-color'],
      fonts: {
        primary: answers['primary-font'] || 'Inter',
        secondary: answers['secondary-font'],
      },
      tone: answers['tone'] || 'Professional',
      audience: answers['audience'] || 'General',
    };

    console.log('Brand input:', brandInput);

    try {
      console.log('Calling brandsService.create with input:', brandInput);
      const brand = await brandsService.create(brandInput);
      console.log('Brand created successfully:', brand);
      reset(); // Clear onboarding data
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create brand:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const goToPreview = () => {
    navigate('/brand/preview');
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return {
    answers,
    isComplete,
    createBrandFromAnswers,
    goToPreview,
    goToDashboard,
  };
}