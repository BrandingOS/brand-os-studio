/**
 * Official Brand Kit adoptions — authenticated implementation
 * (`public.brand_kit_adoptions`, migration 017).
 *
 * The row is a reference plus adoption metadata; the adopted material is never
 * copied here. `adopted_by` is additionally self-attributed by RLS, so an
 * adoption cannot be credited to another user even if a client tried.
 *
 * Degrades to the local implementation when the table is not deployed yet,
 * matching every other adapter in this codebase.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  assertAdoptable,
  type AdoptInput,
  type AdoptTargetKind,
  type IKitAdoptionService,
  type KitAdoption,
} from '@/core/services/IKitAdoptionService';
import { LocalKitAdoptionService } from './LocalKitAdoptionService';

// Generated types predate 017 — same untyped accessor used elsewhere.
const table = () => (supabase as any).from('brand_kit_adoptions');

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapRow(r: any): KitAdoption {
  return {
    id: r.id,
    brandId: r.brand_id,
    targetKind: r.target_kind,
    targetRef: r.target_ref,
    adoptedBy: r.adopted_by,
    adoptedAt: r.adopted_at,
    ...(r.note ? { note: r.note } : {}),
  };
}

export class SupabaseKitAdoptionService implements IKitAdoptionService {
  private readonly local = new LocalKitAdoptionService();

  /** Local brand ids (dev-bypass) can never satisfy a uuid column. */
  private isLocalBrand(brandId: string): boolean {
    return !UUID.test(brandId);
  }

  async list(brandId: string): Promise<KitAdoption[]> {
    if (this.isLocalBrand(brandId)) return this.local.list(brandId);

    const { data, error } = await table()
      .select('*')
      .eq('brand_id', brandId)
      .order('adopted_at', { ascending: true });

    if (error) {
      // An empty Kit is the truthful answer for a real brand whose table is not
      // deployed; local rows for such a brand should not exist (adopt refuses).
      if (isMissingTable(error)) return [];
      throw error;
    }
    return (data ?? []).map(mapRow);
  }

  async adopt(input: AdoptInput): Promise<KitAdoption> {
    assertAdoptable(input);
    // A dev-bypass brand has no server row at all, so local IS its home.
    if (this.isLocalBrand(input.brandId)) return this.local.adopt(input);

    // Adopting twice is not an error; it is already adopted — and the FIRST
    // adoption is the one that happened, so its adopter, timestamp and note
    // must survive a second attempt.
    //
    // The upsert cannot express that. Its conflict branch is an UPDATE, and
    // migration 017 deliberately grants no UPDATE policy on this table (an
    // adoption is a decision, not an editable row), so a second adopter got an
    // RLS error rather than the existing record. `LocalKitAdoptionService`
    // returns the existing row for exactly this case; reading first makes the
    // two implementations agree.
    const existing = await table()
      .select('*')
      .eq('brand_id', input.brandId)
      .eq('target_kind', input.targetKind)
      .eq('target_ref', input.targetRef)
      .maybeSingle();
    if (!existing.error && existing.data) return mapRow(existing.data);

    const { data, error } = await table()
      .insert({
        brand_id: input.brandId,
        target_kind: input.targetKind,
        target_ref: input.targetRef,
        adopted_by: input.actor.userId,
        ...(input.note ? { note: input.note } : {}),
      })
      .select()
      .single();

    if (error) {
      // Do NOT fall back to localStorage for a real brand. Once migration 017
      // lands, `list` reads the database and the local row becomes invisible —
      // the user would be told the item is officially adopted while the Kit
      // shows nothing. Failing loudly is the honest outcome for a write that
      // must be durable and attributable.
      if (isMissingTable(error)) {
        throw new Error(
          '[SupabaseKitAdoptionService] Cannot record this adoption: migration 017 ' +
            '(brand_kit_adoptions) is not deployed. Refusing to store it locally, ' +
            'where it would be silently hidden once the table exists.',
        );
      }
      throw error;
    }
    return mapRow(data);
  }

  async unadopt(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<void> {
    if (this.isLocalBrand(brandId)) return this.local.unadopt(brandId, targetKind, targetRef);

    const { error } = await table()
      .delete()
      .eq('brand_id', brandId)
      .eq('target_kind', targetKind)
      .eq('target_ref', targetRef);

    if (error && !isMissingTable(error)) throw error;
  }

  async isAdopted(
    brandId: string,
    targetKind: AdoptTargetKind,
    targetRef: string,
  ): Promise<boolean> {
    if (this.isLocalBrand(brandId)) return this.local.isAdopted(brandId, targetKind, targetRef);

    const { data, error } = await table()
      .select('id')
      .eq('brand_id', brandId)
      .eq('target_kind', targetKind)
      .eq('target_ref', targetRef)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return false;
      throw error;
    }
    return Boolean(data);
  }
}
