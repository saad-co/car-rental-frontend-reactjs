/**
 * A small box on the phone (IndexedDB) that keeps every photo until the server has it (spec p. 12: an IndexedDB queue). If the
 * page is closed, reloaded or the phone restarts with photos still waiting for signal, the next visit to the same link puts them
 * back in the upload line.
 *
 * IndexedDB is the browser's own database for files and objects; unlike localStorage it can hold pictures. It is shared by all
 * pages of this site, so every entry is keyed by the link's token.
 */

const DATABASE = "gonzo-inspection";
const STORE = "photos";
/** Entries older than this are dropped when the store is opened: a link never lives that long. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredPhoto {
  key: string;
  token: string;
  shotId: string;
  position: number;
  blob: Blob;
  capturedAt: string | null;
  savedAt: number;
}

/** What the session and the page use. Every method logs its own problems and never throws. */
export interface PhotoStore {
  save: (
    shotId: string,
    position: number,
    blob: Blob,
    capturedAt: string | null,
  ) => void;
  remove: (shotId: string, position: number) => void;
  /** The photos waiting from earlier visits to this link. */
  loadAll: () => Promise<
    {
      shotId: string;
      position: number;
      blob: Blob;
      capturedAt: string | null;
    }[]
  >;
  /** Forgets everything of this link (it was submitted, or the server says it is closed). */
  clear: () => void;
}

/** Turns an IndexedDB request into a promise. */
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("token", "token");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const keyOf = (token: string, shotId: string, position: number) =>
  `${token}:${shotId}:${position}`;

/**
 * Opens the store for one link, or returns null when this browser has no IndexedDB (or blocks it, as some private windows do):
 * the page then works as before, without the safety net.
 */
export function openPhotoStore(token: string): PhotoStore | null {
  if (typeof indexedDB === "undefined") return null;
  const database = openDatabase();
  // Old entries of any link go first, once per visit.
  void database
    .then(async (db) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const all = await requestResult<StoredPhoto[]>(store.getAll());
      for (const entry of all) {
        if (Date.now() - entry.savedAt > MAX_AGE_MS) store.delete(entry.key);
      }
      await transactionDone(transaction);
    })
    .catch((error: unknown) => {
      console.warn("The photo store could not clear old photos.", error);
    });

  async function run<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    const db = await database;
    const transaction = db.transaction(STORE, mode);
    const result = await work(transaction.objectStore(STORE));
    await transactionDone(transaction);
    return result;
  }

  return {
    save(shotId, position, blob, capturedAt) {
      const entry: StoredPhoto = {
        key: keyOf(token, shotId, position),
        token,
        shotId,
        position,
        blob,
        capturedAt,
        savedAt: Date.now(),
      };
      void run("readwrite", (store) => requestResult(store.put(entry))).catch(
        (error: unknown) => {
          console.warn("A photo could not be kept on this phone.", error);
        },
      );
    },
    remove(shotId, position) {
      void run("readwrite", (store) =>
        requestResult(store.delete(keyOf(token, shotId, position))),
      ).catch((error: unknown) => {
        console.warn(
          "A saved photo could not be removed from this phone.",
          error,
        );
      });
    },
    async loadAll() {
      try {
        const entries = await run("readonly", (store) =>
          requestResult<StoredPhoto[]>(store.index("token").getAll(token)),
        );
        return entries.map(({ shotId, position, blob, capturedAt }) => ({
          shotId,
          position,
          blob,
          capturedAt,
        }));
      } catch (error) {
        console.warn("The photos kept on this phone could not be read.", error);
        return [];
      }
    },
    clear() {
      void run("readwrite", async (store) => {
        const keys = await requestResult(
          store.index("token").getAllKeys(token),
        );
        for (const key of keys) store.delete(key);
      }).catch((error: unknown) => {
        console.warn(
          "The photos kept on this phone could not be cleared.",
          error,
        );
      });
    },
  };
}
