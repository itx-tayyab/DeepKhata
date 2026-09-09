## Client-Side Architecture (Next.js)

### Offline-First POS & Ledger

- Use Dexie.js (IndexedDB) to cache parts catalogs, cabinet mappings, and customer accounts locally.
- POS operations and ledger memo creation must execute against local storage immediately without waiting for API responses.
- Every offline transaction must receive a client-generated UUID and enter an append-only sync queue in IndexedDB.
- Implement a background sync worker that flushes queued transactions to `POST /api/v1/sync` when `navigator.onLine` fires.

### WhatsApp Receipts

- Avoid third-party messaging APIs for receipts.
- Construct direct URI links using `https://wa.me/<phone>?text=<encoded_invoice>` so mobile operators can open WhatsApp natively to share bills and ledger status.

---
