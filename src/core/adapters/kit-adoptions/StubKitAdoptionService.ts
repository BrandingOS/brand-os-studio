/**
 * Phase 0 placeholder for the Official Brand Kit adoption service.
 *
 * The DI contract and the `core_value` guard land now so consumers can be typed
 * against a stable interface; the real local and Supabase implementations arrive
 * with the Official Kit phase and REPLACE this file's registration in boot.ts.
 *
 * Reads return empty (a brand has adopted nothing yet). Writes throw loudly
 * rather than silently pretending to succeed — nothing calls them in the current
 * phase, and a silent no-op would be indistinguishable from a real adoption
 * failing, which is exactly the class of bug the Official Kit exists to prevent.
 */
import {
  assertAdoptable,
  type AdoptInput,
  type AdoptTargetKind,
  type IKitAdoptionService,
  type KitAdoption,
} from '@/core/services/IKitAdoptionService';

const NOT_YET =
  '[KitAdoptionService] Not implemented yet — the Official Brand Kit phase ' +
  'replaces this Phase 0 stub with the local/Supabase implementations.';

export class StubKitAdoptionService implements IKitAdoptionService {
  async list(_brandId: string): Promise<KitAdoption[]> {
    return [];
  }

  async adopt(input: AdoptInput): Promise<KitAdoption> {
    // The core_value rule is enforced even by the stub so it can never drift.
    assertAdoptable(input);
    throw new Error(NOT_YET);
  }

  async unadopt(
    _brandId: string,
    _targetKind: AdoptTargetKind,
    _targetRef: string,
  ): Promise<void> {
    throw new Error(NOT_YET);
  }

  async isAdopted(
    _brandId: string,
    _targetKind: AdoptTargetKind,
    _targetRef: string,
  ): Promise<boolean> {
    return false;
  }
}
