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

Fase 1 COMPLETA (19/19 test verdi): data layer su mod `champions`, regolamento M-B + roster
(`season_MB.json`), tagging ruoli §4.1, generazione team §4.2, rationale L1 §4.3 e CLI
`scripts/generate.ts` (tag→genera→rationale→file in ~2s). ADR-005/006/007 chiuse. Prossima azione:
o Fase 2 (UI web minima Fastify, handoff §5), o curare `season_MB_meta.yaml` (top_threats) per
alzare la qualità dello scoring (oggi piatto senza meta; damage calc reale è Fase 3). Nota: ultimo
blocco (teamGenerator/rationale/CLI) non ancora committato.
