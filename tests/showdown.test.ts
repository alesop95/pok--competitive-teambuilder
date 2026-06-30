// Test dell'import/export in formato Pokémon Showdown (src/showdown.ts) e della mappatura Stat Points
// <-> EV (src/setBuilder.ts). Il round-trip export->import deve essere stabile, e prepareImport deve
// riconoscere i membri del roster M-B reale segnalando come avviso (non errore) ciò che è fuori formato.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportTeam, importTeam } from '../src/showdown.js';
import { spToEvs, evsToSp, type PokemonSet } from '../src/setBuilder.js';
import { prepareImport, setDataSource } from '../src/engine.js';
import { NodeDataSource } from '../src/nodeDataSource.js';

setDataSource(new NodeDataSource(join(dirname(fileURLToPath(import.meta.url)), '..', 'data')));

describe('mappatura Stat Points <-> EV', () => {
  it('32 SP -> 252 EV (cap) e ritorno a 32', () => {
    expect(spToEvs({ atk: 32 }).atk).toBe(252);
    expect(evsToSp({ atk: 252 }).atk).toBe(32);
  });
  it('valori intermedi e zero', () => {
    expect(spToEvs({ hp: 16 }).hp).toBe(128);
    expect(evsToSp({ hp: 128 }).hp).toBe(16);
    expect(evsToSp({}).hp).toBeUndefined();
    expect(spToEvs({}).spe).toBe(0);
  });
});

describe('export/import formato Showdown', () => {
  const set: PokemonSet = {
    species: 'Garchomp',
    ability: 'Rough Skin',
    item: 'Life Orb',
    nature: 'Adamant',
    statPoints: { atk: 32, spe: 32, hp: 2 },
    moves: ['Earthquake', 'Dragon Claw', 'Stone Edge', 'Protect'],
  };

  it('export produce il formato Showdown standard (EV, Level 50, Nature)', () => {
    const txt = exportTeam([set]);
    expect(txt).toContain('Garchomp @ Life Orb');
    expect(txt).toContain('Ability: Rough Skin');
    expect(txt).toContain('Level: 50');
    expect(txt).toContain('Adamant Nature');
    expect(txt).toContain('252 Atk');
    expect(txt).toContain('252 Spe');
  });

  it('round-trip export -> import stabile sugli stat points', () => {
    const back = importTeam(exportTeam([set]));
    expect(back).toHaveLength(1);
    expect(back[0].species).toBe('Garchomp');
    expect(back[0].item).toBe('Life Orb');
    expect(back[0].nature).toBe('Adamant');
    expect(back[0].statPoints).toEqual({ atk: 32, spe: 32, hp: 2 });
    expect(back[0].moves).toHaveLength(4);
  });

  it('importa un team parziale di 2 membri, anche con set minimale', () => {
    const text = `Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
EVs: 252 HP / 252 SpD
Careful Nature
- Fake Out
- Knock Off
- Parting Shot
- Protect

Amoonguss`;
    const members = importTeam(text);
    expect(members).toHaveLength(2);
    expect(members[0].species).toBe('Incineroar');
    expect(members[0].statPoints.hp).toBe(32);
    expect(members[1].species).toBe('Amoonguss');
  });
});

describe('prepareImport: vincoli iniziali sul roster M-B reale', () => {
  it('riconosce un membro del roster e lo restituisce come bloccato con il set', async () => {
    const text = `Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
EVs: 252 HP / 4 Atk / 252 SpD
Careful Nature
- Fake Out
- Knock Off
- Parting Shot
- Protect`;
    const prep = await prepareImport('MB', text);
    expect(prep.locked).toContain('Incineroar');
    expect(prep.lockedSets[0].species).toBe('Incineroar');
  }, 60000);

  it('segnala una specie fuori roster come avviso senza bloccarla', async () => {
    const prep = await prepareImport('MB', 'Notapokemon\n\nIncineroar');
    expect(prep.warnings.length).toBeGreaterThanOrEqual(1);
    expect(prep.locked).not.toContain('Notapokemon');
  }, 60000);
});
