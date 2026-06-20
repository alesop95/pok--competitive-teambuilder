// Orchestrazione del motore (handoff §4): lega data layer, tagging, generazione e rationale.
// Riusato sia dalla CLI (scripts/generate.ts) sia dal server Fastify (Fase 2). Legge i file dati
// sotto data/seasons/ e mantiene una cache in memoria dei candidati per stagione, così il tagging
// delle ~200 specie avviene una sola volta per processo.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';
import { buildCandidates, getThreatTypes } from './pkmnData.js';
import { generateTeams, type Candidate, type MetaContext, type TeamProposal } from './teamGenerator.js';
import { buildRationale } from './rationale.js';
import type { RoleTag } from './roleTagging.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const seasonsDir = join(ROOT, 'data', 'seasons');

export interface SeasonFile {
  season_id: string;
  format: string;
  regulation?: { name?: string };
  available_pokemon?: Array<{ species: string; slug: string }>;
}

export interface MetaFile {
  top_threats?: Array<{ species: string; role_tags?: string[]; why_relevant?: string }>;
  common_cores?: Array<{ members: string[]; archetype: string }>;
}

export interface EnrichedTeam extends TeamProposal {
  roles: Record<string, RoleTag[]>;
  rationale: string;
}

const candidateCache = new Map<string, Candidate[]>();

export async function listSeasons(): Promise<string[]> {
  const files = await readdir(seasonsDir);
  return files
    .filter((f) => /^season_.+\.json$/.test(f))
    .map((f) => f.replace(/^season_(.+)\.json$/, '$1'));
}

export async function loadSeason(id: string): Promise<SeasonFile> {
  return JSON.parse(await readFile(join(seasonsDir, `season_${id}.json`), 'utf8'));
}

export async function loadMeta(id: string): Promise<MetaFile> {
  try {
    return (yaml.load(await readFile(join(seasonsDir, `season_${id}_meta.yaml`), 'utf8')) as MetaFile) ?? {};
  } catch {
    return {};
  }
}

// Salva il meta come YAML. Usato dall'editor meta della UI (handoff §5, pagina 2).
export async function saveMeta(id: string, meta: MetaFile): Promise<void> {
  const doc = yaml.dump({ season_id: id, ...meta }, { lineWidth: 100 });
  await writeFile(join(seasonsDir, `season_${id}_meta.yaml`), doc, 'utf8');
}

// Editor YAML grezzo del meta (handoff §5: "editor testo grezzo del YAML"). loadMetaRaw ritorna il
// testo del file; saveMetaRaw lo valida (parse) prima di scrivere e invalida la cache candidati.
export async function loadMetaRaw(id: string): Promise<string> {
  try {
    return await readFile(join(seasonsDir, `season_${id}_meta.yaml`), 'utf8');
  } catch {
    return `season_id: ${id}\ntop_threats: []\ncommon_cores: []\n`;
  }
}

export async function saveMetaRaw(id: string, text: string): Promise<void> {
  yaml.load(text); // valida: lancia se YAML non valido
  await writeFile(join(seasonsDir, `season_${id}_meta.yaml`), text, 'utf8');
}

async function getCandidates(id: string, season: SeasonFile): Promise<Candidate[]> {
  const cached = candidateCache.get(id);
  if (cached) return cached;
  const slugs = [...new Set((season.available_pokemon ?? []).map((p) => p.slug))];
  const candidates = await buildCandidates(slugs);
  candidateCache.set(id, candidates);
  return candidates;
}

export function clearCandidateCache(id?: string): void {
  if (id) candidateCache.delete(id);
  else candidateCache.clear();
}

export async function generateForSeason(id: string, topN = 5): Promise<EnrichedTeam[]> {
  const season = await loadSeason(id);
  const metaFile = await loadMeta(id);
  const candidates = await getCandidates(id, season);

  const meta: MetaContext = { topThreats: (metaFile.top_threats ?? []).map((t) => t.species) };
  const threatTypes = await getThreatTypes(meta.topThreats);
  const teams = generateTeams(candidates, { topN, meta, threatTypes });

  const tagsBySpecies: Record<string, RoleTag[]> = {};
  for (const c of candidates) tagsBySpecies[c.species] = c.tags;

  return teams.map((t) => {
    const roles: Record<string, RoleTag[]> = {};
    for (const m of t.members) roles[m] = tagsBySpecies[m] ?? [];
    return { ...t, roles, rationale: buildRationale(t, tagsBySpecies, 1) };
  });
}
