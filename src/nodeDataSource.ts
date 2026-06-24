// Implementazione Node di DataSource basata sul filesystem (ADR-009). Usata da CLI e server; il
// browser userà un'implementazione separata basata su fetch/IndexedDB. Solo Node (importa node:fs).
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DataSource } from './dataSource.js';

export class NodeDataSource implements DataSource {
  constructor(private readonly dataRoot: string) {}

  readText(relPath: string): Promise<string> {
    return readFile(join(this.dataRoot, relPath), 'utf8');
  }

  async writeText(relPath: string, content: string): Promise<void> {
    await writeFile(join(this.dataRoot, relPath), content, 'utf8');
  }

  list(relDir: string): Promise<string[]> {
    return readdir(join(this.dataRoot, relDir));
  }
}
