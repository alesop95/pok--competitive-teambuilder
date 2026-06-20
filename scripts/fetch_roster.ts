// Scraper deterministico del roster di stagione da serebii.net (ADR-006/007, handoff §8).
// Estrae la lista delle forme disponibili nel pool di Pokémon Champions dalla pagina ufficiale
// serebii e aggiorna SOLO il campo `available_pokemon` di data/seasons/season_<id>.json,
// preservando il blocco `regulation` curato a mano. Riproducibile: a ogni stagione si rilancia.
//
// Uso: npx tsx scripts/fetch_roster.ts [season_id]   (default: MB)
//
// Token-economy (rules/token-economy.md): il lavoro di parsing è deterministico e sta nel codice;
// nessun LLM legge le ~300 voci a mano. L'output è uno stato su disco ispezionabile (JSON).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const SEREBII_URL = 'https://www.serebii.net/pokemonchampions/pokemon.shtml';
const __dirname = dirname(fileURLToPath(import.meta.url));

interface RosterEntry {
  species: string;
  slug: string;
  source: string;
}

export function parseRoster(html: string): RosterEntry[] {
  // Ogni forma è un link-nome: <a href="/pokedex-champions/<slug>/">Nome<br ... </a>
  const re = /<a href="\/pokedex-champions\/([^"/]+)\/">([^<]+)<br/g;
  const seen = new Set<string>();
  const out: RosterEntry[] = [];
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    const species = m[2].trim();
    const key = `${species}::${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ species, slug, source: 'serebii pokemonchampions/pokemon.shtml' });
  }
  return out;
}

async function main() {
  const seasonId = process.argv[2] ?? 'MB';
  const file = join(__dirname, '..', 'data', 'seasons', `season_${seasonId}.json`);

  const res = await fetch(SEREBII_URL);
  if (!res.ok) throw new Error(`Fetch serebii fallito: HTTP ${res.status}`);
  const html = await res.text();
  const roster = parseRoster(html);
  if (roster.length === 0) throw new Error('Nessuna voce estratta: la struttura della pagina serebii potrebbe essere cambiata.');

  const season = JSON.parse(await readFile(file, 'utf8'));
  season.available_pokemon = roster;
  season.available_pokemon_note = `Generato da scripts/fetch_roster.ts il ${new Date().toISOString().slice(0, 10)} da ${SEREBII_URL}. ${roster.length} forme (le forme regionali che condividono nome+slug sono unite: da raffinare se serve distinguerle).`;
  await writeFile(file, JSON.stringify(season, null, 2) + '\n', 'utf8');

  const baseSpecies = new Set(roster.map((r) => r.slug)).size;
  console.log(`season_${seasonId}.json aggiornato: ${roster.length} forme, ${baseSpecies} specie base.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
