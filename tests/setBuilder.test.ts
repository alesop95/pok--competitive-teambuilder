// Test del set builder (handoff: set completi). Verifica scelte coerenti col ruolo e i vincoli del
// sistema Stat Points di Champions (66 totali, max 32 per statistica).
import { describe, it, expect } from 'vitest';
import { buildSet } from '../src/setBuilder.js';

describe('setBuilder', () => {
  it('Grimmsnarl screens_setter: Light Clay, Prankster, schermo + Protect, SP validi', async () => {
    const set = await buildSet('Grimmsnarl', ['screens_setter']);
    expect(set).not.toBeNull();
    expect(set!.item).toBe('Light Clay');
    expect(set!.ability).toBe('Prankster');
    expect(set!.moves.length).toBeLessThanOrEqual(4);
    expect(set!.moves.some((m) => m === 'Reflect' || m === 'Light Screen')).toBe(true);
    // vincoli Stat Points
    const total = Object.values(set!.statPoints).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(66);
    for (const v of Object.values(set!.statPoints)) expect(v).toBeLessThanOrEqual(32);
  }, 30000);

  it('Incineroar: Intimidate, 4 mosse, natura definita', async () => {
    const set = await buildSet('Incineroar', ['pivot']);
    expect(set).not.toBeNull();
    expect(set!.ability).toBe('Intimidate');
    expect(set!.moves.length).toBe(4);
    expect(typeof set!.nature).toBe('string');
  }, 30000);

  it('Mega: con opts.mega usa la forma Mega, la Mega Stone e la sua abilità', async () => {
    const set = await buildSet('Venusaur', ['wallbreaker'], { mega: true });
    expect(set).not.toBeNull();
    expect(set!.species).toBe('Venusaur-Mega');
    expect(set!.item).toBe('Venusaurite');
    expect(set!.ability).toBe('Thick Fat');
    expect(set!.mega).toBe(true);
  }, 30000);

  it('niente Focus Punch nei set (mossa poco pratica in doppio)', async () => {
    const set = await buildSet('Pikachu', ['priority_closer']);
    expect(set!.moves).not.toContain('Focus Punch');
  }, 30000);

  it('ritorna null per specie inesistente', async () => {
    expect(await buildSet('Notapokemon', [])).toBeNull();
  });
});
