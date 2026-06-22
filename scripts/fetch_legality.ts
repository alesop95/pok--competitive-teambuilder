// Scraper deterministico della legalità di formato da serebii.net (ADR-006, handoff §8): estrae gli
// strumenti e le mosse disponibili in Pokémon Champions e li versiona in data/seasons/legal_<id>.json.
// Serve a validare i set proposti (es. uno strumento non disponibile nel formato va escluso).
//
// Uso: npx tsx scripts/fetch_legality.ts [season_id]   (default: MB)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ITEMS_URL = 'https://www.serebii.net/pokemonchampions/items.shtml';
const MOVES_URL = 'https://www.serebii.net/pokemonchampions/moves.shtml';
const __dirname = dirname(fileURLToPath(import.meta.url));

function extractNames(html: string, re: RegExp): string[] {
  const set = new Set<string>();
  for (const m of html.matchAll(re)) set.add(m[1].trim());
  return [...set].sort();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch fallito (${res.status}): ${url}`);
  return res.text();
}

async function main() {
  const seasonId = process.argv[2] ?? 'MB';
  const [itemsHtml, movesHtml] = await Promise.all([fetchText(ITEMS_URL), fetchText(MOVES_URL)]);

  const items = extractNames(itemsHtml, /<a href="\/itemdex\/[^"]+\.shtml">([^<]+)<\/a>/g);
  const moves = extractNames(movesHtml, /<a href="\/attackdex-champions\/[^"]+\.shtml">([^<]+)<\/a>/g);
  if (items.length === 0 || moves.length === 0) {
    throw new Error('Estrazione vuota: la struttura delle pagine serebii potrebbe essere cambiata.');
  }

  const file = join(__dirname, '..', 'data', 'seasons', `legal_${seasonId}.json`);
  await writeFile(
    file,
    JSON.stringify(
      {
        season_id: seasonId,
        sources: { items: ITEMS_URL, moves: MOVES_URL },
        generated_at: new Date().toISOString().slice(0, 10),
        items,
        moves,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`legal_${seasonId}.json: ${items.length} strumenti, ${moves.length} mosse.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
