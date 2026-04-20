/**
 * createBrandFromAnswers
 *
 * Standalone utility layer over services.brands.create. Keeps the hook
 * (useOnboardingFlow) and the v3 adapter below working off the same
 * underlying call site without requiring a React context.
 */

import { services } from '@/shared/services/registry';
import type { CreateBrandInput, Brand } from '@/shared/types/brand';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';
import type {
  OnboardingAsset,
  DefineAnswers,
  FeelPalette,
  FeelStyle,
} from '@/features/onboarding-v3/types';

// ---------------------------------------------------------------------------
// Core helper — thin wrapper so tests and the adapter both have a named target.
// ---------------------------------------------------------------------------

export async function createBrandFromAnswers(
  input: CreateBrandInput,
): Promise<Brand> {
  return services.brands.create(input);
}

// ---------------------------------------------------------------------------
// v3 adapter public types
// ---------------------------------------------------------------------------

export interface OnboardingV3ImportInput {
  mode: 'import';
  define: DefineAnswers;
  assets: OnboardingAsset[];
}

export interface OnboardingV3GenerateInput {
  mode: 'generate';
  define: DefineAnswers;
  feel: {
    styles: FeelStyle[];
    selectedStyleId: string | null;
    palettes: FeelPalette[];
    selectedPaletteId: string | null;
  };
  chosenVariation: GeneratedBrand;
}

export type OnboardingV3Input = OnboardingV3ImportInput | OnboardingV3GenerateInput;

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export async function createBrandFromOnboardingV3(
  input: OnboardingV3Input,
): Promise<{ brandId: string; slug: string }> {
  if (input.mode === 'import') {
    // Import flow: no AI-generated palette/style — use neutral defaults.
    const answers: CreateBrandInput = {
      name: input.define.name,
      primaryColor: '#000000',
      fonts: {
        primary: 'Inter',
        secondary: 'Roboto',
      },
      tone: input.define.values || 'Professional',
      audience: input.define.audience,
    };

    const brand = await createBrandFromAnswers(answers);
    return { brandId: brand.id, slug: brand.slug };
  }

  // Generate flow: map the chosen AI variation + feel selection.
  const chosen: GeneratedBrand = input.chosenVariation;

  // Resolve the selected palette, falling back to the chosen variation's
  // built-in colors when nothing is selected.
  const palette: FeelPalette | undefined = input.feel.palettes.find(
    (p) => p.id === input.feel.selectedPaletteId,
  );

  const primaryColor: string =
    (palette ? palette.colors[0] : null) ?? chosen.colors.primary;
  const secondaryColor: string =
    (palette ? palette.colors[1] : null) ?? chosen.colors.secondary;

  // Resolve tone from the chosen style's mood keywords, falling back to the
  // variation's voice tone.
  const style: FeelStyle | undefined = input.feel.styles.find(
    (s) => s.id === input.feel.selectedStyleId,
  );
  const tone: string =
    (style ? style.moodKeywords[0] : null) ?? chosen.voice.tone;

  const answers: CreateBrandInput = {
    name: input.define.name,
    primaryColor,
    secondaryColor,
    fonts: {
      primary: chosen.fonts.heading,
      secondary: chosen.fonts.body,
    },
    tone,
    audience: input.define.audience || chosen.audience.shortDescription,
  };

  const brand = await createBrandFromAnswers(answers);
  return { brandId: brand.id, slug: brand.slug };
}
