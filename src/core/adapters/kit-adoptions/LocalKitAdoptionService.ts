/**
 * Official Brand Kit adoptions — guest/dev implementation.
 *
 * An adoption is a REFERENCE plus who adopted it and when. It never contains a
 * copy of the adopted material, so the Library item (or Core value) it points
 * at stays the one canonical object: adopting cannot fork it, and un-adopting
 * cannot delete it.
 *
 * Storage: `brandos:kit-adoptions:{brandId}`.
 */
import {
  assertAdoptable,
  type AdoptInput,
  type AdoptTargetKind,
  type IKitAdoptionService,
  type KitAdoption,
} from '@/core/services/IKitAdoptionService';

const key = (brandId: string) => `brandos:kit-adoptions:${brandId}`;

export class LocalKitAdoptionService implements IKitAdoptionService {
  private read(brandId: string): KitAdoption[] {
    try {
      const raw = localStorage.getItem(key(brandId));
      return raw ? (JSON.parse(raw) as KitAdoption[]) : [];
    } catch {
      return [];
    }
  }

  private write(brandId: string, rows: KitAdoption[]): void {
    localStorage.setItem(brandId ? key(brandId) : key(''), JSON.stringify(rows));
  }

  async list(brandId: string): Promise<KitAdoption[]> {
    return this.read(brandId).sort((a, b) => a.adoptedAt.localeCompare(b.adoptedAt));
  }

  async adopt(input: AdoptInput): Promise<KitAdoption> {
    // Core values have ONE entry point (promoteCoreValue), which passes the
    // flag this guard checks. Enforced in every implementation so the rule
    // cannot drift between them.
    assertAdoptable(input);

    const rows = this.read(input.brandId);
    const existing = rows.find(
      (r) => r.targetKind === input.targetKind && r.targetRef === input.targetRef,
    );
    // Adopting twice is not an error; it is already adopted.
    if (existing) return existing;

    const row: KitAdoption = {
      id: crypto.randomUUID(),
      brandId: input.brandId,
      targetKind: input.targetKind,
      targetRef: input.targetRef,
      adoptedBy: input.actor.userId,
      adoptedAt: new Date().toISOString(),
      ...(input.note ? { note: input.note } : {}),
    };
    rows.push(row);
    this.write(input.brandId, rows);
    return row;
  }

  /** Removes ONLY the adoption record. The referenced item is untouched. */
  async unadopt(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<void> {
    const rows = this.read(brandId);
    const next = rows.filter((r) => !(r.targetKind === targetKind && r.targetRef === targetRef));
    if (next.length !== rows.length) this.write(brandId, next);
  }

  async isAdopted(
    brandId: string,
    targetKind: AdoptTargetKind,
    targetRef: string,
  ): Promise<boolean> {
    return this.read(brandId).some(
      (r) => r.targetKind === targetKind && r.targetRef === targetRef,
    );
  }
}
