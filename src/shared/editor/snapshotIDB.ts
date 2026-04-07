/**
 * Direct IndexedDB read/write for slide HTML snapshots.
 *
 * Bypasses Zustand persist middleware so saves are AWAITED — no
 * fire-and-forget, no async hydration race, no selector identity tricks.
 * The editor reads once on mount and writes once per save click.
 *
 * Schema: one row per snapshot, key = `${editorKey}::${slideId}`,
 * value = the cleaned innerHTML string.
 */

const DB_NAME = 'brandos-snapshots';
const STORE = 'slides';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
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

function makeKey(editorKey: string, slideId: string): string {
  return `${editorKey}::${slideId}`;
}

export async function loadSnapshotsForEditor(editorKey: string): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    return await new Promise<Record<string, string>>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const result: Record<string, string> = {};
      const prefix = `${editorKey}::`;
      // openCursor over the whole store and filter by prefix
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const key = String(cursor.key);
          if (key.startsWith(prefix)) {
            const slideId = key.slice(prefix.length);
            result[slideId] = cursor.value as string;
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[snapshotIDB] load failed', editorKey, err);
    return {};
  }
}

export async function saveSnapshot(editorKey: string, slideId: string, html: string): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(html, makeKey(editorKey, slideId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch (err) {
    console.error('[snapshotIDB] save failed', editorKey, slideId, err);
    return false;
  }
}

export async function deleteSnapshot(editorKey: string, slideId: string): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(makeKey(editorKey, slideId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (err) {
    console.warn('[snapshotIDB] delete failed', editorKey, slideId, err);
    return false;
  }
}
