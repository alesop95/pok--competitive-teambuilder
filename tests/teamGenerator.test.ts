// Test del generatore di team (§4.2): regole pure con fixture + un'integrazione su dati reali.
import { describe, it, expect } from 'vitest';
import { generateTeams, type Candidate } from '../src/teamGenerator.js';
import type { RoleTag } from '../src/roleTagging.js';
import { buildCandidates } from '../src/pkmnData.js';

const TYPES = ['Fire', 'Water', 'Grass', 'Fairy', 'Ground'];

// Fabbrica di candidati: defense come overrides su una base neutra (1x su tutti i tipi).
let nextNum = 1;
function cand(species: string, tags: RoleTag[], types: string[], defense: Partial<Record<string, number>> = {}, viability = 0.5): Candidate {
  const full: Record<string, number> = {};
  for (const t of TYPES) full[t] = defense[t] ?? 1;
  return { species, dexNum: nextNum++, tags, types, defense: full, baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, bst: 500, viability };
}

function roster(): Candidate[] {
  return [
    cand('ScreenSetter', ['screens_setter'], ['Dark', 'Fairy'], { Fairy: 0.5 }),
    cand('Breaker1', ['wallbreaker'], ['Fire'], { Fire: 0.5, Grass: 0.5, Water: 2, Ground: 2 }),
    cand('Sweeper1', ['autonomous_sweeper'], ['Water'], { Fire: 0.5, Water: 0.5, Grass: 2 }),
    cand('Pivot1', ['pivot'], ['Grass'], { Water: 0.5, Ground: 0.5, Fire: 2 }),
    cand('SpeedCtrl', ['speed_control'], ['Flying'], { Ground: 0, Grass: 0.5, Fairy: 1 }),
    cand('Filler1', [], ['Steel', 'Fairy'], { Fairy: 0.5, Grass: 0.5 }),
    cand('Filler2', [], ['Ground'], { Fire: 1, Water: 2, Grass: 2 }),
    cand('Filler3', [], ['Rock'], { Fire: 0.5, Water: 2, Grass: 2, Ground: 2 }),
  ];
}

describe('generateTeams §4.2', () => {
  it('rileva Screens Offense quando ci sono screens_setter + 2 breaker/sweeper', () => {
    const teams = generateTeams(roster());
    expect(teams.some((t) => t.archetype === 'Screens Offense')).toBe(true);
  });

  it('produce almeno il fallback Balance e team di dimensione valida (4-6)', () => {
    const teams = generateTeams(roster());
    expect(teams.length).toBeGreaterThanOrEqual(1);
    for (const t of teams) {
      expect(t.members.length).toBeGreaterThanOrEqual(4);
      expect(t.members.length).toBeLessThanOrEqual(6);
    }
  });

  it('rispetta la Species Clause: nessun numero Pokédex ripetuto nel team', () => {
    // due forme stesso dexNum: solo una può entrare
    const a = cand('FormA', ['wallbreaker'], ['Fire']);
    const b: Candidate = { ...cand('FormB', ['wallbreaker'], ['Fire']), dexNum: a.dexNum };
    const teams = generateTeams([a, b, ...roster()]);
    for (const t of teams) {
      expect(t.members.includes('FormA') && t.members.includes('FormB')).toBe(false);
    }
  });

  it('ordina per punteggio decrescente', () => {
    const teams = generateTeams(roster());
    const scores = teams.map((t) => t.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });

  it('vincoli iniziali: ogni proposta include i membri bloccati e arriva a 6', () => {
    const teams = generateTeams(roster(), { topN: 3, locked: ['Pivot1', 'SpeedCtrl'] });
    expect(teams.length).toBeGreaterThanOrEqual(1);
    for (const t of teams) {
      expect(t.members).toContain('Pivot1');
      expect(t.members).toContain('SpeedCtrl');
      expect(t.members.length).toBe(6);
      expect(new Set(t.members).size).toBe(t.members.length); // niente duplicati interni
    }
  });

  it('vincoli iniziali: un seed già completo (6) viene ritornato così com\'è', () => {
    const six = ['ScreenSetter', 'Breaker1', 'Sweeper1', 'Pivot1', 'SpeedCtrl', 'Filler1'];
    const teams = generateTeams(roster(), { topN: 5, locked: six });
    expect(teams.length).toBe(1);
    expect([...teams[0].members].sort()).toEqual([...six].sort());
  });

  it('integrazione: costruisce candidati reali e genera proposte', async () => {
    const names = ['Grimmsnarl', 'Incineroar', 'Amoonguss', 'Garganacl', 'Dragonite', 'Gyarados', 'Tyranitar', 'Rillaboom'];
    const candidates = await buildCandidates(names);
    expect(candidates.length).toBeGreaterThanOrEqual(6);
    const teams = generateTeams(candidates, { topN: 3 });
    expect(teams.length).toBeGreaterThanOrEqual(1);
    // nessun numero Pokédex ripetuto e dimensione valida
    for (const t of teams) {
      expect(t.members.length).toBeGreaterThanOrEqual(4);
      expect(new Set(t.members).size).toBe(t.members.length);
    }
  }, 30000);
});
