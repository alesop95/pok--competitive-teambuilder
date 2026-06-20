// Verifica l'integrazione di @pkmn/dex con la mod "champions" (ADR-005/007): la dex si carica e le
// query restituiscono dati reali del formato Pokémon Champions.
import { describe, it, expect } from 'vitest';
import { getChampionsDex, getSpecies } from '../src/pkmnData.js';

describe('pkmnData / mod champions', () => {
  it('carica la dex champions con un numero plausibile di specie', async () => {
    const dex = await getChampionsDex();
    const all = dex.species.all().filter((s) => s.exists);
    expect(all.length).toBeGreaterThan(1000);
  });

  it('restituisce stats, tipi e abilità reali per una specie nota', async () => {
    const incineroar = await getSpecies('Incineroar');
    expect(incineroar).not.toBeNull();
    expect(incineroar!.types).toEqual(['Fire', 'Dark']);
    expect(incineroar!.baseStats.atk).toBe(115);
    expect(incineroar!.abilities).toContain('Intimidate');
  });

  it('restituisce null per una specie inesistente', async () => {
    expect(await getSpecies('Notapokemon')).toBeNull();
  });
});
