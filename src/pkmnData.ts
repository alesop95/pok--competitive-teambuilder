// Wrapper unico sui dati di gioco (handoff §2.1, §3.1; ADR-005, ADR-007).
// Punto di accesso a @pkmn/dex con la mod "champions" applricata via @pkmn/mods: specie, stats base,
// abilità, movepool, mosse, strumenti e regole del formato Pokémon Champions. Centralizzare qui
// l'accesso permette di applicare in un solo punto la mod e gli eventuali override di
// data/champions_overrides.json. Il damage calc reale (@smogon/calc) si aggancia da qui in Fase 3.
import { Dex, type ID, type ModData } from '@pkmn/dex';
import { tagRoles, type TaggingInput, type MoveInfo, type RoleTag } from './roleTagging.js';

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
