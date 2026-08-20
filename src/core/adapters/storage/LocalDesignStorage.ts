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
import { idbStringStorage } from '@/shared/editor/idbStorage';

// Bodies that hold AI-generated images (data URIs, hundreds of KB each)
// routinely blow localStorage's ~5 MB quota. On QuotaExceededError the
// body overflows into IndexedDB and a tiny marker stays in localStorage
// so reads stay synchronous-looking and old bodies keep working.
const IDB_MARKER = '{"__idb":1}';

function isQuotaError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014
    : /quota/i.test(String((err as Error)?.message ?? err));
}

async function writeBody(key: string, json: string): Promise<void> {
  const prev = localStorage.getItem(key);
  try {
    localStorage.setItem(key, json);
    if (prev === IDB_MARKER) void idbStringStorage.removeItem(key);
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    await idbStringStorage.setItem(key, json);
    try { localStorage.setItem(key, IDB_MARKER); } catch { /* marker is tiny; if even that fails, IDB alone still serves reads */ }
  }
}

async function readBody(key: string): Promise<string | null> {
  const raw = localStorage.getItem(key);
  if (raw !== IDB_MARKER) return raw;
  return idbStringStorage.getItem(key);
}

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
    await writeBody(this.bodyKey(brandId, designId), JSON.stringify(data));

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

  /**
   * Filing touches the SUMMARY only — the body is never read. A design can be
   * megabytes of Fabric JSON (and may live in IndexedDB behind a marker);
   * rewriting it to change one field would be slow and, on the IDB overflow
   * path, risky.
   */
  async moveDesignToFolder(
    brandId: string,
    designId: string,
    folderId: string | null,
  ): Promise<void> {
    const key = this.summaryKey(brandId, designId);
    const raw = localStorage.getItem(key);
    const existing: Partial<DesignSummary> = raw ? (JSON.parse(raw) as Partial<DesignSummary>) : {};
    localStorage.setItem(key, JSON.stringify({ ...existing, id: designId, folderId }));
  }

  async loadDesign(brandId: string, designId: string): Promise<unknown | null> {
    const raw = await readBody(this.bodyKey(brandId, designId));
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
    if (localStorage.getItem(this.bodyKey(brandId, designId)) === IDB_MARKER) {
      void idbStringStorage.removeItem(this.bodyKey(brandId, designId));
    }
    localStorage.removeItem(this.bodyKey(brandId, designId));
    localStorage.removeItem(this.summaryKey(brandId, designId));
  }
}
