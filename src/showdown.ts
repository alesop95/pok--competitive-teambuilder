// Import/export in formato testuale Pokémon Showdown (lo stesso di Smogon e del teambuilder ufficiale).
// Serve a due cose richieste: esportare i team proposti in un formato incollabile su Showdown e su
// calc.pokemonshowdown.com, e importare un team (anche parziale) per fornire vincoli iniziali alla
// generazione (membri già scelti, si completa fino a 6).
//
// La particolarità di Champions è lo spread in Stat Points (66 totali, max 32/stat) invece degli EV
// (252/stat). Qui si lavora nel formato EV standard di Showdown, mappando SP<->EV con gli helper
// condivisi spToEvs/evsToSp di setBuilder.ts (32 SP ~ 252 EV), così l'output è pienamente compatibile
// con gli altri tool. Il parsing/serializzazione robusti vengono da @pkmn/sets (MIT, stesso ecosistema)
// invece di un parser fatto a mano e fragile.
import { Sets, Team, type Data } from '@pkmn/sets';
import { spToEvs, evsToSp, type PokemonSet, type StatKey } from './setBuilder.js';

const LEVEL = 50; // Pokémon Champions: tutti i set a livello 50 (regola del formato)

// Serializza un team (i set completi del motore) nel formato testuale Showdown. Mappa Stat Points -> EV,
// fissa il livello a 50, e lascia che @pkmn/sets formatti nature, abilità, strumento e mosse in modo
// canonico. Nessun IV (Champions assume IV massimi) e nessun Tera (assente nel formato).
export function exportTeam(sets: PokemonSet[]): string {
  return sets
    .map((s) =>
      Sets.exportSet({
        species: s.species,
        item: s.item || undefined,
        ability: s.ability || undefined,
        level: LEVEL,
        nature: s.nature || undefined,
        evs: spToEvs(s.statPoints),
        moves: s.moves ?? [],
      }),
    )
    .join('\n');
}

// Un membro importato: il set ricostruito nel modello del motore (con Stat Points derivati dagli EV).
// La specie è quella scritta dall'utente (può essere una forma Mega, es. "Garchomp-Mega"); la
// risoluzione alla specie base del roster e la validazione di legalità avvengono nell'engine, che ha
// accesso alla dex e al manifesto di formato.
export type ImportedMember = PokemonSet;

// Parsa un team Showdown (anche parziale, 1-6 membri) in set del motore. Robusto a campi mancanti:
// uno schema minimale (solo nome e mosse) resta valido, con stat points vuoti e natura neutra.
export function importTeam(text: string, data?: Data): ImportedMember[] {
  const team = Team.import(text, data);
  if (!team) return [];
  const out: ImportedMember[] = [];
  for (const s of team.team) {
    const species = (s.species || s.name || '').trim();
    if (!species) continue;
    out.push({
      species,
      ability: (s.ability ?? '').toString(),
      item: (s.item ?? '').toString(),
      nature: (s.nature ?? 'Hardy').toString(),
      statPoints: evsToSp((s.evs ?? {}) as Partial<Record<StatKey, number>>),
      moves: (s.moves ?? []).filter(Boolean).map((m) => m.toString()),
    });
  }
  return out;
}
