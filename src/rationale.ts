// Generazione del testo di rationale (handoff §4.3), a due livelli attivabili in configurazione.
//
// Livello 1 (sempre disponibile, offline, deterministico): template testuali che combinano i fatti
// strutturati (tag, type coverage calcolato, meta threats coperti/non coperti) in frasi leggibili.
// Niente AI, zero costi, funziona sempre.
//
// Livello 2 (opzionale, richiede ANTHROPIC_API_KEY e rete): i fatti del Livello 1 vengono passati a
// una chiamata all'API Claude per ottenere prosa più naturale. È un enhancement, non un requisito
// MVP, e degrada con grazia al Livello 1 se la chiave non è presente.
//
// Stub di Fase 0: il Livello 1 si implementa in Fase 1, il Livello 2 in Fase 4.
import type { TeamProposal } from './teamGenerator.js';

export type RationaleLevel = 1 | 2;

export function buildRationale(_team: TeamProposal, _level: RationaleLevel = 1): string {
  // TODO Fase 1: comporre il testo deterministico dai fatti strutturati del team.
  // TODO Fase 4: hook Livello 2 via @anthropic-ai/sdk dietro ANTHROPIC_API_KEY.
  return '';
}
