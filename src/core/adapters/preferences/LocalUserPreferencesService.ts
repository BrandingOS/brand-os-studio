/**
 * Preferences with no server behind them.
 *
 * This is the floor: it is what a guest gets, what a dev-bypass session gets,
 * and what the Supabase implementation falls back to when migration 030 is not
 * deployed. It is also the synchronous read cache the server implementation
 * wraps, which is why it owns the mirror rather than duplicating it.
 */
import type { IUserPreferencesService, UserPreferences } from '@/core/types/services';
import {
  MIRROR_KEY,
  mergePreferences,
  readMirror,
  writeMirror,
} from './preferencesShape';

export class LocalUserPreferencesService implements IUserPreferencesService {
  private cache: UserPreferences = readMirror();
  private readonly listeners = new Set<(p: UserPreferences) => void>();
  private storageBound = false;

  constructor() {
    this.bindStorage();
  }

  /** Another tab changed the mirror. `storage` fires only in OTHER tabs. */
  private bindStorage(): void {
    if (this.storageBound || typeof window === 'undefined') return;
    this.storageBound = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== MIRROR_KEY) return;
      this.cache = readMirror();
      this.emit();
    });
  }

  protected emit(): void {
    for (const fn of this.listeners) fn(this.cache);
  }

  getCached(): UserPreferences {
    return this.cache;
  }

  async hydrate(): Promise<UserPreferences> {
    this.cache = readMirror();
    this.emit();
    return this.cache;
  }

  async set(patch: UserPreferences): Promise<UserPreferences> {
    this.cache = mergePreferences(this.cache, patch);
    writeMirror(this.cache);
    this.emit();
    return this.cache;
  }

  subscribe(fn: (prefs: UserPreferences) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  isServerBacked(): boolean {
    return false;
  }

  async flush(): Promise<void> {
    /* Nothing is deferred here — set() has already written the mirror. */
  }

  /** Used by SupabaseUserPreferencesService, which extends this class. */
  protected replaceCache(next: UserPreferences): void {
    this.cache = next;
    writeMirror(next);
    this.emit();
  }
}
