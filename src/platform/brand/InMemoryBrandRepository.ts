/**
 * In-memory BrandRepository (Stage 2B).
 *
 * Persists through the REAL row mappers (canonicalToRow → serialized row →
 * rowToCanonical) and JSON round-trips the stored row, so it exercises the true
 * persistence path rather than just holding the object in memory. Useful as a
 * test double and for offline/local canonical persistence.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import type { CanonicalBrand } from '@/domain/brand';
import { canonicalToRow, rowToCanonical, type BrandRow } from './brandRow';

export class InMemoryBrandRepository implements BrandRepository {
  /** stored as serialized rows to force a real (de)serialization round-trip. */
  private rows = new Map<string, string>();
  private slugToId = new Map<string, string>();

  private read(id: string): CanonicalBrand | null {
    const raw = this.rows.get(id);
    if (!raw) return null;
    return rowToCanonical(JSON.parse(raw) as BrandRow);
  }

  async getById(id: string): Promise<CanonicalBrand | null> {
    return this.read(id);
  }

  async getBySlug(slug: string): Promise<CanonicalBrand | null> {
    const id = this.slugToId.get(slug);
    return id ? this.read(id) : null;
  }

  async save(brand: CanonicalBrand): Promise<CanonicalBrand> {
    const write = canonicalToRow(brand);
    const row: BrandRow = {
      id: brand.id,
      slug: brand.slug,
      created_at: brand.createdAt.toISOString(),
      updated_at: brand.updatedAt.toISOString(),
      ...write,
    };
    this.rows.set(brand.id, JSON.stringify(row));
    this.slugToId.set(brand.slug, brand.id);
    return this.read(brand.id)!;
  }
}
