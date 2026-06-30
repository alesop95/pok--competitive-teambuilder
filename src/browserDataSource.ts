// Implementazione browser di DataSource (ADR-009): i file dati di stagione sono asset statici letti
// via fetch; ciò che l'utente crea o modifica (storico dei team, edit del meta) vive in IndexedDB,
// persistente sul dispositivo. Non importa nulla di Node, così l'engine resta bundlabile per il
// browser. Speculare a NodeDataSource (fs) per il CLI.
//
// Modello: un unico object store `files` indicizzato per percorso relativo (es.
// "seasons/season_MB_meta.yaml", "generated_teams/2026-..._x.json"). La lettura controlla prima
// IndexedDB (override dell'utente o file creati dall'utente) e, se assente, scarica l'asset statico
// via fetch. La scrittura va sempre su IndexedDB: un sito statico non ha un filesystem scrivibile,
// quindi un edit del meta diventa un override locale del browser sopra l'asset di sola lettura.
// list() di una cartella di asset statici legge un manifesto `_manifest.json` accanto ai file, perché
// un host statico non espone l'elenco dei file di una directory; per lo storico unisce le chiavi
// presenti in IndexedDB.
import type { DataSource } from './dataSource.js';

const DB_NAME = 'poke-teambuilder';
const STORE = 'files';
const SAVED_DIR = 'generated_teams';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key: string): Promise<string | undefined> {
  return openDb().then(
    (db) =>
      new Promise<string | undefined>((resolve, reject) => {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result as string | undefined);
        r.onerror = () => reject(r.error);
      }),
  );
}

function idbPut(key: string, value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const r = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      }),
  );
}

function idbKeys(): Promise<string[]> {
  return openDb().then(
    (db) =>
      new Promise<string[]>((resolve, reject) => {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
        r.onsuccess = () => resolve((r.result as IDBValidKey[]).map(String));
        r.onerror = () => reject(r.error);
      }),
  );
}

export class BrowserDataSource implements DataSource {
  constructor(private readonly baseUrl = '') {}

  private url(relPath: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${relPath.replace(/^\//, '')}`;
  }

  async readText(relPath: string): Promise<string> {
    const override = await idbGet(relPath);
    if (override !== undefined) return override; // edit dell'utente o file creato nel browser
    const res = await fetch(this.url(relPath));
    if (!res.ok) throw new Error(`risorsa assente: ${relPath} (HTTP ${res.status})`);
    return res.text();
  }

  async writeText(relPath: string, content: string): Promise<void> {
    await idbPut(relPath, content); // persistenza locale: storico team o override del meta
  }

  async list(relDir: string): Promise<string[]> {
    if (relDir === SAVED_DIR) {
      const keys = await idbKeys();
      const prefix = `${SAVED_DIR}/`;
      return keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
    }
    try {
      const res = await fetch(this.url(`${relDir}/_manifest.json`));
      if (!res.ok) return [];
      return JSON.parse(await res.text()) as string[];
    } catch {
      return [];
    }
  }
}
