// Wrapper unico sui dati di gioco (handoff §2.1, §3.1; ADR-005, ADR-007).
// Punto di accesso a @pkmn/dex con la mod "champions" applricata via @pkmn/mods: specie, stats base,
// abilità, movepool, mosse, strumenti e regole del formato Pokémon Champions. Centralizzare qui
// l'accesso permette di applicare in un solo punto la mod e gli eventuali override di
// data/champions_overrides.json. Il damage calc reale (@smogon/calc) si aggancia da qui in Fase 3.
import { Dex, type ID, type ModData } from '@pkmn/dex';

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
