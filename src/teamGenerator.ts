// Generazione candidati team (handoff §4.2). Modulo PURO: opera su candidati già arricchiti
// (tag di ruolo, tipi, mappa difensiva di type-effectiveness) e non dipende dalla dex o dalla rete,
// così è testabile con fixture. L'arricchimento dei dati reali vive in pkmnData.ts (buildCandidates).
//
// Pipeline: identifica gli archetipi disponibili incrociando i tag del roster, per ciascuno
// costruisce un core e riempie gli slot massimizzando la coverage difensiva ed evitando ridondanza,
// assegna un punteggio e ritorna i migliori N team.
import type { RoleTag, BaseStats } from './roleTagging.js';

export interface Candidate {
  species: string;
  dexNum: number; // per la Species Clause: due forme con stesso numero (es. base/Mega) non coesistono
  tags: RoleTag[];
  types: string[];
  // Moltiplicatore difensivo per tipo attaccante: 1 neutro, 2/4 debole, 0.5/0.25 resiste, 0 immune.
  defense: Record<string, number>;
  baseStats: BaseStats; // statistiche base, per stazza/velocità nella viability
  bst: number; // somma statistiche base, come livello di qualità grezzo
  // Viability competitiva [0..1] calcolata dall'engine: pressione offensiva sul meta (damage calc) +
  // copertura difensiva del meta + livello statistico. Guida la selezione di core e riempimento.
  viability: number;
}

export interface MetaContext {
  topThreats: string[]; // nomi specie; per ora può essere vuoto (meta non ancora curato)
}

export interface CoreSpec {
  members: string[]; // nomi specie del core osservato nel meta
  archetype: string;
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
    id: 'weather_offense',
    name: 'Weather Offense',
    available: (c) => c('weather_setter') >= 1 && c('wallbreaker') + c('autonomous_sweeper') >= 1,
    coreTags: ['weather_setter', 'wallbreaker', 'autonomous_sweeper'],
    coreSize: 3,
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

// Punteggio marginale di aggiungere `cand` alla squadra. Domina la viability competitiva (pressione
// sul meta via damage calc + copertura difensiva del meta + livello statistico), poi la copertura
// difensiva marginale, meno la ridondanza di tipo e una penalità di diversità per chi è già stato
// usato in molti team di questa generazione (evita gli stessi Pokémon in ogni proposta).
function marginalScore(team: Candidate[], cand: Candidate, allTypes: string[], usage: Map<string, number>): number {
  let score = cand.viability * 4; // peso dominante: qualità competitiva reale
  const currentStacked = stackedWeaknesses(team, allTypes, 3);
  for (const t of currentStacked) if (resists(cand, t)) score += 1.2;
  const afterStacked = stackedWeaknesses([...team, cand], allTypes, 3);
  score -= (afterStacked.length - currentStacked.length) * 1.0;
  const typeCounts = new Map<string, number>();
  for (const c of team) for (const ty of c.types) typeCounts.set(ty, (typeCounts.get(ty) ?? 0) + 1);
  for (const ty of cand.types) if ((typeCounts.get(ty) ?? 0) >= 2) score -= 0.75;
  score -= (usage.get(cand.species) ?? 0) * 1.5; // diversità tra i team proposti
  return score;
}

function buildTeam(core: Candidate[], pool: Candidate[], allTypes: string[], usage: Map<string, number>): Candidate[] {
  const team = [...core];
  const usedNums = new Set(team.map((c) => c.dexNum));
  while (team.length < 6) {
    let best: Candidate | undefined;
    let bestScore = -Infinity;
    for (const cand of pool) {
      if (usedNums.has(cand.dexNum)) continue;
      const s = marginalScore(team, cand, allTypes, usage);
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
function scoreTeam(team: Candidate[], allTypes: string[], meta: MetaContext, threatTypes: Map<string, string[]>, cores: CoreSpec[] = []): { score: number; strengths: string[]; weaknesses: string[]; notes: string[] } {
  const stacked = stackedWeaknesses(team, allTypes, 3);
  const notes: string[] = [];
  const strengths: string[] = [];

  let score = 10;
  score -= stacked.length * 2; // ogni debolezza impilata pesa
  // premia ampiezza di resistenze: tipi resistiti da almeno un membro
  const resistedTypes = allTypes.filter((t) => team.some((c) => resists(c, t)));
  score += Math.min(resistedTypes.length, 12) * 0.25;
  if (stacked.length === 0) strengths.push('nessuna debolezza di tipo impilata su 3+ membri');

  // sinergia: premia la presenza di ruoli di supporto strutturali (controllo velocità, redirezione,
  // pivot, schermi), che tengono insieme la squadra al di là dei soli attaccanti.
  const teamTags = new Set(team.flatMap((c) => c.tags));
  const synergyRoles: RoleTag[] = ['speed_control', 'redirection_support', 'pivot', 'screens_setter', 'trick_room_setter'];
  const synergyPresent = synergyRoles.filter((r) => teamTags.has(r));
  score += synergyPresent.length * 0.3;
  if (synergyPresent.length >= 2) strengths.push(`spina dorsale di supporto: ${synergyPresent.join(', ')}`);

  // Copertura difensiva delle minacce meta (proxy finché non c'è il damage calc reale, Fase 3).
  // Risposta "solida": un membro che resiste ad almeno una STAB della minaccia e non è debole a
  // nessuna delle sue STAB. Le risposte solide contribuiscono al punteggio (così team diversi si
  // differenziano); una minaccia a cui nessuno resiste è un buco penalizzato.
  let solidAnswers = 0;
  for (const threat of meta.topThreats) {
    const tt = threatTypes.get(threat);
    if (!tt) continue;
    const solid = team.some((c) => tt.some((ty) => resists(c, ty)) && !tt.some((ty) => isWeak(c, ty)));
    const anyResist = team.some((c) => tt.some((ty) => resists(c, ty)));
    if (solid) {
      solidAnswers += 1;
    } else if (!anyResist) {
      score -= 1.5;
      notes.push(`nessuna risposta difensiva a ${threat}`);
    } else {
      notes.push(`risposta solo parziale a ${threat} (resiste a una STAB ma è debole all'altra)`);
    }
  }
  if (meta.topThreats.length) {
    score += solidAnswers * 0.5;
    strengths.push(`risposte difensive solide a ${solidAnswers}/${meta.topThreats.length} minacce del meta`);
  }

  // qualità competitiva media del team (viability) e bonus se contiene un core osservato nel meta
  const avgViability = team.reduce((s, c) => s + c.viability, 0) / (team.length || 1);
  score += avgViability * 3;
  for (const core of cores) {
    if (core.members.length >= 2 && core.members.every((m) => team.some((c) => c.species === m))) {
      score += 1.5;
      strengths.push(`include il core di meta osservato (${core.archetype})`);
    }
  }

  return { score: Math.round(score * 100) / 100, strengths, weaknesses: stacked, notes };
}

export interface GenerateOptions {
  topN?: number;
  meta?: MetaContext;
  threatTypes?: Map<string, string[]>; // tipi delle specie-minaccia, per la coverage offensiva
  cores?: CoreSpec[]; // core osservati nel meta (season_<id>_meta.yaml)
}

export function generateTeams(roster: Candidate[], opts: GenerateOptions = {}): TeamProposal[] {
  const topN = opts.topN ?? 5;
  const meta = opts.meta ?? { topThreats: [] };
  const threatTypes = opts.threatTypes ?? new Map();
  const cores = opts.cores ?? [];
  const allTypes = [...new Set(roster.flatMap((c) => Object.keys(c.defense)))];

  const count = (t: RoleTag) => roster.filter((c) => c.tags.includes(t)).length;
  const proposals: TeamProposal[] = [];
  const usage = new Map<string, number>(); // quante volte ogni specie è già stata usata (diversità)

  const pushTeam = (archetypeName: string, seed: Candidate[]) => {
    if (seed.length === 0) return;
    const team = buildTeam(seed, roster, allTypes, usage);
    if (team.length < 4) return; // sotto la dimensione minima di squadra del regolamento M-B
    const { score, strengths, weaknesses, notes } = scoreTeam(team, allTypes, meta, threatTypes, cores);
    proposals.push({ archetype: archetypeName, members: team.map((c) => c.species), score, strengths, weaknesses, notes });
    for (const c of team) usage.set(c.species, (usage.get(c.species) ?? 0) + 1);
  };

  // 1. team seedati dai core osservati nel meta: ancorano le proposte al meta reale
  for (const core of cores) {
    const seed: Candidate[] = [];
    const seen = new Set<number>();
    for (const name of core.members) {
      const m = roster.find((c) => c.species === name);
      if (m && !seen.has(m.dexNum)) {
        seen.add(m.dexNum);
        seed.push(m);
      }
    }
    if (seed.length >= 2) pushTeam(`Meta core: ${core.archetype}`, seed);
  }

  // 2. team per archetipo; ogni membro del core è il migliore per viability con quel tag
  for (const arch of ARCHETYPES) {
    if (!arch.available(count)) continue;
    const core: Candidate[] = [];
    const usedNums = new Set<number>();
    for (const tag of arch.coreTags) {
      const member = roster
        .filter((c) => c.tags.includes(tag) && !usedNums.has(c.dexNum))
        .sort((a, b) => b.viability - a.viability)[0];
      if (member) {
        core.push(member);
        usedNums.add(member.dexNum);
      }
      if (core.length >= arch.coreSize) break;
    }
    pushTeam(arch.name, core);
  }

  return proposals.sort((a, b) => b.score - a.score).slice(0, topN);
}
