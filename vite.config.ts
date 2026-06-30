// Config Vite (ADR-009/ADR-011): root in web/, dati di stagione serviti come asset statici dalla
// cartella data/ del progetto (publicDir), così /seasons/season_MB.json è raggiungibile via fetch.
// In build si imposta `base` al sottopercorso di GitHub Pages, perché un sito di progetto vive sotto
// https://<utente>.github.io/<repo>/ e gli URL degli asset devono includere quel prefisso; in dev
// resta "/". Il fetch dei dati a runtime usa import.meta.env.BASE_URL (vedi web/main.ts), così segue
// lo stesso prefisso senza hardcodarlo.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const REPO_BASE = '/pok--competitive-teambuilder/'; // nome repo GitHub Pages (ADR-004)

export default defineConfig(({ command }) => ({
  root: join(root, 'web'),
  publicDir: join(root, 'data'),
  base: command === 'build' ? REPO_BASE : '/',
  build: {
    outDir: join(root, 'web', 'dist'),
    emptyOutDir: true,
    target: 'es2020',
  },
}));
