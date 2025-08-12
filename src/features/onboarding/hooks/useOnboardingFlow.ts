import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { useNavigate } from 'react-router-dom';
import type { CreateBrandInput } from '@/shared/types/brand';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { answers, isComplete, reset } = useOnboardingStore();
  const { create: createBrand } = useBrandStore();

  const createBrandFromAnswers = async (): Promise<void> => {
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

    try {
      const brand = await createBrand(brandInput);
      reset(); // Clear onboarding data
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create brand:', error);
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