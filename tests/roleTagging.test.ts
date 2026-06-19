// Placeholder di Fase 0: verifica solo che lo scaffold e l'import del modulo funzionino.
// In Fase 1 questo file ospiterà i casi reali della tabella §4.1 (es. Prankster + Reflect =>
// screens_setter), che sono naturalmente testabili perché deterministici.
import { describe, it, expect } from 'vitest';
import { tagRoles } from '../src/roleTagging.js';

describe('roleTagging (scaffold)', () => {
  it('espone tagRoles e in Fase 0 ritorna un array vuoto', () => {
    const tags = tagRoles(
      {
        species: 'Placeholder',
        baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
        abilities: [],
        types: [],
      },
      [],
    );
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toHaveLength(0);
  });
});
