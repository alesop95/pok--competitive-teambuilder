// Damage calc reale per il formato Champions (handoff §7, Fase 3). Usa @smogon/calc con una
// Generation di @pkmn/data costruita sulla dex moddata "champions", così i numeri di danno
// riflettono i dati del formato (verificato: Incineroar Flare Blitz vs Amoonguss ~84-100%).
//
// L'API resta semplice: dato attaccante e difensore, sceglie la mossa migliore dell'attaccante
// contro quel difensore (euristica STAB + efficacia di tipo) e ritorna la percentuale di danno.
import { calculate, Pokemon, Move } from '@smogon/calc';
import { Generations, type Generation } from '@pkmn/data';
import { Dex, type ID, type ModData } from '@pkmn/dex';
import { getChampionsDex, getDefenseMap } from './pkmnData.js';

let genPromise: Promise<Generation> | undefined;

// Generation champions condivisa (singleton): costruita dalla dex moddata, riusa @pkmn/mods.
export async function getChampionsGen(): Promise<Generation> {
  if (!genPromise) {
    genPromise = (async () => {
      const mod = (await import('@pkmn/mods/champions')) as unknown as ModData;
      const modded = Dex.mod('champions' as ID, mod);
      // Predicato `exists` permissivo: il filtro di default di @pkmn/data scarta le specie marcate
      // isNonstandard (es. Mawile nella mod), escludendole dal calc; la dex champions cura già il
      // pool del formato, quindi includiamo tutto ciò che la dex considera esistente.
      // i tipi di @pkmn/dex e @pkmn/data divergono leggermente: cast controllato come da ecosistema.
      return new Generations(modded as never, (d: { exists?: boolean }) => d?.exists !== false).get(9);
    })();
  }
  return genPromise;
}

export interface DamageResult {
  move: string;
  pctMin: number;
  pctMax: number;
}

// Percentuale di danno della mossa migliore dell'attaccante contro il difensore, a Lv50 con spread
// offensivo/difensivo standard (max investimento nella stat rilevante, natura coerente). La scelta
// della mossa è un'euristica deterministica: massimizza basePower x STAB x efficacia di tipo, poi
// si calcola il danno reale solo per quella mossa (una calc per coppia, costo contenuto).
const damageCache = new Map<string, DamageResult | null>();

export async function bestDamagePercent(attacker: string, defender: string): Promise<DamageResult | null> {
  const key = `${attacker}>${defender}`;
  if (damageCache.has(key)) return damageCache.get(key)!;
  const result = await computeBestDamage(attacker, defender);
  damageCache.set(key, result);
  return result;
}

async function computeBestDamage(attacker: string, defender: string): Promise<DamageResult | null> {
  const dex = await getChampionsDex();
  const atkSp = dex.species.get(attacker);
  const defSp = dex.species.get(defender);
  if (!atkSp?.exists || !defSp?.exists) return null;

  const learnset = await dex.learnsets.get(atkSp.id);
  const defenseMap = await getDefenseMap(defSp.types);

  let bestMove: string | null = null;
  let bestCategory: 'Physical' | 'Special' = 'Physical';
  let bestEstimate = -1;
  for (const moveId of Object.keys(learnset?.learnset ?? {})) {
    const m = dex.moves.get(moveId);
    if (!m?.exists || m.category === 'Status' || m.basePower <= 0) continue;
    // scarta mosse poco pratiche per la stima della minaccia: due turni/ricarica/differite e bassa
    // precisione (l'accuratezza può essere `true` per le mosse che non mancano mai).
    const flags = m.flags as Record<string, unknown> | undefined;
    if (flags?.charge || flags?.recharge || flags?.futuremove) continue;
    if (typeof m.accuracy === 'number' && m.accuracy < 80) continue;
    const stab = atkSp.types.includes(m.type) ? 1.5 : 1;
    const eff = defenseMap[m.type] ?? 1; // moltiplicatore difensivo del difensore vs il tipo mossa
    // pesa la stat offensiva reale: una mossa speciale ad alto BP su un attaccante fisico rende
    // poco, quindi la stima usa Attacco per le fisiche e Att. Speciale per le speciali.
    const offStat = m.category === 'Physical' ? atkSp.baseStats.atk : atkSp.baseStats.spa;
    const estimate = m.basePower * stab * eff * offStat;
    if (estimate > bestEstimate) {
      bestEstimate = estimate;
      bestMove = m.name;
      bestCategory = m.category as 'Physical' | 'Special';
    }
  }
  if (!bestMove) return null;

  const gen = await getChampionsGen();
  // Alcune forme della mod possono non essere risolvibili dal costruttore Pokemon di calc: in tal
  // caso si rinuncia al numero per quella coppia (nessuna risposta) invece di interrompere il run.
  if (!gen.species.get(atkSp.id)?.exists || !gen.species.get(defSp.id)?.exists) return null;
  const atkSpread = bestCategory === 'Physical'
    ? { evs: { atk: 252 }, nature: 'Adamant' }
    : { evs: { spa: 252 }, nature: 'Modest' };
  const defKey = bestCategory === 'Physical' ? 'def' : 'spd';
  try {
    const atkMon = new Pokemon(gen, atkSp.name, { level: 50, ...atkSpread });
    const defMon = new Pokemon(gen, defSp.name, { level: 50, evs: { hp: 252, [defKey]: 252 }, nature: 'Calm' });
    const res = calculate(gen, atkMon, defMon, new Move(gen, bestMove));
    const range = res.range();
    const maxHP = defMon.maxHP();
    return {
      move: bestMove,
      pctMin: Math.round((range[0] / maxHP) * 1000) / 10,
      pctMax: Math.round((range[1] / maxHP) * 1000) / 10,
    };
  } catch {
    return null;
  }
}
