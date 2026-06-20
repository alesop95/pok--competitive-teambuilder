// CLI offline della Fase 1 (handoff §7, fase 1): dato il roster di stagione, tagga i Pokémon,
// genera le proposte di team e scrive un report Markdown + un JSON timestampato in
// data/generated_teams/. Nessuna chiamata di rete (rationale Livello 1).
//
// Uso: npx tsx scripts/generate.ts [season_id]   (default: MB)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';
import { buildCandidates, getThreatTypes } from '../src/pkmnData.js';
import { generateTeams, type MetaContext } from '../src/teamGenerator.js';
import { buildRationale } from '../src/rationale.js';
import type { RoleTag } from '../src/roleTagging.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function loadMeta(seasonId: string): Promise<MetaContext> {
  try {
    const raw = await readFile(join(root, 'data', 'seasons', `season_${seasonId}_meta.yaml`), 'utf8');
    const doc = yaml.load(raw) as { top_threats?: Array<{ species: string }> } | null;
    return { topThreats: (doc?.top_threats ?? []).map((t) => t.species) };
  } catch {
    return { topThreats: [] }; // meta non ancora curato
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

async function main() {
  const seasonId = process.argv[2] ?? 'MB';
  const season = JSON.parse(await readFile(join(root, 'data', 'seasons', `season_${seasonId}.json`), 'utf8'));

  // specie base uniche dal roster (gli slug uniti le Mega alla forma base)
  const slugs = [...new Set((season.available_pokemon ?? []).map((p: { slug: string }) => p.slug))] as string[];
  console.log(`Roster ${seasonId}: ${slugs.length} specie base. Tagging in corso...`);
  const candidates = await buildCandidates(slugs);
  console.log(`Candidati arricchiti: ${candidates.length}.`);

  const meta = await loadMeta(seasonId);
  const threatTypes = await getThreatTypes(meta.topThreats);
  const teams = generateTeams(candidates, { topN: 5, meta, threatTypes });

  const tagsBySpecies: Record<string, RoleTag[]> = {};
  for (const c of candidates) tagsBySpecies[c.species] = c.tags;

  // report Markdown
  const md: string[] = [`# Proposte di team — Stagione ${seasonId} (${season.format})`, ''];
  md.push(`Regolamento: ${season.regulation?.name ?? seasonId}. Minacce meta considerate: ${meta.topThreats.length || 'nessuna (meta non ancora curato)'}.`, '');
  for (const t of teams) md.push(buildRationale(t, tagsBySpecies, 1), '');
  const markdown = md.join('\n');

  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = join(root, 'data', 'generated_teams', `${stamp}`);
  await writeFile(`${base}.json`, JSON.stringify({ season_id: seasonId, generated_at: now.toISOString(), meta, teams }, null, 2) + '\n', 'utf8');
  await writeFile(`${base}.md`, markdown + '\n', 'utf8');

  console.log(`\n${markdown}\n`);
  console.log(`Scritti: data/generated_teams/${stamp}.json e ${stamp}.md`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
