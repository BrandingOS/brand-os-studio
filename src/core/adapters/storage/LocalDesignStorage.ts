import type { DesignSummary, IDesignStorage } from '@/core/types/services';

/**
 * LocalDesignStorage — stores design data + per-design summary
 * (name, thumbnail, dimensions, content type, source-template id,
 * is-template flag) in localStorage.
 *
 * Phase 4.2 extended the body-only key with a sibling summary key so
 * `listDesigns` returns rich `DesignSummary[]` for the My Designs
 * grid without loading every doc body.
 */
export class LocalDesignStorage implements IDesignStorage {
  private bodyKey(brandId: string, designId: string): string {
    return `brandos:design:${brandId}:${designId}`;
  }

  private summaryKey(brandId: string, designId: string): string {
    return `brandos:design-summary:${brandId}:${designId}`;
  }

  async saveDesign(
    brandId: string,
    designId: string,
    data: unknown,
    meta?: Partial<DesignSummary>,
  ): Promise<void> {
    localStorage.setItem(this.bodyKey(brandId, designId), JSON.stringify(data));

    // Compose / update the sibling summary.
    const existingRaw = localStorage.getItem(this.summaryKey(brandId, designId));
    const existing: Partial<DesignSummary> = existingRaw
      ? (JSON.parse(existingRaw) as Partial<DesignSummary>)
      : {};
    const summary: DesignSummary = {
      id: designId,
      ...existing,
      ...(meta ?? {}),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      this.summaryKey(brandId, designId),
      JSON.stringify(summary),
    );
  }

  async loadDesign(brandId: string, designId: string): Promise<unknown | null> {
    const raw = localStorage.getItem(this.bodyKey(brandId, designId));
    return raw ? JSON.parse(raw) : null;
  }

  async listDesigns(brandId: string): Promise<DesignSummary[]> {
    const summaryPrefix = `brandos:design-summary:${brandId}:`;
    const bodyPrefix = `brandos:design:${brandId}:`;
    const summaries: DesignSummary[] = [];
    const idsFromBodies = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(summaryPrefix)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) summaries.push(JSON.parse(raw) as DesignSummary);
        } catch {
          /* skip malformed */
        }
      } else if (k.startsWith(bodyPrefix)) {
        idsFromBodies.add(k.replace(bodyPrefix, ''));
      }
    }

    // Backfill — pre-Phase-4 designs have a body but no summary.
    // Synthesize a minimal summary so the My Designs grid still
    // shows them (without a thumbnail).
    const knownIds = new Set(summaries.map((s) => s.id));
    for (const id of idsFromBodies) {
      if (!knownIds.has(id)) {
        summaries.push({ id });
      }
    }

    // Newest first by updatedAt (fall back to id for stability).
    summaries.sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.id.localeCompare(b.id),
    );
    return summaries;
  }

  async deleteDesign(brandId: string, designId: string): Promise<void> {
    localStorage.removeItem(this.bodyKey(brandId, designId));
    localStorage.removeItem(this.summaryKey(brandId, designId));
  }
}
