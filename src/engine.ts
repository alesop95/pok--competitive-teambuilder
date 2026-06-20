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
import { bestDamagePercent } from './calc.js';
import { buildSet, type PokemonSet } from './setBuilder.js';
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

export interface OffensiveAnswer {
  threat: string;
  by: string; // membro del team che colpisce meglio
  move: string;
  pctMax: number; // danno massimo (% degli HP della minaccia), spread standard
  answered: boolean; // true se >= 50% (risposta offensiva reale in doppio)
}

export interface EnrichedTeam extends TeamProposal {
  roles: Record<string, RoleTag[]>;
  baseScore: number; // punteggio difensivo/sinergia prima della coverage offensiva
  offensive: OffensiveAnswer[];
  sets: PokemonSet[]; // set completo (item, abilità, natura, Stat Points, mosse) per ogni membro
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
  // genera tutte le proposte di archetipo, poi affina con la coverage offensiva reale (Fase 3) e
  // riordina; il topN si applica dopo, così la scelta tiene conto anche del danno verificato.
  const proposals = generateTeams(candidates, { topN: 99, meta, threatTypes });

  const tagsBySpecies: Record<string, RoleTag[]> = {};
  for (const c of candidates) tagsBySpecies[c.species] = c.tags;

  const enriched: EnrichedTeam[] = [];
  for (const t of proposals) {
    const roles: Record<string, RoleTag[]> = {};
    for (const m of t.members) roles[m] = tagsBySpecies[m] ?? [];

    // coverage offensiva: per ogni minaccia meta, la risposta migliore (danno massimo) del team
    const offensive: OffensiveAnswer[] = [];
    for (const threat of meta.topThreats) {
      let best: OffensiveAnswer | null = null;
      for (const m of t.members) {
        const d = await bestDamagePercent(m, threat);
        if (d && (!best || d.pctMax > best.pctMax)) {
          best = { threat, by: m, move: d.move, pctMax: d.pctMax, answered: d.pctMax >= 50 };
        }
      }
      if (best) offensive.push(best);
    }
    const answered = offensive.filter((o) => o.answered).length;
    const finalScore = Math.round((t.score + answered * 0.5) * 100) / 100;

    // set competitivo completo per ogni membro (item, abilità, natura, Stat Points, mosse)
    const sets: PokemonSet[] = [];
    for (const m of t.members) {
      const s = await buildSet(m, roles[m] ?? []);
      if (s) sets.push(s);
    }

    const enrichedTeam: EnrichedTeam = {
      ...t,
      score: finalScore,
      baseScore: t.score,
      roles,
      offensive,
      sets,
      rationale: '',
    };
    enrichedTeam.rationale = buildRationale(enrichedTeam, tagsBySpecies, offensive, sets);
    enriched.push(enrichedTeam);
  }

  enriched.sort((a, b) => b.score - a.score);
  return enriched.slice(0, topN);
}
