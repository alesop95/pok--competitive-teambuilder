// Astrazione dell'accesso ai dati del progetto (ADR-009). L'engine non dipende dal filesystem: con
// Node si inietta NodeDataSource (fs), nel browser un'implementazione basata su fetch (dati statici)
// e IndexedDB (team salvati). I percorsi sono relativi alla radice dei dati (es. "seasons/...",
// "generated_teams/..."). Questo file non importa nulla di Node, così è bundlabile per il browser.
export interface DataSource {
  readText(relPath: string): Promise<string>; // lancia se la risorsa non esiste
  writeText(relPath: string, content: string): Promise<void>;
  list(relDir: string): Promise<string[]>; // nomi file nella cartella
}
