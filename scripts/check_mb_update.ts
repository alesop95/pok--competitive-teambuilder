// Controlla se è disponibile un aggiornamento dei dati del formato (la fonte è Pokémon Showdown via
// @pkmn/mods). Confronta la versione installata con l'ultima su npm e verifica un indicatore di
// freschezza dei dati Champions (le Mega della generazione Z-A, oggi assenti). Quando esce
// l'aggiornamento completo a M-B, questo script lo segnala. Sola lettura: non modifica nulla.
//
// Uso: npx tsx scripts/check_mb_update.ts   (oppure npm run check-mb)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getChampionsDex } from '../src/pkmnData.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  // versione installata: si legge il file package.json del pacchetto (i subpath exports lo nascondono all'import)
  const pkg = JSON.parse(await readFile(join(root, 'node_modules', '@pkmn', 'mods', 'package.json'), 'utf8'));
  const installed = pkg.version as string;

  let latest = 'sconosciuta';
  try {
    const res = await fetch('https://registry.npmjs.org/@pkmn%2Fmods/latest');
    if (res.ok) latest = ((await res.json()) as { version: string }).version;
  } catch {
    latest = '(offline)';
  }

  // indicatore di freschezza: presenza delle Mega Z-A non ancora nei dati (es. Mega Raichu, Mega Clefable)
  const dex = await getChampionsDex();
  const zaMega = ['Raichu', 'Clefable'].filter((n) => (dex.species.get(n)?.otherFormes ?? []).some((f) => /-Mega/.test(f)));

  console.log(`@pkmn/mods installato: ${installed}`);
  console.log(`@pkmn/mods ultima npm: ${latest}`);
  console.log(`Mega Z-A nei dati (Raichu/Clefable): ${zaMega.length ? zaMega.join(', ') : 'nessuna (M-B non ancora completo a monte)'}`);

  if (latest !== installed && latest !== 'sconosciuta' && latest !== '(offline)') {
    console.log('\nAGGIORNAMENTO DISPONIBILE. Procedura:');
    console.log('  npm update @pkmn/mods');
    console.log('  npm run roster && npm run legality   # rigenera roster e legalità da serebii');
    console.log('  npm run check-mb                      # riverifica le Mega Z-A');
  } else {
    console.log('\nSei sull\'ultima versione dei dati. Nessun aggiornamento M-B disponibile a monte.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
