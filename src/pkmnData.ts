// Wrapper unico sui dati di gioco (handoff §2.1, §3.1).
// Punto di accesso a @pkmn/dex (specie, stats base, abilità, movepool, type chart) e a
// @smogon/calc per il damage calc. Centralizzare qui l'accesso permette di applicare in un solo
// punto la mod "champions" e gli eventuali override di data/champions_overrides.json (ADR-005).
//
// Stub di Fase 0: l'integrazione effettiva di @pkmn/dex / @smogon/calc e la verifica
// dell'accessibilità della mod "champions" (via @pkmn/mods o dal repo Showdown) sono Fase 0/1.

export interface SpeciesData {
  species: string;
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  abilities: string[];
  types: string[];
}

export function getSpecies(_name: string): SpeciesData | null {
  // TODO Fase 1: leggere da @pkmn/dex (eventualmente con la mod "champions").
  return null;
}
