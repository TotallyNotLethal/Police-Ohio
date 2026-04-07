export interface CachedSection {
  sectionNumber: string;
  title: string;
  cachedAt: number;
}

export interface RecentView {
  sectionNumber: string;
  viewedAt: number;
}

const DB_NAME = 'police-ohio-offline';
const DB_VERSION = 1;
const FAVORITES = 'favorites';
const CACHED_SECTIONS = 'cachedSections';
const RECENT_VIEWS = 'recentViews';

function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, handler: (store: IDBObjectStore) => void): Promise<T> {
  if (!canUseIndexedDb()) {
    throw new Error('IndexedDB unavailable');
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FAVORITES)) {
        database.createObjectStore(FAVORITES, { keyPath: 'sectionNumber' });
      }
      if (!database.objectStoreNames.contains(CACHED_SECTIONS)) {
        database.createObjectStore(CACHED_SECTIONS, { keyPath: 'sectionNumber' });
      }
      if (!database.objectStoreNames.contains(RECENT_VIEWS)) {
        database.createObjectStore(RECENT_VIEWS, { keyPath: 'sectionNumber' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);

    handler(store);

    tx.onabort = () => reject(tx.error);

    (tx as IDBTransaction & { _resolve?: (value: T) => void })._resolve = resolve;
  });
}

function resolveTx<T>(tx: IDBTransaction, value: T) {
  const resolver = (tx as IDBTransaction & { _resolve?: (value: T) => void })._resolve;
  if (resolver) {
    resolver(value);
  }
}

export async function listFavorites(): Promise<string[]> {
  return withStore<string[]>(FAVORITES, 'readonly', (store) => {
    const request = store.getAll();
    const tx = store.transaction;
    request.onsuccess = () => resolveTx(tx, request.result.map((item: { sectionNumber: string }) => item.sectionNumber));
    request.onerror = () => resolveTx(tx, []);
  });
}

export async function setFavorite(sectionNumber: string, favorite: boolean) {
  return withStore<void>(FAVORITES, 'readwrite', (store) => {
    if (favorite) {
      store.put({ sectionNumber, updatedAt: Date.now() });
    } else {
      store.delete(sectionNumber);
    }
    resolveTx(store.transaction, undefined);
  });
}

export async function listCachedSections(): Promise<CachedSection[]> {
  return withStore<CachedSection[]>(CACHED_SECTIONS, 'readonly', (store) => {
    const request = store.getAll();
    const tx = store.transaction;
    request.onsuccess = () => {
      const items = request.result as CachedSection[];
      resolveTx(tx, items.sort((a, b) => b.cachedAt - a.cachedAt));
    };
    request.onerror = () => resolveTx(tx, []);
  });
}

export async function cacheSection(sectionNumber: string, title: string) {
  return withStore<void>(CACHED_SECTIONS, 'readwrite', (store) => {
    store.put({ sectionNumber, title, cachedAt: Date.now() });
    resolveTx(store.transaction, undefined);
  });
}

export async function listRecentViews(): Promise<RecentView[]> {
  return withStore<RecentView[]>(RECENT_VIEWS, 'readonly', (store) => {
    const request = store.getAll();
    const tx = store.transaction;
    request.onsuccess = () => {
      const items = request.result as RecentView[];
      resolveTx(tx, items.sort((a, b) => b.viewedAt - a.viewedAt));
    };
    request.onerror = () => resolveTx(tx, []);
  });
}

export async function addRecentView(sectionNumber: string) {
  return withStore<void>(RECENT_VIEWS, 'readwrite', (store) => {
    store.put({ sectionNumber, viewedAt: Date.now() });
    resolveTx(store.transaction, undefined);
  });
}

export async function queueSync() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register('offline-sync');
      return;
    }
  } catch {
    // no-op fallthrough
  }

  await fetch('/api/offline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggeredBy: 'fallback-client-sync' }),
  });
}
