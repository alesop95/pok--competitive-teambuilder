// Tagging dei ruoli (handoff §4.1). Per ogni Pokémon del roster assegna tag multipli in base a
// stats base, ability e movepool disponibile, con regole deterministiche. Questi tag sono gli
// stessi usati manualmente nell'analisi: l'obiettivo è renderli espliciti e riusabili dal codice.
//
// Stub di Fase 0: l'elenco dei tag riflette la tabella §4.1; la logica delle regole è Fase 1.
import type { SpeciesData } from './pkmnData.js';

export type RoleTag =
  | 'screens_setter'
  | 'trick_room_setter'
  | 'trick_room_abuser'
  | 'autonomous_sweeper'
  | 'redirection_support'
  | 'pivot'
  | 'weather_setter'
  | 'speed_control'
  | 'wallbreaker'
  | 'priority_closer';

export interface TaggedPokemon {
  species: string;
  tags: RoleTag[];
}

export function tagRoles(_pokemon: SpeciesData, _movepool: string[]): RoleTag[] {
  // TODO Fase 1: implementare le regole della tabella §4.1 (es. Prankster + Reflect/Light Screen
  // => screens_setter; base speed <= 60 + Trick Room => trick_room_setter; ecc.).
  return [];
}
