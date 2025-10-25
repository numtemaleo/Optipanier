import type { ArchivedReceipt, LoyaltyCard, DBStore } from '../types';

const DB_NAME = 'OptiPanierDB';
const DB_VERSION = 2; // Incremented version for schema change
const RECEIPT_STORE = 'receipts';
const CARD_STORE = 'loyaltyCards';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(false);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RECEIPT_STORE)) {
        db.createObjectStore(RECEIPT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CARD_STORE)) {
        db.createObjectStore(CARD_STORE, { keyPath: 'id' });
      }
    };
  });
};

const makeRequest = <T>(storeName: DBStore, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB not initialized');
        }
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error(`Error performing action on ${storeName}:`, request.error);
            reject(request.error);
        }
    });
}

// Receipt Functions
export const addReceipt = (receipt: ArchivedReceipt): Promise<void> => makeRequest(RECEIPT_STORE, 'readwrite', store => store.add(receipt));
export const getAllReceipts = async (): Promise<ArchivedReceipt[]> => {
    const receipts: ArchivedReceipt[] = await makeRequest(RECEIPT_STORE, 'readonly', store => store.getAll());
    return receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
export const deleteReceipt = (id: string): Promise<void> => makeRequest(RECEIPT_STORE, 'readwrite', store => store.delete(id));

// Loyalty Card Functions
export const addLoyaltyCard = (card: LoyaltyCard): Promise<void> => makeRequest(CARD_STORE, 'readwrite', store => store.add(card));
export const getAllLoyaltyCards = (): Promise<LoyaltyCard[]> => makeRequest(CARD_STORE, 'readonly', store => store.getAll());
export const deleteLoyaltyCard = (id: string): Promise<void> => makeRequest(CARD_STORE, 'readwrite', store => store.delete(id));