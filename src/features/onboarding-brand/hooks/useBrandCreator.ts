import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { services } from '@/shared/services/registry';
import type { CreateBrandInput } from '@/shared/types/brand';
import type { GeneratedBrand } from '../types';

function brandToCreateInput(brand: GeneratedBrand): CreateBrandInput {
  return {
    name: brand.name,
    primaryColor: brand.colors.primary,
    secondaryColor: brand.colors.secondary,
    fonts: {
      primary: brand.fonts.heading,
      secondary: brand.fonts.body,
    },
    tone: brand.voice.tone,
    audience: brand.audience.shortDescription,
  };
}

function buildGuidelines(brand: GeneratedBrand): Record<string, unknown> {
  return {
    strategy: {
      mission: brand.description,
      values: brand.personality.values,
      personality: brand.voice.traits,
      positioning: `${brand.audience.pricePoint} market positioning`,
      targetAudience: brand.audience.shortDescription,
    },
    colorPalette: {
      primary: {
        hex: brand.colors.primary,
        name: 'Primary',
        rgb: '',
        cmyk: '',
        usage: 'Primary brand color',
      },
      secondary: {
        hex: brand.colors.secondary,
        name: 'Secondary',
        rgb: '',
        cmyk: '',
        usage: 'Secondary brand color',
      },
      accent: {
        hex: brand.colors.accent,
        name: 'Accent',
        rgb: '',
        cmyk: '',
        usage: 'Accent color',
      },
    },
    voiceAndTone: {
      voice: brand.voice.traits.join(', '),
      toneAttributes: [brand.voice.tone, ...brand.voice.traits],
    },
  };
}

export function useBrandCreator() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const createBrand = useCallback(
    async (brand: GeneratedBrand): Promise<{ slug: string } | null> => {
      setIsSaving(true);
      try {
        const input = {
          ...brandToCreateInput(brand),
          guidelines: buildGuidelines(brand),
        } as CreateBrandInput & { guidelines: Record<string, unknown> };

        const created = await services.brands.create(input);
        toast.success('Brand created!');
        return { slug: created.slug };
      } catch (err) {
        console.error('Failed to create brand:', err);
        toast.error(
          err instanceof Error ? err.message : 'Failed to create brand',
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const goToBrand = useCallback(
    (slug: string) => {
      window.setTimeout(() => navigate(`/b/${slug}/identity`), 120);
    },
    [navigate],
  );

  return { createBrand, goToBrand, isSaving };
}
