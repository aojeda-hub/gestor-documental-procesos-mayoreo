// Persistencia local de las sesiones de Skills (conversación, documento
// generado, texto sin enviar y adjuntos por tipo de documento), para que
// sobrevivan a una recarga de la página.
//
// Se usa IndexedDB y no localStorage: los adjuntos PDF/imagen viajan en
// base64 y superan con facilidad el límite de ~5 MB de localStorage.
// Se guarda por usuario: en un equipo compartido cada persona ve solo lo suyo.
// Si el navegador no permite IndexedDB (modo privado, bloqueo), todo sigue
// funcionando en memoria y simplemente no se conserva al recargar.

const DB_NAME = 'mayoreo-skills';
const STORE = 'sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSkillState<T>(userId: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(userId);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveSkillState<T>(userId: string, state: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Sin persistencia disponible: la sesión sigue en memoria.
  }
}
