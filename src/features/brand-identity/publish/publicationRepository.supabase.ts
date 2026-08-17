/**
 * Server-backed publications (`public.brand_identity_publications`, 023).
 *
 * The only implementation whose links actually travel. It degrades the way
 * 015 / 017 / 018 do: with the table absent, every operation falls through to
 * the browser-local repository, so shipping this ahead of the migration
 * changes nothing for anyone — the Publish control keeps working and simply
 * reports that the link does not leave this browser.
 *
 * That fallback is also what makes the down migration safe.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  LocalPublicationRepository,
  type Publication,
  type PublicationRepository,
} from './publicationRepository';
import type { PublishedSnapshot } from './snapshot';

// The generated Supabase types predate 023 — the same untyped-accessor
// workaround used for `designs` and the 017/018 tables.
const table = () => (supabase as any).from('brand_identity_publications');

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

/** A local brand id (`brand_1786…`) can never satisfy a uuid column. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  token: string;
  brand_id: string;
  brand_name: string;
  snapshot: PublishedSnapshot;
  published_at: string;
};

function toPublication(row: Row): Publication {
  return {
    token: row.token,
    brandId: row.brand_id,
    brandName: row.brand_name,
    snapshot: row.snapshot,
    publishedAt: row.published_at,
    reach: 'everyone',
  };
}

export class SupabasePublicationRepository implements PublicationRepository {
  private readonly local = new LocalPublicationRepository();

  async forBrand(brandId: string): Promise<Publication | null> {
    // A dev-bypass brand stays local; sending its id to a uuid column raises
    // Postgres 22P02 (the gotcha recorded in CLAUDE.md).
    if (!UUID.test(brandId)) return this.local.forBrand(brandId);

    const { data, error } = await table()
      .select('token, brand_id, brand_name, snapshot, published_at')
      .eq('brand_id', brandId)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return this.local.forBrand(brandId);
      throw error;
    }
    return data ? toPublication(data as Row) : null;
  }

  /**
   * What a visitor's token resolves to.
   *
   * This is the one read an anonymous visitor performs, and it is always
   * filtered by the primary key: the policy grants `select` on the table, so
   * the filter is what keeps a share link from being a directory of every
   * published brand. Never relax it.
   */
  async byToken(token: string): Promise<Publication | null> {
    const { data, error } = await table()
      .select('token, brand_id, brand_name, snapshot, published_at')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return this.local.byToken(token);
      // A visitor cannot act on a database error, and the honest outcome for
      // an unreadable link is the same as for a revoked one.
      return this.local.byToken(token);
    }
    return data ? toPublication(data as Row) : null;
  }

  async publish(input: {
    brandId: string;
    brandName: string;
    snapshot: PublishedSnapshot;
    token?: string;
  }): Promise<Publication> {
    if (!UUID.test(input.brandId)) return this.local.publish(input);

    const existing = await this.forBrand(input.brandId);
    // Re-publishing keeps the token, so a link already handed out keeps
    // working and simply starts showing the newer snapshot.
    const token = input.token ?? existing?.token ?? newToken();

    const { data: session } = await supabase.auth.getUser();
    const row = {
      token,
      brand_id: input.brandId,
      brand_name: input.brandName,
      snapshot: input.snapshot,
      published_by: session?.user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    // Conflict on `brand_id`, not on `token` — the unique index is what
    // enforces one live publication per brand.
    const { data, error } = await table()
      .upsert(row, { onConflict: 'brand_id' })
      .select('token, brand_id, brand_name, snapshot, published_at')
      .single();

    if (error) {
      if (isMissingTable(error)) return this.local.publish({ ...input, token });
      throw error;
    }
    return toPublication(data as Row);
  }

  async unpublish(brandId: string): Promise<void> {
    if (!UUID.test(brandId)) return this.local.unpublish(brandId);
    const { error } = await table().delete().eq('brand_id', brandId);
    if (error && !isMissingTable(error)) throw error;
    // Clear any local twin as well, so a browser that published before the
    // migration landed does not keep resolving a link the owner revoked.
    await this.local.unpublish(brandId);
  }
}

function newToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}
