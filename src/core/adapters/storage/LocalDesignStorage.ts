import type { IDesignStorage } from '@/core/types/services';

/**
 * LocalDesignStorage — stores design data in localStorage.
 * Replaces scattered localStorage.getItem/setItem calls in editor components.
 */
export class LocalDesignStorage implements IDesignStorage {
  private key(brandId: string, designId: string): string {
    return `brandos:design:${brandId}:${designId}`;
  }

  async saveDesign(brandId: string, designId: string, data: unknown): Promise<void> {
    localStorage.setItem(this.key(brandId, designId), JSON.stringify(data));
  }

  async loadDesign(brandId: string, designId: string): Promise<unknown | null> {
    const raw = localStorage.getItem(this.key(brandId, designId));
    return raw ? JSON.parse(raw) : null;
  }

  async listDesigns(brandId: string): Promise<string[]> {
    const prefix = `brandos:design:${brandId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) {
        keys.push(k.replace(prefix, ''));
      }
    }
    return keys;
  }

  async deleteDesign(brandId: string, designId: string): Promise<void> {
    localStorage.removeItem(this.key(brandId, designId));
  }
}
