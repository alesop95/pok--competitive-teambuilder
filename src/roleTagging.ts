// Tagging dei ruoli (handoff §4.1). Per ogni Pokémon assegna tag multipli con regole deterministiche
// su stats base, abilità e movepool. Questi tag sono gli stessi usati manualmente nell'analisi:
// l'obiettivo è renderli espliciti e riusabili dal codice. Modulo PURO (nessuna dipendenza da rete
// o dalla dex): riceve già i dati necessari, così è testabile con fixture. L'assemblaggio dei dati
// reali dalla dex champions vive in pkmnData.ts (getTaggingInput / tagSpecies).

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

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface MoveInfo {
  priority: number;
  basePower: number;
  category: 'Physical' | 'Special' | 'Status';
}

// Unità di output del tagging: una specie con i suoi tag di ruolo (consumata da teamGenerator).
export interface TaggedPokemon {
  species: string;
  tags: RoleTag[];
}

export interface TaggingInput {
  baseStats: BaseStats;
  abilities: string[]; // nomi visualizzati, es. "Prankster"
  moves: Record<string, MoveInfo>; // movepool, chiave = id mossa normalizzato (es. "lightscreen")
}

// Normalizza un nome (mossa o abilità) all'id usato da @pkmn/dex: minuscolo, soli alfanumerici.
export const toID = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const SETUP_MOVES = new Set(
  [
    'Swords Dance', 'Nasty Plot', 'Dragon Dance', 'Calm Mind', 'Bulk Up', 'Shell Smash',
    'Quiver Dance', 'Agility', 'Tail Glow', 'Work Up', 'Coil', 'Hone Claws', 'Iron Defense',
    'Curse', 'Geomancy', 'Clangorous Soul', 'Victory Dance', 'Take Heart',
  ].map(toID),
);

const RECOVERY_MOVES = new Set(
  [
    'Recover', 'Roost', 'Slack Off', 'Soft-Boiled', 'Milk Drink', 'Synthesis', 'Moonlight',
    'Morning Sun', 'Shore Up', 'Wish', 'Rest', 'Strength Sap', 'Life Dew',
  ].map(toID),
);

const SWEEPER_ABILITIES = new Set(['Speed Boost', 'Moxie', 'Contrary', 'Beast Boost'].map(toID));
const WEATHER_ABILITIES = new Set(['Drought', 'Drizzle', 'Sand Stream', 'Snow Warning'].map(toID));

export function tagRoles(input: TaggingInput): RoleTag[] {
  const { baseStats: s, moves } = input;
  const abilities = new Set(input.abilities.map(toID));
  const has = (move: string): boolean => Object.prototype.hasOwnProperty.call(moves, toID(move));
  const hasAbility = (set: Set<string>): boolean => [...abilities].some((a) => set.has(a));
  const tags = new Set<RoleTag>();

  // screens_setter: Prankster + Reflect o Light Screen
  if (abilities.has(toID('Prankster')) && (has('Reflect') || has('Light Screen'))) {
    tags.add('screens_setter');
  }

  // trick_room_setter: base speed <= 60 e movepool include Trick Room
  const isTrSetter = s.spe <= 60 && has('Trick Room');
  if (isTrSetter) tags.add('trick_room_setter');

  // trick_room_abuser: base speed <= 60 e Atk o SpA base >= 100
  if (s.spe <= 60 && (s.atk >= 100 || s.spa >= 100)) tags.add('trick_room_abuser');

  // autonomous_sweeper: ability dedicata + una mossa di setup o un attacco coerente (BP >= 70)
  const hasSetup = Object.keys(moves).some((id) => SETUP_MOVES.has(id));
  const hasStrongAttack = Object.values(moves).some((m) => m.category !== 'Status' && m.basePower >= 70);
  if (hasAbility(SWEEPER_ABILITIES) && (hasSetup || hasStrongAttack)) tags.add('autonomous_sweeper');

  // redirection_support: Follow Me o Rage Powder
  if (has('Follow Me') || has('Rage Powder')) tags.add('redirection_support');

  // pivot: U-turn / Volt Switch / Flip Turn
  if (has('U-turn') || has('Volt Switch') || has('Flip Turn')) tags.add('pivot');

  // weather_setter: ability meteo
  if (hasAbility(WEATHER_ABILITIES)) tags.add('weather_setter');

  // speed_control: Tailwind / Icy Wind / Electroweb, oppure trick_room_setter
  if (has('Tailwind') || has('Icy Wind') || has('Electroweb') || isTrSetter) tags.add('speed_control');

  // wallbreaker: Atk o SpA base >= 110 e recovery affidabile assente (approssima "recovery limitato";
  // l'accesso a Choice item della tabella §4.1 è una scelta di teambuilding, non intrinseca alla specie).
  const hasRecovery = Object.keys(moves).some((id) => RECOVERY_MOVES.has(id));
  if ((s.atk >= 110 || s.spa >= 110) && !hasRecovery) tags.add('wallbreaker');

  // priority_closer: mossa con priorità >= +1 e BP discreto (>= 60), non di stato
  const hasPriorityCloser = Object.values(moves).some(
    (m) => m.priority >= 1 && m.category !== 'Status' && m.basePower >= 60,
  );
  if (hasPriorityCloser) tags.add('priority_closer');

  return [...tags];
}
