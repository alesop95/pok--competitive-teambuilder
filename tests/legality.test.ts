// Verifica la validazione di legalità di formato (cross-check serebii, data/seasons/legal_MB.json):
// gli strumenti non disponibili nel formato vengono sostituiti e segnalati.
import { describe, it, expect } from 'vitest';
import { loadLegality, validateSet } from '../src/engine.js';
import type { PokemonSet } from '../src/setBuilder.js';

describe('legalità formato M-B', () => {
  it('il manifesto si carica e contiene strumenti e mosse', async () => {
    const legality = await loadLegality('MB');
    expect(legality).not.toBeNull();
    expect(legality!.items.size).toBeGreaterThan(100);
    expect(legality!.moves.size).toBeGreaterThan(100);
  });

  it('Safety Goggles (non legale in M-B) viene sostituito e segnalato; Life Orb resta', async () => {
    const legality = await loadLegality('MB');
    const set: PokemonSet = { species: 'Test', ability: 'X', item: 'Safety Goggles', nature: 'Adamant', statPoints: {}, moves: ['Protect'] };
    const warnings = validateSet(set, legality!);
    expect(warnings.some((w) => w.includes('Safety Goggles'))).toBe(true);
    expect(set.item).toBe('Sitrus Berry');

    const legal: PokemonSet = { species: 'Test', ability: 'X', item: 'Life Orb', nature: 'Adamant', statPoints: {}, moves: ['Protect'] };
    expect(validateSet(legal, legality!).filter((w) => w.includes('strumento'))).toHaveLength(0);
  });
});
