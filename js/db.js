/* ============================================
   DATABASE LAYER — IndexedDB for Kesehatan
   ============================================ */
const DB = (() => {
    const DB_NAME = 'KesehatanDB';
    const DB_VERSION = 2;
    let db = null;

    function open() {
        return new Promise((resolve, reject) => {
            if (db) { resolve(db); return; }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const database = e.target.result;

                // Treatment store
                if (!database.objectStoreNames.contains('treatment')) {
                    const store = database.createObjectStore('treatment', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('shipment', 'shipment', { unique: false });
                    store.createIndex('eartag', 'eartag', { unique: false });
                    store.createIndex('penanggungJawab', 'penanggungJawab', { unique: false });
                    store.createIndex('penAkhir', 'penAkhir', { unique: false });
                }

                // Moving store
                if (!database.objectStoreNames.contains('moving')) {
                    const store = database.createObjectStore('moving', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('shipment', 'shipment', { unique: false });
                    store.createIndex('eartag', 'eartag', { unique: false });
                    store.createIndex('penanggungJawab', 'penanggungJawab', { unique: false });
                }

                // Pengambilan Obat store
                if (!database.objectStoreNames.contains('pengambilan_obat')) {
                    const store = database.createObjectStore('pengambilan_obat', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('penanggungJawab', 'penanggungJawab', { unique: false });
                }

                // Penambahan Obat store
                if (!database.objectStoreNames.contains('penambahan_obat')) {
                    const store = database.createObjectStore('penambahan_obat', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('penanggungJawab', 'penanggungJawab', { unique: false });
                }

                // Pen Trial store
                if (!database.objectStoreNames.contains('pen_trial')) {
                    const store = database.createObjectStore('pen_trial', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('pen', 'pen', { unique: false });
                    store.createIndex('kandang', 'kandang', { unique: false });
                }

                // Salvage store (sapi terpaksa jual)
                if (!database.objectStoreNames.contains('salvage')) {
                    const store = database.createObjectStore('salvage', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                    store.createIndex('eartag', 'eartag', { unique: false });
                }

                // Master data (dropdown items)
                if (!database.objectStoreNames.contains('master_data')) {
                    const masterStore = database.createObjectStore('master_data', { keyPath: ['type', 'value'] });
                    masterStore.createIndex('type', 'type', { unique: false });
                }

                // Users
                if (!database.objectStoreNames.contains('users')) {
                    database.createObjectStore('users', { keyPath: 'username' });
                }

                // Settings (key-value)
                if (!database.objectStoreNames.contains('settings')) {
                    database.createObjectStore('settings', { keyPath: 'key' });
                }

                // Sync log
                if (!database.objectStoreNames.contains('sync_log')) {
                    const syncStore = database.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    // --- Generic CRUD ---
    async function add(storeName, data) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function get(storeName, key) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getAll(storeName) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getAllByIndex(storeName, indexName, value) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const req = index.getAll(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function update(storeName, data) {
        return add(storeName, data);
    }

    async function remove(storeName, key) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function clear(storeName) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // --- Master Data helpers ---
    async function getMasterByType(type) {
        const all = await getAllByIndex('master_data', 'type', type);
        return all.map(item => item.value).sort();
    }

    async function addMaster(type, value) {
        return add('master_data', { type, value });
    }

    async function removeMaster(type, value) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('master_data', 'readwrite');
            const store = tx.objectStore('master_data');
            const req = store.delete([type, value]);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // --- Full Export/Import for backup ---
    async function exportAll() {
        const stores = ['treatment', 'moving', 'pengambilan_obat', 'penambahan_obat', 'pen_trial', 'salvage', 'master_data', 'users', 'settings', 'sync_log'];
        const data = {};
        for (const store of stores) {
            data[store] = await getAll(store);
        }
        data._exportDate = new Date().toISOString();
        data._version = DB_VERSION;
        return data;
    }

    async function importAll(data) {
        const stores = ['treatment', 'moving', 'pengambilan_obat', 'penambahan_obat', 'pen_trial', 'salvage', 'master_data', 'users', 'settings', 'sync_log'];
        for (const store of stores) {
            if (data[store]) {
                await clear(store);
                for (const item of data[store]) {
                    await add(store, item);
                }
            }
        }
    }

    // --- Log helpers ---
    async function addLog(action, detail) {
        return add('sync_log', {
            timestamp: new Date().toISOString(),
            action,
            detail
        });
    }

    return {
        open, add, get, getAll, getAllByIndex, update, remove, clear,
        getMasterByType, addMaster, removeMaster,
        exportAll, importAll, addLog
    };
})();
