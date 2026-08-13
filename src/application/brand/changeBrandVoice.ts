/**
 * Application use-case: change a brand's voice tone (Batch A3).
 *
 * `tone` is the only user-editable voice field today; the canonical `Voice`
 * unifies the legacy three-way split (`tone` scalar / `guidelines.voiceAndTone` /
 * rendered `tone`). `toLegacyBrandPatch` projects `voice.tone` back to the legacy
 * `tone` scalar one-way. Rich voice (do/don't/examples) has no editor yet — a
 * real editor would be net-new, not a migration.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';

export async function changeBrandVoiceTone(
  repo: BrandRepository,
  brandId: string,
  tone: string,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandVoiceTone: brand not found: ${brandId}`);

  const next: CanonicalBrand = withCoreWrites(
    {
      ...brand,
      identity: { ...brand.identity, voice: { ...brand.identity.voice, tone } },
    },
    ['voice.tone'],
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
