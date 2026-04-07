/**
 * IndexedDB-backed string storage for Zustand persist middleware.
 *
 * Drop-in replacement for the localStorage default. Used by stores that
 * hold large blobs (HTML snapshots with inlined image data URLs, etc.)
 * which routinely blow the 5 MB localStorage quota.
 *
 * IndexedDB typically gives ~50% of free disk and has no per-key limit,
 * so this fixes the QuotaExceededError without compression or eviction.
 *
 * Plug into a Zustand store like:
 * ```ts
 * persist(creator, { name: 'my-store', storage: createJSONStorage(() => idbStringStorage) })
 * ```
 */

const DB_NAME = 'brandos-editor';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

export const idbStringStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(name);
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[idbStorage] getItem failed', name, err);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      // Don't crash the app on persistence failure — the in-memory state
      // still works for the rest of the session.
      console.warn('[idbStorage] setItem failed', name, err);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[idbStorage] removeItem failed', name, err);
    }
  },
};
