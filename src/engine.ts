// Orchestrazione del motore (handoff §4): lega data layer, tagging, generazione e rationale.
// Riusato sia dalla CLI (scripts/generate.ts) sia dal server Fastify (Fase 2). Legge i file dati
// sotto data/seasons/ e mantiene una cache in memoria dei candidati per stagione, così il tagging
// delle ~200 specie avviene una sola volta per processo.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';
import { buildCandidates, getThreatTypes, getMegaForme, teamWeather, teamTerrain, getDefenseMap } from './pkmnData.js';
import { generateTeams, type Candidate, type MetaContext, type TeamProposal, type CoreSpec } from './teamGenerator.js';
import { buildRationale } from './rationale.js';
import { bestDamagePercent, type Weather, type Terrain } from './calc.js';
import { buildSet, type PokemonSet } from './setBuilder.js';
import { toID, type RoleTag } from './roleTagging.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const seasonsDir = join(ROOT, 'data', 'seasons');
const generatedDir = join(ROOT, 'data', 'generated_teams');

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

// --- Salvataggio e storico dei team generati (handoff §2.4/§3.4; pagina dettaglio/esporta §5) ---

const pad = (n: number): string => String(n).padStart(2, '0');
const SAFE_NAME = /^[A-Za-z0-9_-]+$/; // nomi file storico: niente path traversal

export interface SavedSummary {
  name: string;
  season_id?: string;
  generated_at?: string;
  label?: string;
  count: number;
}

// Salva le proposte come JSON timestampato e diffabile in data/generated_teams/. Ritorna il nome file.
export async function saveTeams(seasonId: string, teams: unknown[], label?: string): Promise<string> {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const slug = label ? '_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) : '';
  const name = `${stamp}${slug}`;
  await writeFile(join(generatedDir, `${name}.json`), JSON.stringify({ season_id: seasonId, generated_at: now.toISOString(), label, teams }, null, 2) + '\n', 'utf8');
  return name;
}

export async function listSavedTeams(): Promise<SavedSummary[]> {
  let files: string[] = [];
  try {
    files = (await readdir(generatedDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const out: SavedSummary[] = [];
  for (const f of files) {
    const name = f.replace(/\.json$/, '');
    try {
      const doc = JSON.parse(await readFile(join(generatedDir, f), 'utf8'));
      out.push({ name, season_id: doc.season_id, generated_at: doc.generated_at, label: doc.label, count: (doc.teams ?? []).length });
    } catch {
      out.push({ name, count: 0 });
    }
  }
  return out.sort((a, b) => (b.name > a.name ? 1 : -1)); // più recenti in alto
}

export async function loadSavedTeam(name: string): Promise<unknown> {
  if (!SAFE_NAME.test(name)) throw new Error('nome non valido');
  return JSON.parse(await readFile(join(generatedDir, `${name}.json`), 'utf8'));
}

// --- Legalità di formato (data/seasons/legal_<id>.json da scripts/fetch_legality.ts) ---

export interface Legality {
  items: Set<string>;
  moves: Set<string>;
}

const legalityCache = new Map<string, Legality | null>();

export async function loadLegality(id: string): Promise<Legality | null> {
  if (legalityCache.has(id)) return legalityCache.get(id)!;
  let legality: Legality | null = null;
  try {
    const doc = JSON.parse(await readFile(join(seasonsDir, `legal_${id}.json`), 'utf8'));
    legality = {
      items: new Set<string>((doc.items ?? []).map(toID)),
      moves: new Set<string>((doc.moves ?? []).map(toID)),
    };
  } catch {
    legality = null; // manifesto assente: nessuna validazione
  }
  legalityCache.set(id, legality);
  return legality;
}

// Valida un set contro la legalità del formato: se lo strumento non è disponibile lo sostituisce con
// un fallback legale, e segnala le mosse fuori lista. Ritorna i messaggi (vuoto se tutto legale).
export function validateSet(set: PokemonSet, legality: Legality): string[] {
  const warnings: string[] = [];
  if (legality.items.size && !legality.items.has(toID(set.item))) {
    warnings.push(`strumento ${set.item} non disponibile in formato: sostituito con Sitrus Berry`);
    set.item = 'Sitrus Berry';
  }
  if (legality.moves.size) {
    const illegal = set.moves.filter((m) => !legality.moves.has(toID(m)));
    for (const m of illegal) warnings.push(`mossa ${m} (${set.species}) non in lista formato`);
  }
  return warnings;
}

// Pesi della viability, in un punto solo per tuning e documentazione (somma 1.0). Vedi TECHNICAL §4.4.
const VIABILITY_WEIGHTS = { offense: 0.4, defense: 0.2, bulk: 0.18, bst: 0.12, speed: 0.1 };

// Calcola la viability competitiva [0..1] di ogni candidato rispetto al meta corrente.
// Offensiva: media del miglior danno reale sulle minacce (damage calc). Difensiva: frazione di
// minacce a cui resiste in modo solido. Più un livello statistico grezzo. I calc sono memoizzati.
async function computeViability(candidates: Candidate[], threats: string[], threatTypes: Map<string, string[]>): Promise<void> {
  for (const c of candidates) {
    let offSum = 0;
    for (const threat of threats) {
      const d = await bestDamagePercent(c.species, threat);
      offSum += d ? Math.min(d.pctMax, 150) : 0;
    }
    const metaOffense = threats.length ? Math.min(offSum / threats.length / 100, 1) : 0;
    let defCount = 0;
    for (const threat of threats) {
      const tt = threatTypes.get(threat);
      if (tt && tt.some((ty) => (c.defense[ty] ?? 1) < 1) && !tt.some((ty) => (c.defense[ty] ?? 1) > 1)) defCount++;
    }
    const metaDefense = threats.length ? defCount / threats.length : 0;
    const bstNorm = Math.min(c.bst / 700, 1);
    // stazza: un attaccante fragile (es. Pyroar) non deve battere mostri solidi solo per il danno
    // grezzo. La sopravvivenza pesa accanto a offesa, difesa di tipo e livello statistico.
    const bulkNorm = Math.min((c.baseStats.hp + c.baseStats.def + c.baseStats.spd) / 320, 1);
    // la velocità conta: a parità, un attaccante più veloce colpisce prima ed è più prezioso.
    const speedNorm = Math.min(c.baseStats.spe / 130, 1);
    const w = VIABILITY_WEIGHTS;
    c.viability = w.offense * metaOffense + w.defense * metaDefense + w.bulk * bulkNorm + w.bst * bstNorm + w.speed * speedNorm;
  }
}

export interface FieldOverride {
  weather?: Weather | 'none';
  terrain?: Terrain | 'none';
}

// Converte gli Stat Points di Champions del set in EV per il damage calc: 32 SP (il massimo) ~ 252
// EV, in proporzione. Permette di valutare il danno in arrivo sulla stazza reale del set (§4.8).
function spToEvs(sp: PokemonSet['statPoints']): Record<string, number> {
  const evs: Record<string, number> = {};
  for (const [k, v] of Object.entries(sp)) evs[k] = Math.min(252, (v ?? 0) * 8);
  return evs;
}

export async function generateForSeason(id: string, topN = 5, override: FieldOverride = {}): Promise<EnrichedTeam[]> {
  const season = await loadSeason(id);
  const metaFile = await loadMeta(id);
  const candidates = await getCandidates(id, season);

  const meta: MetaContext = { topThreats: (metaFile.top_threats ?? []).map((t) => t.species) };
  const threatTypes = await getThreatTypes(meta.topThreats);
  const cores: CoreSpec[] = (metaFile.common_cores ?? []).map((c) => ({ members: c.members, archetype: c.archetype }));
  const legality = await loadLegality(id);

  // valore di coverage per tipo: quante minacce del meta un attacco di quel tipo colpisce in modo
  // super-efficace. Guida la scelta della mossa di coverage dei set verso il meta reale (refinement 3).
  const coverageValue: Record<string, number> = {};
  for (const threat of meta.topThreats) {
    const tt = threatTypes.get(threat);
    if (!tt) continue;
    const dm = await getDefenseMap(tt);
    for (const [atkType, mult] of Object.entries(dm)) if (mult > 1) coverageValue[atkType] = (coverageValue[atkType] ?? 0) + 1;
  }

  // Viability competitiva per candidato: pressione offensiva reale sul meta (damage calc), copertura
  // difensiva del meta e livello statistico. Guida la selezione, così i set proposti sono dominati da
  // Pokémon davvero forti nel formato e non da mostri deboli ma versatili. I calc sono memoizzati.
  await computeViability(candidates, meta.topThreats, threatTypes);

  // genera le proposte (core per viability + diversità + core di meta), poi affina con la coverage
  // offensiva reale e riordina; il topN si applica dopo, così la scelta tiene conto del danno verificato.
  const proposals = generateTeams(candidates, { topN: 99, meta, threatTypes, cores });

  const tagsBySpecies: Record<string, RoleTag[]> = {};
  for (const c of candidates) tagsBySpecies[c.species] = c.tags;

  const enriched: EnrichedTeam[] = [];
  for (const t of proposals) {
    const roles: Record<string, RoleTag[]> = {};
    for (const m of t.members) roles[m] = tagsBySpecies[m] ?? [];

    // coverage offensiva: per ogni minaccia meta, la risposta migliore (danno massimo) del team.
    // Se il team imposta un meteo (weather setter tra i membri), l'offesa è calcolata sotto quel
    // meteo: così un team pioggia vede i suoi attacchi Acqua potenziati. Default neutro altrimenti.
    // meteo/terreno: override manuale dalla UI se presente ('none' forza neutro), altrimenti il
    // meteo/terreno impostato dal team stesso (auto). Default neutro.
    const weather = override.weather !== undefined ? (override.weather === 'none' ? undefined : override.weather) : await teamWeather(t.members);
    const terrain = override.terrain !== undefined ? (override.terrain === 'none' ? undefined : override.terrain) : await teamTerrain(t.members);
    const offensive: OffensiveAnswer[] = [];
    for (const threat of meta.topThreats) {
      let best: OffensiveAnswer | null = null;
      for (const m of t.members) {
        const d = await bestDamagePercent(m, threat, { weather, terrain });
        if (d && (!best || d.pctMax > best.pctMax)) {
          best = { threat, by: m, move: d.move, pctMax: d.pctMax, answered: d.pctMax >= 50 };
        }
      }
      if (best) offensive.push(best);
    }
    const answered = offensive.filter((o) => o.answered).length;
    const finalScore = Math.round((t.score + answered * 0.5) * 100) / 100;

    // scegli UN solo membro da far megaevolvere (in M-B si megaevolve un solo Pokémon per battaglia):
    // la Mega con la somma statistiche più alta tra i membri che ne hanno una.
    let megaMember: string | null = null;
    let bestMegaBst = -1;
    for (const m of t.members) {
      const mf = await getMegaForme(m);
      if (mf && mf.bst > bestMegaBst) {
        bestMegaBst = mf.bst;
        megaMember = m;
      }
    }

    // set competitivo completo per ogni membro (item, abilità, natura, Stat Points, mosse).
    // Il contesto Trick Room del team determina nature/spread (lento+Brave/Quiet solo in team TR).
    const trickRoom = t.archetype.includes('Trick Room');
    const notes = [...t.notes];
    // ruoli che devono reggere i colpi; un attaccante fragile OHKO è atteso per ruolo e non si segnala.
    const DEFENSIVE_ROLES: RoleTag[] = ['screens_setter', 'redirection_support', 'pivot', 'trick_room_setter', 'weather_setter'];

    const sets: PokemonSet[] = [];
    let worstVuln = { pct: 0, species: '', by: '' };
    for (const m of t.members) {
      const memberRoles = roles[m] ?? [];
      const s = await buildSet(m, memberRoles, { mega: m === megaMember, trickRoom, coverageValue });
      if (!s) continue;
      sets.push(s);

      // Vulnerabilità strutturale (TECHNICAL §4.8): il danno in arrivo è valutato sulla STAZZA REALE
      // del set (Stat Points convertiti in EV), non più sul 252 fisso, così la sopravvivenza è
      // misurata sul set vero. Si considerano i membri di ruolo difensivo (che dovrebbero reggere) e
      // si tiene solo la vulnerabilità peggiore della squadra, segnalata con una singola nota.
      if (memberRoles.some((r) => DEFENSIVE_ROLES.includes(r))) {
        const defenderEVs = spToEvs(s.statPoints);
        for (const threat of meta.topThreats) {
          const d = await bestDamagePercent(threat, s.species, { weather, terrain, defenderEVs, defenderNature: s.nature });
          if (d && d.pctMax > worstVuln.pct) worstVuln = { pct: d.pctMax, species: s.species, by: threat };
        }
      }
    }
    if (worstVuln.pct > 100) {
      notes.push(`debolezza strutturale: ${worstVuln.species} (ruolo difensivo) e OHKO da ${worstVuln.by} (circa ${Math.round(worstVuln.pct)}%) con lo spread del set`);
    }

    // validazione di legalità del formato (corregge strumenti non disponibili, segnala mosse fuori lista)
    if (legality) for (const s of sets) notes.push(...validateSet(s, legality));

    const enrichedTeam: EnrichedTeam = {
      ...t,
      score: finalScore,
      baseScore: t.score,
      roles,
      offensive,
      sets,
      notes,
      rationale: '',
    };
    enrichedTeam.rationale = buildRationale(enrichedTeam, tagsBySpecies, offensive, sets);
    enriched.push(enrichedTeam);
  }

  enriched.sort((a, b) => b.score - a.score);
  return enriched.slice(0, topN);
}
