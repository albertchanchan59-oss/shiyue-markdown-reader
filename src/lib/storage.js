const DATABASE = 'shiyue-library-v1';
let connection;
let pending = Promise.resolve();

function openDatabase() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('documents', { keyPath: 'id' });
      db.createObjectStore('settings');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭另一个旧版本的拾页窗口后重试。'));
  });
  return connection;
}

async function transaction(stores, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = action(tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('本地保存中断。'));
  });
}

function write(action) {
  const next = pending.catch(() => {}).then(action);
  pending = next;
  return next;
}

export async function loadLibrary() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'settings'], 'readonly');
    const docs = tx.objectStore('documents').getAll();
    const settings = tx.objectStore('settings').get('preferences');
    tx.oncomplete = () => resolve({ documents: docs.result, preferences: settings.result || {} });
    tx.onerror = () => reject(tx.error);
  });
}
export function saveDocument(doc) {
  return write(() => transaction(['documents'], 'readwrite', (tx) => tx.objectStore('documents').put(doc)));
}
export function removeDocument(id) {
  return write(() => transaction(['documents'], 'readwrite', (tx) => tx.objectStore('documents').delete(id)));
}
export function savePreferences(prefs) {
  return write(() => transaction(['settings'], 'readwrite', (tx) => tx.objectStore('settings').put(prefs, 'preferences')));
}
export function waitForSaves() { return pending; }
