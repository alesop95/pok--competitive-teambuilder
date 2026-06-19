// Generazione candidati team (handoff §4.2). Incrocia i tag di ruolo per identificare gli
// archetipi disponibili nel roster, costruisce un core (2-3 Pokémon), riempie gli slot rimanenti
// massimizzando coverage difensiva e offensiva contro i top_threats del meta, e assegna un
// punteggio finale per ordinare i team. Ritorna i top 3-5.
//
// Stub di Fase 0: i tipi descrivono il contratto; lo scoring e la costruzione sono Fase 1-3.
import type { TaggedPokemon } from './roleTagging.js';

export interface TeamProposal {
  members: string[];
  archetype: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  expectedCounters: string[];
}

export interface MetaContext {
  topThreats: string[];
}

export function generateTeams(_roster: TaggedPokemon[], _meta: MetaContext): TeamProposal[] {
  // TODO Fase 1-3: identificare archetipi, costruire core, riempire slot, calcolare lo score
  // (sinergia core + coverage difensiva + coverage offensiva vs meta threats - penalità buchi).
  return [];
}
