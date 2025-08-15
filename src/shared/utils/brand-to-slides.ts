import type { Brand } from '@/shared/types/brand';
import type { GuidelineSlide } from '@/features/guidelines/types/guidelines';

/**
 * Convert Brand data into a sequence of guideline slides.
 */
export function brandToSlides(brand: Brand): GuidelineSlide[] {
  const slides: GuidelineSlide[] = [];

  // Cover slide
  slides.push({
    id: 'cover',
    type: 'cover',
    title: 'Cover',
    content: { pageNumber: slides.length + 1 },
    order: slides.length,
    enabled: true,
  });

  // Strategy slide
  if (brand.guidelines?.strategy) {
    slides.push({
      id: 'strategy',
      type: 'strategy',
      title: 'Brand Strategy',
      content: {
        mission: brand.guidelines.strategy.mission,
        vision: brand.guidelines.strategy.vision,
        values: brand.guidelines.strategy.values,
        pageNumber: slides.length + 1,
      },
      order: slides.length,
      enabled: true,
    });
  }

  // Logos slide
  if (brand.guidelines?.logoSystem) {
    slides.push({
      id: 'logos',
      type: 'logos',
      title: 'Logo System',
      content: {
        primary: brand.guidelines.logoSystem.primary,
        secondary: brand.guidelines.logoSystem.secondary,
        pageNumber: slides.length + 1,
      },
      order: slides.length,
      enabled: true,
    });
  }

  // Colors slide
  if (brand.guidelines?.colorPalette) {
    slides.push({
      id: 'colors',
      type: 'colors',
      title: 'Color Palette',
      content: {
        primary: brand.guidelines.colorPalette.primary,
        secondary: brand.guidelines.colorPalette.secondary,
        pageNumber: slides.length + 1,
      },
      order: slides.length,
      enabled: true,
    });
  }

  // Typography slide
  if (brand.guidelines?.typography) {
    slides.push({
      id: 'typography',
      type: 'typography',
      title: 'Typography',
      content: {
        primary: brand.guidelines.typography.primary,
        secondary: brand.guidelines.typography.secondary,
        pageNumber: slides.length + 1,
      },
      order: slides.length,
      enabled: true,
    });
  }

  // Additional slides (voice, iconography, etc.) can be appended similarly.

  return slides;
}
