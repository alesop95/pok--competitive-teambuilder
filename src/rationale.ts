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

export type RationaleLevel = 1 | 2;

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
): string {
  const lines: string[] = [];
  lines.push(`### ${team.archetype} — punteggio ${team.score}`);
  lines.push('');
  lines.push('Composizione e ruoli:');
  for (const m of team.members) lines.push(`- ${m}: ${describeRoles(perMemberTags[m] ?? [])}`);
  lines.push('');

  if (team.strengths.length) {
    lines.push('Punti di forza:');
    for (const s of team.strengths) lines.push(`- ${s}`);
    lines.push('');
  }

  if (team.weaknesses.length) {
    lines.push(
      `Debolezze strutturali: tipi a cui almeno tre membri sono deboli — ${team.weaknesses.join(', ')}.`,
    );
  } else {
    lines.push('Debolezze strutturali: nessun tipo impilato su tre o più membri.');
  }
  lines.push('');

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
  level: RationaleLevel = 1,
): string {
  // TODO Fase 4: se level === 2 e ANTHROPIC_API_KEY è presente, arricchire via @anthropic-ai/sdk.
  void level;
  return buildRationaleL1(team, perMemberTags);
}
