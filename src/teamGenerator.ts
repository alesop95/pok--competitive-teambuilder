// Generazione candidati team (handoff §4.2). Modulo PURO: opera su candidati già arricchiti
// (tag di ruolo, tipi, mappa difensiva di type-effectiveness) e non dipende dalla dex o dalla rete,
// così è testabile con fixture. L'arricchimento dei dati reali vive in pkmnData.ts (buildCandidates).
//
// Pipeline: identifica gli archetipi disponibili incrociando i tag del roster, per ciascuno
// costruisce un core e riempie gli slot massimizzando la coverage difensiva ed evitando ridondanza,
// assegna un punteggio e ritorna i migliori N team.
import type { RoleTag } from './roleTagging.js';

export interface Candidate {
  species: string;
  dexNum: number; // per la Species Clause: due forme con stesso numero (es. base/Mega) non coesistono
  tags: RoleTag[];
  types: string[];
  // Moltiplicatore difensivo per tipo attaccante: 1 neutro, 2/4 debole, 0.5/0.25 resiste, 0 immune.
  defense: Record<string, number>;
}

export interface MetaContext {
  topThreats: string[]; // nomi specie; per ora può essere vuoto (meta non ancora curato)
}

export interface TeamProposal {
  archetype: string;
  members: string[];
  score: number;
  strengths: string[];
  weaknesses: string[]; // tipi attaccanti a cui >=3 membri sono deboli
  notes: string[];
}

interface ArchetypeDef {
  id: string;
  name: string;
  // condizione di disponibilità sui conteggi dei tag nel roster
  available: (count: (t: RoleTag) => number) => boolean;
  // tag che definiscono i membri del core, in ordine di priorità
  coreTags: RoleTag[];
  coreSize: number;
}

const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'screens_offense',
    name: 'Screens Offense',
    available: (c) => c('screens_setter') >= 1 && c('wallbreaker') + c('autonomous_sweeper') >= 2,
    coreTags: ['screens_setter', 'wallbreaker', 'autonomous_sweeper'],
    coreSize: 3,
  },
  {
    id: 'trick_room',
    name: 'Trick Room',
    available: (c) => c('trick_room_setter') >= 1 && c('trick_room_abuser') >= 2,
    coreTags: ['trick_room_setter', 'trick_room_abuser'],
    coreSize: 3,
  },
  {
    id: 'tailwind_offense',
    name: 'Tailwind Offense',
    available: (c) => c('speed_control') >= 1 && c('wallbreaker') + c('autonomous_sweeper') >= 2,
    coreTags: ['speed_control', 'wallbreaker', 'autonomous_sweeper'],
    coreSize: 3,
  },
  {
    id: 'redirection_setup',
    name: 'Redirection + Setup',
    available: (c) => c('redirection_support') >= 1 && c('autonomous_sweeper') >= 1,
    coreTags: ['redirection_support', 'autonomous_sweeper'],
    coreSize: 2,
  },
  {
    // fallback sempre disponibile: bilanciato attorno a pivot/speed control
    id: 'balance',
    name: 'Balance',
    available: () => true,
    coreTags: ['pivot', 'speed_control', 'wallbreaker'],
    coreSize: 3,
  },
];

const isWeak = (c: Candidate, type: string): boolean => (c.defense[type] ?? 1) > 1;
const resists = (c: Candidate, type: string): boolean => (c.defense[type] ?? 1) < 1;

// Tipi a cui almeno `threshold` membri della squadra sono deboli (debolezze impilate).
function stackedWeaknesses(team: Candidate[], allTypes: string[], threshold = 3): string[] {
  return allTypes.filter((t) => team.filter((c) => isWeak(c, t)).length >= threshold);
}

// Punteggio marginale di aggiungere `cand` alla squadra: premia chi resiste alle debolezze impilate
// correnti, penalizza chi aggiunge nuove debolezze impilate e la ridondanza di tipo.
function marginalScore(team: Candidate[], cand: Candidate, allTypes: string[]): number {
  let score = 0;
  const currentStacked = stackedWeaknesses(team, allTypes, 3);
  for (const t of currentStacked) if (resists(cand, t)) score += 1.5;
  const afterStacked = stackedWeaknesses([...team, cand], allTypes, 3);
  score -= (afterStacked.length - currentStacked.length) * 1.0;
  // ridondanza: penalizza tipi già molto presenti
  const typeCounts = new Map<string, number>();
  for (const c of team) for (const ty of c.types) typeCounts.set(ty, (typeCounts.get(ty) ?? 0) + 1);
  for (const ty of cand.types) if ((typeCounts.get(ty) ?? 0) >= 2) score -= 0.75;
  // tiebreak: a parità, preferisci candidati con più ruoli utili rispetto ai filler senza tag,
  // così il riempimento non collassa sui primi del roster in ordine alfabetico.
  score += Math.min(cand.tags.length, 3) * 0.1;
  return score;
}

function buildTeam(core: Candidate[], pool: Candidate[], allTypes: string[]): Candidate[] {
  const team = [...core];
  const usedNums = new Set(team.map((c) => c.dexNum));
  while (team.length < 6) {
    let best: Candidate | undefined;
    let bestScore = -Infinity;
    for (const cand of pool) {
      if (usedNums.has(cand.dexNum)) continue;
      const s = marginalScore(team, cand, allTypes);
      if (s > bestScore) {
        bestScore = s;
        best = cand;
      }
    }
    if (!best) break;
    team.push(best);
    usedNums.add(best.dexNum);
  }
  return team;
}

// Punteggio finale del team: coverage difensiva (meno debolezze impilate è meglio), copertura
// difensiva delle minacce meta, e penalità per buchi. Pesi espliciti e documentati.
function scoreTeam(team: Candidate[], allTypes: string[], meta: MetaContext, threatTypes: Map<string, string[]>): { score: number; strengths: string[]; weaknesses: string[]; notes: string[] } {
  const stacked = stackedWeaknesses(team, allTypes, 3);
  const notes: string[] = [];
  const strengths: string[] = [];

  let score = 10;
  score -= stacked.length * 2; // ogni debolezza impilata pesa
  // premia ampiezza di resistenze: tipi resistiti da almeno un membro
  const resistedTypes = allTypes.filter((t) => team.some((c) => resists(c, t)));
  score += Math.min(resistedTypes.length, 12) * 0.25;
  if (stacked.length === 0) strengths.push('nessuna debolezza di tipo impilata su 3+ membri');

  // copertura difensiva delle minacce meta: per ogni minaccia, almeno un membro deve resistere ai
  // suoi tipi (proxy di "risposta alla minaccia" finché non c'è il damage calc reale, Fase 3).
  for (const threat of meta.topThreats) {
    const tt = threatTypes.get(threat);
    if (!tt) continue;
    const answered = team.some((c) => tt.some((ty) => resists(c, ty)));
    if (answered) strengths.push(`risposta difensiva a ${threat}`);
    else {
      score -= 1.5;
      notes.push(`nessuna risposta difensiva chiara a ${threat}`);
    }
  }

  return { score: Math.round(score * 100) / 100, strengths, weaknesses: stacked, notes };
}

export interface GenerateOptions {
  topN?: number;
  meta?: MetaContext;
  threatTypes?: Map<string, string[]>; // tipi delle specie-minaccia, per la coverage offensiva
}

export function generateTeams(roster: Candidate[], opts: GenerateOptions = {}): TeamProposal[] {
  const topN = opts.topN ?? 5;
  const meta = opts.meta ?? { topThreats: [] };
  const threatTypes = opts.threatTypes ?? new Map();
  const allTypes = [...new Set(roster.flatMap((c) => Object.keys(c.defense)))];

  const count = (t: RoleTag) => roster.filter((c) => c.tags.includes(t)).length;
  const proposals: TeamProposal[] = [];

  for (const arch of ARCHETYPES) {
    if (!arch.available(count)) continue;

    // core: prendi i primi membri che soddisfano i coreTags, senza duplicare il numero Pokédex
    const core: Candidate[] = [];
    const usedNums = new Set<number>();
    for (const tag of arch.coreTags) {
      const member = roster.find((c) => c.tags.includes(tag) && !usedNums.has(c.dexNum));
      if (member) {
        core.push(member);
        usedNums.add(member.dexNum);
      }
      if (core.length >= arch.coreSize) break;
    }
    if (core.length === 0) continue;

    const team = buildTeam(core, roster, allTypes);
    if (team.length < 4) continue; // sotto la dimensione minima di squadra del regolamento M-B

    const { score, strengths, weaknesses, notes } = scoreTeam(team, allTypes, meta, threatTypes);
    proposals.push({
      archetype: arch.name,
      members: team.map((c) => c.species),
      score,
      strengths,
      weaknesses,
      notes,
    });
  }

  return proposals.sort((a, b) => b.score - a.score).slice(0, topN);
}
