import { StorageService } from '@/shared/types/services';

class LocalStorageService implements StorageService {
  private prefix: string;

  constructor(prefix: string = 'brandos_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Additional utility methods
  exists(key: string): boolean {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  size(): number {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .length;
  }

  getAllKeys(): string[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.replace(this.prefix, ''));
  }
}

class SessionStorageService implements StorageService {
  private prefix: string;

  constructor(prefix: string = 'brandos_session_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(this.getKey(key), serializedValue);
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

// Memory storage for when localStorage is not available
class MemoryStorageService implements StorageService {
  private storage = new Map<string, any>();
  private prefix: string;

  constructor(prefix: string = 'brandos_memory_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: any): void {
    this.storage.set(this.getKey(key), value);
  }

  get<T>(key: string): T | null {
    return this.storage.get(this.getKey(key)) || null;
  }

  remove(key: string): void {
    this.storage.delete(this.getKey(key));
  }

  clear(): void {
    const keys = Array.from(this.storage.keys());
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        this.storage.delete(key);
      }
    });
  }
}

// Create storage instances with fallback
function createStorageService(): StorageService {
  try {
    // Test localStorage availability
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return new LocalStorageService();
  } catch {
    try {
      // Fallback to sessionStorage
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return new SessionStorageService();
    } catch {
      // Final fallback to memory storage
      return new MemoryStorageService();
    }
  }
}

export const storageService = createStorageService();
export const sessionStorageService = new SessionStorageService();
export const memoryStorageService = new MemoryStorageService();

export { LocalStorageService, SessionStorageService, MemoryStorageService };