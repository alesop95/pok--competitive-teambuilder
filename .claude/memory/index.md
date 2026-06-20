# Snapshot di sincronizzazione

> Da leggere per primo a inizio sessione. Fotografa lo stato del progetto al commit di
> riferimento e mappa ogni scheda al suo stato di verifica. È la fonte di verità su cosa è fatto,
> non le spunte del diario.

## Stato

```
Branch attivo:         main
Commit di riferimento: 373419b
Data snapshot:         2026-06-19
```

## Stato di verifica delle schede

| Scheda | last-verified | Stato |
|---|---|---|
| STACK.md | 373419b | aggiornata |
| design-and-security.md | 373419b | aggiornata |
| deployment.md | 373419b | aggiornata |
| dev-testing.md | 373419b | aggiornata |
| current-work.md | 373419b | aggiornata |
| roadmap.md | 373419b | aggiornata |

## Punto di ripresa

Fase 1 in corso. Fatti e testati (14/14 verdi): data layer (`pkmnData.ts` su mod `champions`),
regolamento M-B ufficiale + roster (`season_MB.json`, 283 forme via `scripts/fetch_roster.ts`),
tagging dei ruoli §4.1 (`roleTagging.ts`). ADR-005/006/007 chiuse. Prossima azione: implementare
`src/teamGenerator.ts` (§4.2) — archetipi, core, scoring di coverage/sinergia — poi `rationale.ts`
Livello 1 (§4.3) per chiudere la Fase 1. Nota: molte modifiche non committate (più sessioni di
lavoro accumulate).
