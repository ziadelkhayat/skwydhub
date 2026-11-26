// The tablet's storage for the web POS: an AsyncStorage-like key/value store on IndexedDB (no size limit like localStorage).
const DB = "skwyd-pos", ST = "kv";
let dbp: Promise<IDBDatabase> | null = null;
const open = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
  const db = await open(); return new Promise((res, rej) => { const t = db.transaction(ST, mode), s = t.objectStore(ST), q = f(s); t.oncomplete = () => res(q ? (q as IDBRequest<T>).result : undefined); t.onerror = () => rej(t.error); }); };
export const kv = {
  // a value the earlier web POS kept in localStorage is read once and moved here (a register activated there stays activated)
  getItem: async (k: string) => { const v = (await tx<string>("readonly", s => s.get(k))) ?? null; if (v != null) return v as string;
    let old: string | null = null; try { old = localStorage.getItem(k); } catch { /* no localStorage */ }
    if (old != null) { await kv.setItem(k, old); try { localStorage.removeItem(k); } catch { /* ignore */ } } return old; },
  setItem: (k: string, v: string) => tx("readwrite", s => { s.put(v, k); }).then(() => {}),
  removeItem: (k: string) => tx("readwrite", s => { s.delete(k); }).then(() => {}),
  multiGet: async (ks: string[]) => Promise.all(ks.map(async k => [k, await kv.getItem(k)] as [string, string | null])),
  multiSet: async (pairs: [string, string][]) => { await Promise.all(pairs.map(([k, v]) => kv.setItem(k, v))); },
  multiRemove: async (ks: string[]) => { await Promise.all(ks.map(kv.removeItem)); },
};
export default kv;
