import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { brandsService } from '@/features/brand/services/brands.local';
import type { CreateBrandInput } from '@/shared/types/brand';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { answers, isComplete, reset } = useOnboardingStore();

  const createBrandFromAnswers = async (): Promise<void> => {
    console.log('Creating brand from answers:', answers);
    
    const companyBasics = answers['company-basics'] || {};
    const styleValues = answers['style-values'] || {};
    const brandPersonality = answers['brand-personality'] || {};
    const targetAudience = answers['target-audience'] || [];
    const logoAssets = answers['logo-assets'] || {};
    
    const brandInput: CreateBrandInput = {
      name: companyBasics.brandName || 'Untitled Brand',
      logo: logoAssets.primaryLogo,
      primaryColor: styleValues.primaryColor || '#000000',
      secondaryColor: styleValues.secondaryColor,
      fonts: {
        primary: 'Inter',
        secondary: 'Roboto',
      },
      tone: brandPersonality.tone || 'Professional',
      audience: targetAudience.length > 0 ? targetAudience.join(', ') : 'General',
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
    navigate('/onboarding/preview');
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