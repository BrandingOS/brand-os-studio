import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { services } from '@/shared/services/registry';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { storageService } from '@/shared/services/storage.supabase';
import type { CreateBrandInput, Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import { stageLogoAssignment } from '@/shared/assets/assetOperations';
import { compressLogo } from '@/shared/utils/imageUpload';

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

      // Route every uploaded logo through the v3 unified pipeline so
      // the new brand starts life with a canonical logoSystem + a
      // single, de-duplicated brandAssets[] list. Accumulates patches
      // locally and applies one merged update.
      //
      // Onboarding slot → v3 LogoRole mapping. Slots without a clean
      // v3 role (horizontal/vertical) are applied as `secondary` so
      // no upload is silently dropped.
      const ROLE_MAP: Record<string, LogoRole> = {
        primary: 'primary',
        black: 'mono.black',
        white: 'mono.white',
        icon: 'iconmark',
        horizontal: 'horizontal',
        vertical: 'stacked',
      };

      let workingBrand: Brand = brand;
      for (const [key, logoData] of Object.entries(logoAssets)) {
        if (
          !logoData ||
          typeof logoData !== 'object' ||
          !('file' in logoData) ||
          !(logoData.file instanceof File)
        ) continue;
        const role = ROLE_MAP[key];
        if (!role) continue;

        try {
          // Compress to a stable data URL (blob: URLs die on reload).
          const dataUrl = await compressLogo(logoData.file);
          const { patch } = stageLogoAssignment(workingBrand, {
            url: dataUrl,
            kind: 'logo',
            name: `${brandName} — ${key}`,
            role,
            originalName: logoData.file.name,
            file: { size: logoData.file.size, mime: logoData.file.type },
          });
          workingBrand = { ...workingBrand, ...patch };
        } catch (err) {
          console.error(`[onboarding] logo ${key} compression failed`, err);
        }
      }

      // Apply the merged v3 patch (brandAssets + logoSystem + legacy
      // mirrors) in a single write.
      const hasAssets = workingBrand.brandAssets && workingBrand.brandAssets.length > 0;
      if (hasAssets) {
        await services.brands.update(brand.id, {
          brandAssets: workingBrand.brandAssets,
          logoSystem: workingBrand.logoSystem,
          logo: workingBrand.logo,
          logoAssets: workingBrand.logoAssets,
        });
      }

      // Best-effort mirror to Supabase Storage for users on the paid
      // stack — produces durable public URLs. Errors are non-fatal;
      // the data-URL-backed v3 assets already work.
      for (const [key, logoData] of Object.entries(logoAssets)) {
        if (
          logoData &&
          typeof logoData === 'object' &&
          'file' in logoData &&
          logoData.file instanceof File &&
          ROLE_MAP[key]
        ) {
          try {
            await storageService.uploadLogo(
              brand.id,
              key as 'primary' | 'black' | 'white' | 'icon' | 'horizontal' | 'vertical',
              logoData.file,
            );
          } catch {
            // Non-fatal — v3 assets already saved above.
          }
        }
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
