import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { services } from '@/shared/services/registry';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { storageService } from '@/shared/services/storage.supabase';
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

    try {
      // First create the brand to get the brand ID
      const brandInput: CreateBrandInput = {
        name: companyBasics.brandName || 'Untitled Brand',
        primaryColor: styleValues.primaryColor || '#000000',
        secondaryColor: styleValues.secondaryColor,
        fonts: {
          primary: 'Inter',
          secondary: 'Roboto',
        },
        tone: brandPersonality.tone || 'Professional',
        audience: targetAudience.length > 0 ? targetAudience.join(', ') : 'General',
      };

      console.log('Creating brand with input:', brandInput);
      const brand = await services.brands.create(brandInput);
      console.log('Brand created successfully:', brand);

      // Upload logo assets to storage with proper folder structure
      const logoUploadPromises: Promise<any>[] = [];
      
      const logoTypeMap: Record<string, 'primary' | 'black' | 'white' | 'vertical' | 'icon' | 'horizontal'> = {
        primary: 'primary',
        black: 'black',
        white: 'white',
        vertical: 'vertical',
        icon: 'icon',
        horizontal: 'horizontal',
      };

      // Upload all logo variants
      for (const [key, logoData] of Object.entries(logoAssets)) {
        if (logoData && typeof logoData === 'object' && 'file' in logoData && logoData.file instanceof File && logoTypeMap[key]) {
          const uploadPromise = storageService.uploadLogo(
            brand.id,
            logoTypeMap[key],
            logoData.file
          ).then(result => {
            console.log(`Uploaded ${key} logo:`, result.url);
            return { type: key, url: result.url };
          }).catch(error => {
            console.error(`Failed to upload ${key} logo:`, error);
            return null;
          });
          
          logoUploadPromises.push(uploadPromise);
        }
      }

      // Wait for all uploads to complete
      const uploadResults = await Promise.all(logoUploadPromises);
      const primaryLogoResult = uploadResults.find(r => r?.type === 'primary');

      // Update brand with primary logo URL if uploaded
      if (primaryLogoResult?.url) {
        await services.brands.update(brand.id, { logo: primaryLogoResult.url });
        console.log('Updated brand with primary logo URL');
      }

      reset(); // Clear onboarding data
      
      // Navigate to dashboard after successful creation
      setTimeout(() => {
        navigate(`/dashboard/brand/${brand.slug}`);
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