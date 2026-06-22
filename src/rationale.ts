// Generazione del testo di rationale (handoff §4.3), a due livelli.
//
// Livello 1 (qui implementato): deterministico e offline. Combina i fatti strutturati prodotti dal
// generatore (archetipo, membri, ruoli, debolezze impilate, note di coverage) in testo Markdown
// leggibile. Niente AI, zero costi, funziona sempre.
//
// Livello 2 (hook, Fase 4): passa gli stessi fatti all'API Claude per prosa più naturale, dietro
// ANTHROPIC_API_KEY; degrada con grazia al Livello 1 se la chiave non c'è.
import type { TeamProposal } from './teamGenerator.js';
import type { RoleTag } from './roleTagging.js';
import type { PokemonSet } from './setBuilder.js';

const formatSP = (sp: PokemonSet['statPoints']): string =>
  Object.entries(sp).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' / ') || '-';

export type RationaleLevel = 1 | 2;

// Risposta offensiva a una minaccia meta, con danno reale da @smogon/calc (Fase 3).
export interface OffensiveCoverageItem {
  threat: string;
  by: string;
  move: string;
  pctMax: number;
  answered: boolean;
}

const ROLE_LABELS: Record<RoleTag, string> = {
  screens_setter: 'schermi',
  trick_room_setter: 'setter di Trick Room',
  trick_room_abuser: 'abuser di Trick Room',
  autonomous_sweeper: 'sweeper autonomo',
  redirection_support: 'redirezione',
  pivot: 'pivot',
  weather_setter: 'setter meteo',
  speed_control: 'controllo velocità',
  wallbreaker: 'wallbreaker',
  priority_closer: 'closer di priorità',
};

const describeRoles = (tags: RoleTag[]): string =>
  tags.length ? tags.map((t) => ROLE_LABELS[t]).join(', ') : 'ruolo di supporto generico';

// Livello 1: rationale deterministico in Markdown per una proposta di team.
export function buildRationaleL1(
  team: TeamProposal,
  perMemberTags: Record<string, RoleTag[]> = {},
  offensive: OffensiveCoverageItem[] = [],
  sets: PokemonSet[] = [],
): string {
  const lines: string[] = [];
  lines.push(`### ${team.archetype} - punteggio ${team.score}`);
  lines.push('');
  lines.push('Composizione e ruoli:');
  for (const m of team.members) lines.push(`- ${m}: ${describeRoles(perMemberTags[m] ?? [])}`);
  lines.push('');

  if (sets.length) {
    lines.push('Set completi (Stat Points di Champions: 66 totali, max 32/stat):');
    for (const s of sets) {
      lines.push(`- ${s.species} @ ${s.item} · ${s.ability} · ${s.nature} · SP: ${formatSP(s.statPoints)}`);
      lines.push(`  Mosse: ${s.moves.join(' / ')}`);
    }
    lines.push('');
  }

  if (team.strengths.length) {
    lines.push('Punti di forza:');
    for (const s of team.strengths) lines.push(`- ${s}`);
    lines.push('');
  }

  if (team.weaknesses.length) {
    lines.push(
      `Debolezze strutturali: tipi a cui almeno tre membri sono deboli - ${team.weaknesses.join(', ')}.`,
    );
  } else {
    lines.push('Debolezze strutturali: nessun tipo impilato su tre o più membri.');
  }
  lines.push('');

  if (offensive.length) {
    const answered = offensive.filter((o) => o.answered).length;
    lines.push(`Coverage offensiva contro le minacce meta (danno reale, @smogon/calc) - ${answered}/${offensive.length} con risposta solida:`);
    for (const o of offensive) {
      const mark = o.answered ? 'OK' : 'debole';
      lines.push(`- ${o.threat}: ${o.by} con ${o.move} fa fino al ${o.pctMax}% (${mark})`);
    }
    lines.push('');
  }

  if (team.notes.length) {
    lines.push('Note e buchi di coverage:');
    for (const n of team.notes) lines.push(`- ${n}`);
    lines.push('');
  }

  return lines.join('\n');
}

// Punto di ingresso a due livelli. Per ora il Livello 2 ricade sul Livello 1 (hook Fase 4).
export function buildRationale(
  team: TeamProposal,
  perMemberTags: Record<string, RoleTag[]> = {},
  offensive: OffensiveCoverageItem[] = [],
  sets: PokemonSet[] = [],
): string {
  // TODO Fase 4: con ANTHROPIC_API_KEY presente, arricchire la prosa via @anthropic-ai/sdk.
  return buildRationaleL1(team, perMemberTags, offensive, sets);
}
