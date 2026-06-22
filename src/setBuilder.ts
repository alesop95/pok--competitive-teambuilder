// Costruzione del set competitivo completo per un Pokémon (handoff: "tutte le informazioni").
// Dato il Pokémon e i suoi tag di ruolo, sceglie strumento, abilità, natura, spread in Stat Points
// (sistema reale di Champions: 66 SP totali, max 32 per statistica, §0.5 dell'handoff) e 4 mosse.
// Euristiche deterministiche, niente AI: scelte coerenti col ruolo e con l'orientamento offensivo.
// Supporta le forme Mega (item = Mega Stone, statline/abilità della forma Mega).
import { getChampionsDex, getMegaForme } from './pkmnData.js';
import { toID, type RoleTag } from './roleTagging.js';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface PokemonSet {
  species: string;
  ability: string;
  item: string;
  nature: string;
  // Spread in Stat Points di Champions: somma <= 66, ogni voce <= 32 (§0.5). Solo le stat investite.
  statPoints: Partial<Record<StatKey, number>>;
  moves: string[];
  mega?: boolean;
}

// Abilità preferite in ordine di rilevanza competitiva (si sceglie la prima presente sulla specie,
// anche se hidden). Ampliata per coprire le abilità forti del doppio.
const ABILITY_PREFERENCE = [
  'Intimidate', 'Prankster', 'Huge Power', 'Pure Power', 'Lightning Rod', 'Storm Drain', 'Sap Sipper',
  'Regenerator', 'Speed Boost', 'Unburden', 'Contrary', 'Adaptability', 'Protosynthesis', 'Quark Drive',
  'Drought', 'Drizzle', 'Sand Stream', 'Snow Warning', 'Triage', 'Technician', 'Tough Claws',
  'Sheer Force', 'Guts', 'Defiant', 'Competitive', 'Queenly Majesty', 'Dazzling', 'Water Absorb',
  'Volt Absorb', 'Flash Fire', 'Levitate', 'Magic Guard', 'Moxie', 'Beast Boost', 'Iron Fist',
  'Strong Jaw', 'Mega Launcher', 'Sturdy', 'Multiscale', 'Thick Fat', 'Friend Guard', 'Telepathy',
].map((a) => toID(a));

const SETUP_MOVES = ['Swords Dance', 'Nasty Plot', 'Dragon Dance', 'Calm Mind', 'Bulk Up', 'Shell Smash', 'Quiver Dance', 'Tail Glow'];

// Mosse da escludere dai set/stime in doppio: condizionali, sacrificali o poco affidabili a
// bersaglio singolo (Focus Punch viene interrotto, Belch richiede una bacca consumata, ecc.).
const DOUBLES_IMPRACTICAL = new Set(
  ['Focus Punch', 'Belch', 'Last Resort', 'Beat Up', 'Final Gambit', 'Self-Destruct', 'Explosion',
    'Misty Explosion', 'Memento', 'Natural Gift', 'Fake Out'].map(toID),
);
// Fake Out è ottimo in doppio ma è utility, non un attacco da coverage: lo togliamo dalla lista
// degli "attacchi" e lo si aggiunge come mossa di ruolo dove serve.
const FAKE_OUT = toID('Fake Out');

interface MoveMeta { name: string; type: string; bp: number; category: 'Physical' | 'Special' | 'Status' }

// Predicato di praticità in doppio per una mossa, riusato anche dal damage calc.
export function isPracticalDoublesMove(m: {
  id?: string;
  flags: { charge?: number; recharge?: number; futuremove?: number };
  accuracy: number | true;
}): boolean {
  const f = m.flags ?? {};
  if (f.charge || f.recharge || f.futuremove) return false;
  if (typeof m.accuracy === 'number' && m.accuracy < 80) return false;
  if (m.id && DOUBLES_IMPRACTICAL.has(m.id) && m.id !== FAKE_OUT) return false;
  return true;
}

function pickAbility(abilities: string[]): string {
  for (const pref of ABILITY_PREFERENCE) {
    const match = abilities.find((a) => toID(a) === pref);
    if (match) return match;
  }
  return abilities[0] ?? 'Pressure';
}

function pickNature(stats: Record<StatKey, number>, isTR: boolean, isSupport: boolean): string {
  const physical = stats.atk >= stats.spa;
  if (isSupport) return physical ? 'Impish' : 'Calm';
  if (isTR) return physical ? 'Brave' : 'Quiet';
  return physical ? 'Adamant' : 'Modest';
}

function pickStatPoints(stats: Record<StatKey, number>, isTR: boolean, isSupport: boolean): Partial<Record<StatKey, number>> {
  const physical = stats.atk >= stats.spa;
  if (isSupport) return { hp: 32, def: 17, spd: 17 };
  if (isTR) return { [physical ? 'atk' : 'spa']: 32, hp: 32, def: 2 } as Partial<Record<StatKey, number>>;
  return { [physical ? 'atk' : 'spa']: 32, spe: 32, hp: 2 } as Partial<Record<StatKey, number>>;
}

function pickItem(tags: RoleTag[]): string {
  // Solo strumenti disponibili nel formato (verificato su serebii M-B: Safety Goggles NON è legale).
  if (tags.includes('screens_setter')) return 'Light Clay';
  if (tags.includes('wallbreaker') || tags.includes('autonomous_sweeper') || tags.includes('priority_closer')) return 'Life Orb';
  return 'Sitrus Berry';
}

function pickMoves(tags: RoleTag[], types: readonly string[], damaging: MoveMeta[], available: Set<string>): string[] {
  const chosen: string[] = [];
  const add = (name?: string) => {
    if (name && !chosen.includes(name) && chosen.length < 4) chosen.push(name);
  };
  const hasMove = (n: string) => available.has(toID(n));

  const stab = damaging.find((m) => types.includes(m.type));
  add(stab?.name);
  const firstType = chosen.length ? damaging.find((m) => m.name === chosen[0])?.type : undefined;
  add(damaging.find((m) => m.type !== firstType)?.name);

  const roleMove = (): string | undefined => {
    if (tags.includes('screens_setter')) return hasMove('Reflect') ? 'Reflect' : hasMove('Light Screen') ? 'Light Screen' : undefined;
    if (tags.includes('redirection_support')) return hasMove('Rage Powder') ? 'Rage Powder' : hasMove('Follow Me') ? 'Follow Me' : undefined;
    if (tags.includes('trick_room_setter')) return hasMove('Trick Room') ? 'Trick Room' : undefined;
    if (tags.includes('speed_control')) return hasMove('Tailwind') ? 'Tailwind' : hasMove('Icy Wind') ? 'Icy Wind' : undefined;
    if (tags.includes('autonomous_sweeper')) return SETUP_MOVES.find((s) => hasMove(s));
    return undefined;
  };
  add(roleMove());
  if (hasMove('Fake Out') && chosen.length < 4) add('Fake Out');
  if (hasMove('Protect')) add('Protect');
  for (const m of damaging) add(m.name);
  return chosen.slice(0, 4);
}

export async function buildSet(
  species: string,
  tags: RoleTag[],
  opts: { mega?: boolean; trickRoom?: boolean } = {},
): Promise<PokemonSet | null> {
  const dex = await getChampionsDex();
  const base = dex.species.get(species);
  if (!base?.exists) return null;

  // forma da cui prendere stats/tipi/abilità: la Mega se richiesta e disponibile, altrimenti la base.
  let statsSp = base;
  let megaItem: string | null = null;
  let isMega = false;
  if (opts.mega) {
    const mega = await getMegaForme(base.name);
    const mforme = mega ? dex.species.get(mega.forme) : null;
    if (mega && mforme?.exists) {
      statsSp = mforme;
      megaItem = mega.stone;
      isMega = true;
    }
  }

  const stats = statsSp.baseStats as Record<StatKey, number>;
  // la natura/spread dipendono dal CONTESTO del team (Trick Room sì/no), non solo dai tag del singolo:
  // così un attaccante lento non riceve natura Brave/Quiet dentro un team Tailwind.
  const isTR = opts.trickRoom ?? false;
  const isSupport = (tags.includes('screens_setter') || tags.includes('redirection_support')) && stats.atk < 100 && stats.spa < 100;
  const physical = stats.atk >= stats.spa;

  const learnset = await dex.learnsets.get(base.id); // le Mega condividono il movepool della base
  const damaging: MoveMeta[] = [];
  for (const moveId of Object.keys(learnset?.learnset ?? {})) {
    const m = dex.moves.get(moveId);
    if (!m?.exists || m.category === 'Status' || m.basePower <= 0) continue;
    if (!isPracticalDoublesMove({ id: m.id, flags: m.flags, accuracy: m.accuracy })) continue;
    damaging.push({ name: m.name, type: m.type, bp: m.basePower, category: m.category as MoveMeta['category'] });
  }
  damaging.sort((a, b) => {
    const est = (mv: MoveMeta) => mv.bp * ((statsSp.types as readonly string[]).includes(mv.type) ? 1.5 : 1) * (mv.category === 'Physical' ? stats.atk : stats.spa);
    return est(b) - est(a);
  });
  const oriented = damaging.filter((m) => (physical ? m.category === 'Physical' : m.category === 'Special'));
  const movePool = oriented.length >= 2 ? oriented : damaging;
  const available = new Set(Object.keys(learnset?.learnset ?? {}));

  // l'abilità della Mega è fissa (quella della forma); altrimenti si sceglie la migliore della base
  const abilities = Object.values(statsSp.abilities).filter(Boolean) as string[];

  return {
    species: statsSp.name,
    ability: isMega ? abilities[0] : pickAbility(abilities),
    item: megaItem ?? pickItem(tags),
    nature: pickNature(stats, isTR, isSupport),
    statPoints: pickStatPoints(stats, isTR, isSupport),
    moves: pickMoves(tags, statsSp.types, movePool, available),
    mega: isMega,
  };
}
