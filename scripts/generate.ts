// CLI offline della Fase 1 (handoff §7, fase 1): dato il roster di stagione, genera le proposte di
// team e scrive un report Markdown + un JSON timestampato in data/generated_teams/. Nessuna chiamata
// di rete (rationale Livello 1). Riusa il motore condiviso src/engine.ts.
//
// Uso: npx tsx scripts/generate.ts [season_id]   (default: MB)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { generateForSeason, loadSeason, loadMeta } from '../src/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pad = (n: number): string => String(n).padStart(2, '0');

async function main() {
  const seasonId = process.argv[2] ?? 'MB';
  const season = await loadSeason(seasonId);
  const meta = await loadMeta(seasonId);
  console.log(`Stagione ${seasonId} (${season.format}). Tagging e generazione...`);
  const teams = await generateForSeason(seasonId, 5);

  const md: string[] = [`# Proposte di team - Stagione ${seasonId} (${season.format})`, ''];
  md.push(
    `Regolamento: ${season.regulation?.name ?? seasonId}. Minacce meta considerate: ${(meta.top_threats ?? []).length || 'nessuna (meta non curato)'}.`,
    '',
  );
  for (const t of teams) md.push(t.rationale, '');
  const markdown = md.join('\n');

  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = join(root, 'data', 'generated_teams', stamp);
  await writeFile(`${base}.json`, JSON.stringify({ season_id: seasonId, generated_at: now.toISOString(), teams }, null, 2) + '\n', 'utf8');
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
