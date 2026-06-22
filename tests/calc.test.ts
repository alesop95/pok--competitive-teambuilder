// Verifica il damage calc reale (Fase 3): @smogon/calc su Generation @pkmn/data costruita dalla mod
// champions. Controlla che i numeri siano plausibili per matchup noti del formato.
import { describe, it, expect } from 'vitest';
import { bestDamagePercent } from '../src/calc.js';

describe('calc / damage champions', () => {
  it('Incineroar colpisce forte Amoonguss (Fuoco vs Erba/Veleno)', async () => {
    const r = await bestDamagePercent('Incineroar', 'Amoonguss');
    expect(r).not.toBeNull();
    expect(typeof r!.move).toBe('string');
    expect(r!.pctMax).toBeGreaterThanOrEqual(80); // Flare Blitz ~84-100%
  }, 30000);

  it('ritorna null per una specie inesistente', async () => {
    expect(await bestDamagePercent('Notapokemon', 'Amoonguss')).toBeNull();
  }, 30000);

  it('il meteo potenzia: pioggia aumenta il danno di una STAB Acqua', async () => {
    const dry = await bestDamagePercent('Basculegion', 'Garganacl');
    const rain = await bestDamagePercent('Basculegion', 'Garganacl', { weather: 'Rain' });
    expect(dry).not.toBeNull();
    expect(rain).not.toBeNull();
    expect(rain!.pctMax).toBeGreaterThan(dry!.pctMax);
  }, 30000);

  it('immunità da abilità: contro Levitate non sceglie una mossa di Terra', async () => {
    const r = await bestDamagePercent('Garchomp', 'Hydreigon'); // Hydreigon ha Levitate
    expect(r).not.toBeNull();
    expect(['Earthquake', 'Earth Power', 'High Horsepower', 'Bulldoze', 'Stomping Tantrum']).not.toContain(r!.move);
  }, 30000);
});
