// Test del tagging dei ruoli (§4.1) con fixture deterministiche: ogni caso isola una regola.
import { describe, it, expect } from 'vitest';
import { tagRoles, toID, type TaggingInput, type MoveInfo } from '../src/roleTagging.js';

const STATUS: MoveInfo = { priority: 0, basePower: 0, category: 'Status' };
const ATK = (basePower: number, priority = 0): MoveInfo => ({ priority, basePower, category: 'Physical' });

// Costruisce un input minimo; le mosse sono passate per nome e normalizzate a id.
function input(opts: {
  stats?: Partial<TaggingInput['baseStats']>;
  abilities?: string[];
  moves?: Record<string, MoveInfo>;
}): TaggingInput {
  const moves: Record<string, MoveInfo> = {};
  for (const [name, info] of Object.entries(opts.moves ?? {})) moves[toID(name)] = info;
  return {
    baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80, ...opts.stats },
    abilities: opts.abilities ?? [],
    moves,
  };
}

describe('tagRoles §4.1', () => {
  it('screens_setter: Prankster + Light Screen', () => {
    const tags = tagRoles(input({ abilities: ['Prankster'], moves: { 'Light Screen': STATUS } }));
    expect(tags).toContain('screens_setter');
  });

  it('niente screens_setter senza Prankster', () => {
    const tags = tagRoles(input({ abilities: ['Frisk'], moves: { Reflect: STATUS } }));
    expect(tags).not.toContain('screens_setter');
  });

  it('trick_room_setter e speed_control: spe<=60 + Trick Room', () => {
    const tags = tagRoles(input({ stats: { spe: 30 }, moves: { 'Trick Room': STATUS } }));
    expect(tags).toContain('trick_room_setter');
    expect(tags).toContain('speed_control');
  });

  it('trick_room_abuser: spe<=60 e atk>=100', () => {
    const tags = tagRoles(input({ stats: { spe: 50, atk: 130 } }));
    expect(tags).toContain('trick_room_abuser');
  });

  it('autonomous_sweeper: Speed Boost + mossa di setup', () => {
    const tags = tagRoles(input({ abilities: ['Speed Boost'], moves: { 'Swords Dance': STATUS } }));
    expect(tags).toContain('autonomous_sweeper');
  });

  it('redirection_support: Rage Powder', () => {
    expect(tagRoles(input({ moves: { 'Rage Powder': STATUS } }))).toContain('redirection_support');
  });

  it('pivot: U-turn', () => {
    expect(tagRoles(input({ moves: { 'U-turn': ATK(70) } }))).toContain('pivot');
  });

  it('weather_setter: Drought', () => {
    expect(tagRoles(input({ abilities: ['Drought'] }))).toContain('weather_setter');
  });

  it('wallbreaker: atk>=110 senza recovery, ma non se ha recovery', () => {
    expect(tagRoles(input({ stats: { atk: 130 } }))).toContain('wallbreaker');
    expect(tagRoles(input({ stats: { atk: 130 }, moves: { Roost: STATUS } }))).not.toContain('wallbreaker');
  });

  it('priority_closer: mossa priorità +1 con BP discreto', () => {
    expect(tagRoles(input({ moves: { 'Sucker Punch': ATK(70, 1) } }))).toContain('priority_closer');
  });
});
