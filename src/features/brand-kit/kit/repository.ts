/**
 * Persistence boundary for Brand Kit deliverable state. The store
 * talks ONLY to `KitStateRepository` — localStorage today, a backend
 * table later, with zero domain-logic change (swap via
 * `setKitStateRepository`).
 */
import { emptyKitState, type BrandKitState } from './types';

export interface KitStateRepository {
  load(brandId: string): BrandKitState | null;
  /** @returns true when the write landed. */
  save(brandId: string, state: BrandKitState): boolean;
}

const STORAGE_KEY = 'brandos:brand-kit:state';

type StoreShape = Record<string, BrandKitState>;

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoreShape) : {};
  } catch {
    return {};
  }
}

export class LocalKitStateRepository implements KitStateRepository {
  load(brandId: string): BrandKitState | null {
    const state = readStore()[brandId];
    if (!state || state.version !== 1 || typeof state.deliverables !== 'object') {
      return null;
    }
    return state;
  }

  save(brandId: string, state: BrandKitState): boolean {
    try {
      const store = readStore();
      store[brandId] = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch {
      return false;
    }
  }
}

let repository: KitStateRepository = new LocalKitStateRepository();

export function getKitStateRepository(): KitStateRepository {
  return repository;
}

/** Future backend swap point — call once at boot with the new impl. */
export function setKitStateRepository(next: KitStateRepository): void {
  repository = next;
}

export { emptyKitState };
