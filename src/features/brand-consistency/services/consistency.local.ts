/**
 * LocalStorage-backed implementation of `IBrandConsistencyService`.
 * Keyed per brand so generated outputs survive reloads and can be
 * regenerated without losing brand consistency.
 */

import type { GeneratedOutput, IBrandConsistencyService } from './types';

const KEY_PREFIX = 'brandos:brand-consistency:';

function key(brandId: string): string {
  return `${KEY_PREFIX}${brandId}`;
}

function readAll(brandId: string): GeneratedOutput[] {
  try {
    const raw = localStorage.getItem(key(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(brandId: string, outputs: GeneratedOutput[]): void {
  try {
    localStorage.setItem(key(brandId), JSON.stringify(outputs));
  } catch (err) {
    // Quota exceeded — drop oldest until it fits.
    console.warn('[brand-consistency] localStorage quota hit, trimming', err);
    const trimmed = outputs.slice(-50);
    try {
      localStorage.setItem(key(brandId), JSON.stringify(trimmed));
    } catch {
      // Give up silently — outputs are still in memory until reload.
    }
  }
}

export class LocalBrandConsistencyService implements IBrandConsistencyService {
  async list(brandId: string): Promise<GeneratedOutput[]> {
    return readAll(brandId).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async save(output: GeneratedOutput): Promise<void> {
    const all = readAll(output.brandId);
    const idx = all.findIndex((o) => o.id === output.id);
    if (idx >= 0) {
      all[idx] = output;
    } else {
      all.push(output);
    }
    writeAll(output.brandId, all);
  }

  async delete(brandId: string, outputId: string): Promise<void> {
    const all = readAll(brandId).filter((o) => o.id !== outputId);
    writeAll(brandId, all);
  }

  async clear(brandId: string): Promise<void> {
    localStorage.removeItem(key(brandId));
  }
}
