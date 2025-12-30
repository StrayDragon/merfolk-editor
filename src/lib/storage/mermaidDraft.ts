const DB_NAME = 'merfolk-editor';
const DB_VERSION = 1;
const STORE_NAME = 'mermaid-drafts';
const DRAFT_KEY = 'default';

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onblocked = () => {
        dbPromise = null;
        reject(new Error('IndexedDB open blocked'));
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    });
  }

  return dbPromise;
}

export async function loadMermaidDraft(): Promise<string | null> {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(DRAFT_KEY);

    request.onsuccess = () => {
      resolve(typeof request.result === 'string' ? request.result : null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to read draft'));
    };
  });
}

export async function saveMermaidDraft(code: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save draft'));
    tx.onabort = () => reject(tx.error ?? new Error('Failed to save draft'));
    tx.objectStore(STORE_NAME).put(code, DRAFT_KEY);
  });
}

export async function clearMermaidDraft(): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear draft'));
    tx.onabort = () => reject(tx.error ?? new Error('Failed to clear draft'));
    tx.objectStore(STORE_NAME).delete(DRAFT_KEY);
  });
}
