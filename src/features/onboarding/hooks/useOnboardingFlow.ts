import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { services } from '@/shared/services/registry';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { CreateBrandInput } from '@/shared/types/brand';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { answers, isComplete, reset } = useOnboardingStore();
  const { isAuthenticated } = useAuth();

  const createBrandFromAnswers = async (): Promise<void> => {
    // Check if user is authenticated before creating brand
    if (!isAuthenticated) {
      navigate('/?auth=required');
      return;
    }

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
      console.log('Calling services.brands.create with input:', brandInput);
      const brand = await services.brands.create(brandInput);
      console.log('Brand created successfully:', brand);
      reset(); // Clear onboarding data
      // Navigate to dashboard after successful creation
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
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