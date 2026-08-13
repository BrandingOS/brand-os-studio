/**
 * Brand Context v1 — authenticated implementation
 * (`public.brand_context_signals`, migration 017).
 *
 * Same contract, same silence: `record` swallows failures so a signal can never
 * interrupt the user. Falls back to the local implementation for a missing
 * table or a non-uuid (dev-bypass) brand id, like every other adapter here.
 *
 * Server-side signals are uncapped — the localStorage ring buffer exists for
 * quota, which a table does not have.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ContextQuery,
  ContextSignal,
  ContextSummary,
  IBrandContextService,
  NewContextSignal,
} from '@/core/services/IBrandContextService';
import { LocalBrandContextService, summarizeSignals } from './LocalBrandContextService';

const table = () => (supabase as any).from('brand_context_signals');

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Newest signals considered by `summarize`. Note the consequence:
 * `signalCount` then reports the window, not the lifetime total. That is the
 * right trade — the summary is about current preferences, not history size.
 */
const SUMMARY_WINDOW = 500;

function mapRow(r: any): ContextSignal {
  return {
    id: r.id,
    brandId: r.brand_id,
    kind: r.kind,
    targetKind: r.target_kind ?? undefined,
    targetRef: r.target_ref ?? undefined,
    value: r.value ?? undefined,
    source: r.source,
    createdAt: r.created_at,
  };
}

export class SupabaseBrandContextService implements IBrandContextService {
  private readonly local = new LocalBrandContextService();

  private isLocalBrand(brandId: string): boolean {
    return !UUID.test(brandId);
  }

  async record(signal: NewContextSignal): Promise<void> {
    if (this.isLocalBrand(signal.brandId)) return this.local.record(signal);
    try {
      const { error } = await table().insert({
        brand_id: signal.brandId,
        kind: signal.kind,
        target_kind: signal.targetKind ?? null,
        target_ref: signal.targetRef ?? null,
        value: signal.value ?? null,
        source: signal.source,
      });
      if (error && isMissingTable(error)) await this.local.record(signal);
    } catch {
      // Silent by contract.
    }
  }

  async list(brandId: string, q: ContextQuery = {}): Promise<ContextSignal[]> {
    if (this.isLocalBrand(brandId)) return this.local.list(brandId, q);

    let query = table().select('*').eq('brand_id', brandId);
    if (q.kind?.length) query = query.in('kind', q.kind);
    if (q.targetKind) query = query.eq('target_kind', q.targetKind);
    query = query.order('created_at', { ascending: false });
    if (q.limit) query = query.limit(q.limit);

    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error)) return this.local.list(brandId, q);
      throw error;
    }
    return (data ?? []).map(mapRow);
  }

  async remove(id: string): Promise<void> {
    // `record` and `list` fall back to local storage for a non-uuid brand or a
    // missing table, so signals genuinely live there and are visible through
    // `list`. Deleting only server-side would make those undeletable, breaking
    // the "inspectable AND correctable" promise. Signal ids are unique, so
    // attempting both is safe.
    const { error } = await table().delete().eq('id', id);
    if (error && !isMissingTable(error)) throw error;
    await this.local.remove(id);
  }

  async summarize(brandId: string): Promise<ContextSummary> {
    // BOUNDED. Server-side signals are uncapped and grow with every favourite,
    // dislike, reference and approval, so an unbounded read would transfer the
    // whole history on every call and degrade over a brand's life. The rule is
    // "latest signal per target wins", so a newest-first window yields the same
    // answer for every target seen recently.
    return summarizeSignals(await this.list(brandId, { limit: SUMMARY_WINDOW }));
  }
}
