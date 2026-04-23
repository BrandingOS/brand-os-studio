/**
 * typescaleMaterializer — claim a public-mode session as a real brand.
 *
 * Called by the platform's claim.ts after signup. Turns the saved
 * Typescale payload into a CreateBrandInput + a follow-up patch that
 * carries the full structured typescale + mirrored typography.
 */
import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import type { Materializer } from '../core';
import { registerMaterializer } from '../core';
import { mirrorTypographyFromTypescale } from '@/shared/store/brandStore';
import type { TypescaleSessionPayload } from './hooks/useTypescaleDraft';

export const typescaleMaterializer: Materializer<TypescaleSessionPayload> = (session) => {
  const { typescale } = session.payload;
  const typography = mirrorTypographyFromTypescale(undefined, typescale);

  const brandName = 'My Typescale';
  const primaryColor = '#0F172A';
  const fontPrimary = typescale.fonts.heading.family;

  const create: CreateBrandInput = {
    name: brandName,
    primaryColor,
    fonts: { primary: fontPrimary },
    tone: 'Professional',
    audience: 'General',
  };

  const patch: Partial<Brand> = {
    typescale,
    typography,
  };

  return { create, patch };
};

// Side effect: register on import. Tool's barrel imports this file so
// the platform discovers the materializer without explicit wiring.
registerMaterializer<TypescaleSessionPayload>('typescale', typescaleMaterializer);
