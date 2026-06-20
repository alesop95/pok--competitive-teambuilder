// Costruzione del set competitivo completo per un Pokémon (handoff: "tutte le informazioni").
// Dato il Pokémon e i suoi tag di ruolo, sceglie strumento, abilità, natura, spread in Stat Points
// (sistema reale di Champions: 66 SP totali, max 32 per statistica, §0.5 dell'handoff) e 4 mosse.
// Euristiche deterministiche, niente AI: scelte coerenti col ruolo e con l'orientamento offensivo.
import { getChampionsDex } from './pkmnData.js';
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
}

// Abilità preferite in ordine di rilevanza competitiva (si sceglie la prima presente sulla specie).
const ABILITY_PREFERENCE = [
  'Intimidate', 'Prankster', 'Regenerator', 'Huge Power', 'Speed Boost', 'Unburden', 'Contrary',
  'Adaptability', 'Drought', 'Drizzle', 'Sand Stream', 'Snow Warning', 'Protosynthesis',
  'Quark Drive', 'Moxie', 'Beast Boost', 'Sturdy', 'Levitate', 'Magic Guard',
].map((a) => toID(a));

const SETUP_MOVES = ['Swords Dance', 'Nasty Plot', 'Dragon Dance', 'Calm Mind', 'Bulk Up', 'Shell Smash', 'Quiver Dance', 'Tail Glow'];

interface MoveMeta { name: string; type: string; bp: number; category: 'Physical' | 'Special' | 'Status'; }

function isPractical(m: { flags: { charge?: number; recharge?: number; futuremove?: number }; accuracy: number | true }): boolean {
  const f = m.flags ?? {};
  if (f.charge || f.recharge || f.futuremove) return false;
  if (typeof m.accuracy === 'number' && m.accuracy < 80) return false;
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

// Spread in Stat Points: due stat massimizzate (32) + 2 di resto, secondo il ruolo.
function pickStatPoints(stats: Record<StatKey, number>, isTR: boolean, isSupport: boolean): Partial<Record<StatKey, number>> {
  const physical = stats.atk >= stats.spa;
  if (isSupport) return { hp: 32, def: 17, spd: 17 };
  if (isTR) return { [physical ? 'atk' : 'spa']: 32, hp: 32, def: 2 } as Partial<Record<StatKey, number>>;
  return { [physical ? 'atk' : 'spa']: 32, spe: 32, hp: 2 } as Partial<Record<StatKey, number>>;
}

function pickItem(tags: RoleTag[]): string {
  if (tags.includes('screens_setter')) return 'Light Clay';
  if (tags.includes('redirection_support')) return 'Safety Goggles';
  if (tags.includes('wallbreaker') || tags.includes('autonomous_sweeper') || tags.includes('priority_closer')) return 'Life Orb';
  if (tags.includes('weather_setter')) return 'Sitrus Berry';
  if (tags.includes('speed_control') || tags.includes('pivot')) return 'Sitrus Berry';
  return 'Sitrus Berry';
}

// Sceglie 4 mosse: STAB migliore, coverage di tipo diverso, mossa di ruolo, e Protect (staple in
// doppio), riempiendo con i migliori attacchi residui.
function pickMoves(tags: RoleTag[], types: string[], damaging: MoveMeta[], available: Set<string>): string[] {
  const chosen: string[] = [];
  const add = (name?: string) => {
    if (name && !chosen.includes(name) && chosen.length < 4) chosen.push(name);
  };
  const hasMove = (n: string) => available.has(toID(n));

  // STAB migliore (già ordinati per stima decrescente)
  const stab = damaging.find((m) => types.includes(m.type));
  add(stab?.name);
  // coverage: miglior attacco di tipo diverso dalla prima mossa
  const firstType = chosen.length ? damaging.find((m) => m.name === chosen[0])?.type : undefined;
  add(damaging.find((m) => m.type !== firstType)?.name);

  // mossa di ruolo
  const roleMove = (): string | undefined => {
    if (tags.includes('screens_setter')) return hasMove('Reflect') ? 'Reflect' : hasMove('Light Screen') ? 'Light Screen' : undefined;
    if (tags.includes('redirection_support')) return hasMove('Rage Powder') ? 'Rage Powder' : hasMove('Follow Me') ? 'Follow Me' : undefined;
    if (tags.includes('trick_room_setter')) return hasMove('Trick Room') ? 'Trick Room' : undefined;
    if (tags.includes('speed_control')) return hasMove('Tailwind') ? 'Tailwind' : hasMove('Icy Wind') ? 'Icy Wind' : undefined;
    if (tags.includes('autonomous_sweeper')) return SETUP_MOVES.find((s) => hasMove(s));
    return undefined;
  };
  add(roleMove());

  // Protect: staple del doppio
  if (hasMove('Protect')) add('Protect');

  // riempi con i migliori attacchi residui
  for (const m of damaging) add(m.name);
  return chosen.slice(0, 4);
}

export async function buildSet(species: string, tags: RoleTag[]): Promise<PokemonSet | null> {
  const dex = await getChampionsDex();
  const sp = dex.species.get(species);
  if (!sp?.exists) return null;

  const stats = sp.baseStats as Record<StatKey, number>;
  const isTR = tags.includes('trick_room_setter') || tags.includes('trick_room_abuser');
  const isSupport = (tags.includes('screens_setter') || tags.includes('redirection_support')) && stats.atk < 100 && stats.spa < 100;
  const physical = stats.atk >= stats.spa;

  const learnset = await dex.learnsets.get(sp.id);
  const damaging: MoveMeta[] = [];
  for (const moveId of Object.keys(learnset?.learnset ?? {})) {
    const m = dex.moves.get(moveId);
    if (!m?.exists || m.category === 'Status' || m.basePower <= 0) continue;
    if (!isPractical(m)) continue;
    damaging.push({ name: m.name, type: m.type, bp: m.basePower, category: m.category as MoveMeta['category'] });
  }
  // ordina per stima: BP x STAB x stat offensiva coerente con l'orientamento
  damaging.sort((a, b) => {
    const est = (mv: MoveMeta) => mv.bp * ((sp.types as readonly string[]).includes(mv.type) ? 1.5 : 1) * (mv.category === 'Physical' ? stats.atk : stats.spa);
    return est(b) - est(a);
  });
  // se l'orientamento è netto, preferisci mosse della categoria principale per le scelte STAB/coverage
  const oriented = damaging.filter((m) => (physical ? m.category === 'Physical' : m.category === 'Special'));
  const movePool = oriented.length >= 2 ? oriented : damaging;
  const available = new Set(Object.keys(learnset?.learnset ?? {}));

  return {
    species: sp.name,
    ability: pickAbility(Object.values(sp.abilities).filter(Boolean) as string[]),
    item: pickItem(tags),
    nature: pickNature(stats, isTR, isSupport),
    statPoints: pickStatPoints(stats, isTR, isSupport),
    moves: pickMoves(tags, sp.types, movePool, available),
  };
}
