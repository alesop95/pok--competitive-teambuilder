// Wrapper unico sui dati di gioco (handoff §2.1, §3.1; ADR-005, ADR-007).
// Punto di accesso a @pkmn/dex con la mod "champions" applricata via @pkmn/mods: specie, stats base,
// abilità, movepool, mosse, strumenti e regole del formato Pokémon Champions. Centralizzare qui
// l'accesso permette di applicare in un solo punto la mod e gli eventuali override di
// data/champions_overrides.json. Il damage calc reale (@smogon/calc) si aggancia da qui in Fase 3.
import { Dex, type ID, type ModData } from '@pkmn/dex';
import { tagRoles, type TaggingInput, type MoveInfo, type RoleTag } from './roleTagging.js';
import type { Candidate } from './teamGenerator.js';

// Carica la mod "champions" (Gen 9 + dati/logica di Pokémon Champions). Il cast a ModData è quello
// raccomandato dal README di @pkmn/mods per via delle differenze di tipo tra @pkmn/sim e @pkmn/dex.
let championsDex: ReturnType<typeof Dex.mod> | undefined;

export async function getChampionsDex() {
  if (!championsDex) {
    const mod = (await import('@pkmn/mods/champions')) as unknown as ModData;
    championsDex = Dex.mod('champions' as ID, mod);
  }
  return championsDex;
}

export interface SpeciesData {
  species: string;
  types: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  abilities: string[];
}

// Restituisce i dati di una specie dalla dex Champions, o null se non esiste nel formato.
export async function getSpecies(name: string): Promise<SpeciesData | null> {
  const dex = await getChampionsDex();
  const s = dex.species.get(name);
  if (!s?.exists) return null;
  return {
    species: s.name,
    types: s.types,
    baseStats: s.baseStats,
    abilities: Object.values(s.abilities).filter(Boolean) as string[],
  };
}

// Assembla l'input per il tagging dei ruoli (§4.1) leggendo stats, abilità e movepool reali dalla
// dex champions. Ritorna null se la specie non esiste. Il movepool arriva dalla learnset; per ogni
// mossa si estraggono priorità, potenza base e categoria, necessarie ad alcune regole di tagging.
export async function getTaggingInput(name: string): Promise<TaggingInput | null> {
  const dex = await getChampionsDex();
  const s = dex.species.get(name);
  if (!s?.exists) return null;

  const learnset = await dex.learnsets.get(s.id);
  const moves: Record<string, MoveInfo> = {};
  for (const moveId of Object.keys(learnset?.learnset ?? {})) {
    const m = dex.moves.get(moveId);
    if (!m?.exists) continue;
    moves[moveId] = {
      priority: m.priority,
      basePower: m.basePower,
      category: m.category as MoveInfo['category'],
    };
  }

  return {
    baseStats: s.baseStats,
    abilities: Object.values(s.abilities).filter(Boolean) as string[],
    moves,
  };
}

// Comodità: tagga i ruoli di una specie direttamente dalla dex champions.
export async function tagSpecies(name: string): Promise<RoleTag[]> {
  const input = await getTaggingInput(name);
  return input ? tagRoles(input) : [];
}

// Codifica del type chart di @pkmn/dex (campo damageTaken): 0 neutro, 1 debole (2x), 2 resiste
// (0.5x), 3 immune (0x). Calcola la mappa difensiva di una combinazione di tipi.
const CODE_TO_MULT: Record<number, number> = { 0: 1, 1: 2, 2: 0.5, 3: 0 };

export async function getDefenseMap(types: string[]): Promise<Record<string, number>> {
  const dex = await getChampionsDex();
  const attackingTypes = dex.types.all().map((t) => t.name);
  const map: Record<string, number> = {};
  for (const atk of attackingTypes) {
    let mult = 1;
    for (const def of types) {
      const code = dex.types.get(def).damageTaken[atk];
      mult *= CODE_TO_MULT[code] ?? 1;
    }
    map[atk] = mult;
  }
  return map;
}

// Arricchisce un elenco di specie in candidati per il generatore di team (§4.2): tag di ruolo,
// tipi, numero Pokédex (per la Species Clause) e mappa difensiva di type-effectiveness.
export async function buildCandidates(names: string[]): Promise<Candidate[]> {
  const dex = await getChampionsDex();
  const out: Candidate[] = [];
  for (const name of names) {
    const s = dex.species.get(name);
    if (!s?.exists) continue;
    const input = await getTaggingInput(name);
    const bst = Object.values(s.baseStats as Record<string, number>).reduce((a, b) => a + b, 0);
    out.push({
      species: s.name,
      dexNum: s.num,
      tags: input ? tagRoles(input) : [],
      types: s.types,
      defense: await getDefenseMap(s.types),
      baseStats: s.baseStats as Candidate['baseStats'],
      bst,
      viability: 0, // riempita dall'engine con damage calc + copertura meta
    });
  }
  return out;
}

// Mega evoluzione di una specie base, se esiste: nome della forma, Mega Stone richiesta e somma
// delle statistiche base (per scegliere quale membro far megaevolvere). Esclude le forme regionali
// (es. -Alola): una Mega ha requiredItem che è una Mega Stone. Nota: le nuove Mega Z-A del formato
// (es. Mega Raichu X) non sempre sono esposte via otherFormes e qui non vengono catturate.
export interface MegaForme {
  forme: string;
  stone: string;
  bst: number;
}

export async function getMegaForme(baseName: string): Promise<MegaForme | null> {
  const dex = await getChampionsDex();
  const base = dex.species.get(baseName);
  if (!base?.exists) return null;
  for (const formeName of base.otherFormes ?? []) {
    const forme = dex.species.get(formeName);
    const stone = forme?.requiredItem ? dex.items.get(forme.requiredItem) : null;
    if (forme?.exists && stone?.exists && stone.megaStone) {
      const bst = Object.values(forme.baseStats as Record<string, number>).reduce((a, b) => a + b, 0);
      return { forme: forme.name, stone: stone.name, bst };
    }
  }
  return null;
}

// Tipi delle specie-minaccia del meta, per la coverage difensiva nel team scoring (§4.2).
export async function getThreatTypes(names: string[]): Promise<Map<string, string[]>> {
  const dex = await getChampionsDex();
  const map = new Map<string, string[]>();
  for (const name of names) {
    const s = dex.species.get(name);
    if (s?.exists) map.set(name, s.types);
  }
  return map;
}
