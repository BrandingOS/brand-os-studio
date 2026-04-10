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
    if (!isAuthenticated) {
      navigate('/?auth=required');
      return;
    }

    // Read from both new and legacy step IDs
    const basics = answers['brand-basics'] || answers['company-basics'] || answers['brand-info'] || {};
    const audience = answers['audience-market'] || answers['target-audience'] || {};
    const personality = answers['brand-personality'] || answers['brand-profile'] || {};
    const visuals = answers['visual-preferences'] || answers['style-values'] || {};
    const logoAssets = answers['logo-assets'] || answers['upload-assets'] || {};

    const brandName = basics.brandName || basics.name || 'Untitled Brand';
    const primaryColor = visuals.customColors?.[0] || visuals.primaryColor || '#000000';
    const secondaryColor = visuals.customColors?.[1] || visuals.secondaryColor;
    const tone = personality.tone || 'Professional';
    const audienceStr = typeof audience === 'string'
      ? audience
      : audience.description || (Array.isArray(audience) ? audience.join(', ') : 'General');

    try {
      // Build comprehensive guidelines from wizard answers
      const guidelines: Record<string, any> = {};

      // Strategy from personality + basics
      if (personality.values || personality.traits || basics.description) {
        guidelines.strategy = {
          mission: basics.description || '',
          values: personality.values || [],
          personality: personality.traits || [],
          positioning: audience.pricePoint ? `${audience.pricePoint} market positioning` : '',
          targetAudience: audienceStr,
        };
      }

      // Color palette from visual preferences
      if (primaryColor) {
        guidelines.colorPalette = {
          primary: { hex: primaryColor, name: 'Primary', rgb: '', cmyk: '', usage: 'Primary brand color' },
          ...(secondaryColor ? {
            secondary: { hex: secondaryColor, name: 'Secondary', rgb: '', cmyk: '', usage: 'Secondary brand color' },
          } : {}),
        };
      }

      // Voice and tone from personality
      if (personality.tone || personality.voice) {
        guidelines.voiceAndTone = {
          voice: personality.voice || '',
          toneAttributes: personality.tone ? [personality.tone] : [],
        };
      }

      const brandInput: CreateBrandInput = {
        name: brandName,
        primaryColor,
        secondaryColor,
        fonts: {
          primary: logoAssets.fonts?.primary || 'Inter',
          secondary: logoAssets.fonts?.secondary || 'Roboto',
        },
        tone,
        audience: audienceStr,
        ...(Object.keys(guidelines).length > 0 ? { guidelines } : {}),
      };

      const brand = await services.brands.create(brandInput);

      // Upload logo assets to storage with proper folder structure
      const logoUploadPromises: Promise<any>[] = [];

      const logoTypeMap: Record<string, 'primary' | 'black' | 'white' | 'vertical' | 'icon' | 'horizontal'> = {
        primary: 'primary', black: 'black', white: 'white',
        vertical: 'vertical', icon: 'icon', horizontal: 'horizontal',
      };

      for (const [key, logoData] of Object.entries(logoAssets)) {
        if (logoData && typeof logoData === 'object' && 'file' in logoData && logoData.file instanceof File && logoTypeMap[key]) {
          const uploadPromise = storageService.uploadLogo(
            brand.id, logoTypeMap[key], logoData.file,
          ).then(result => ({ type: key, url: result.url }))
           .catch(() => null);
          logoUploadPromises.push(uploadPromise);
        }
      }

      const uploadResults = await Promise.all(logoUploadPromises);
      const primaryLogoResult = uploadResults.find(r => r?.type === 'primary');

      if (primaryLogoResult?.url) {
        await services.brands.update(brand.id, { logo: primaryLogoResult.url });
      }

      reset();

      // Land the new user directly in Identity — the most actionable next step.
      setTimeout(() => {
        navigate(`/b/${brand.slug}/identity`);
      }, 100);
    } catch (error) {
      console.error('Failed to create brand:', error);
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
