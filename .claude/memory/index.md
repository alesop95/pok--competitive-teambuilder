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

Sistema inizializzato e scaffold della Fase 0 committato (`373419b`); schede ancorate a HEAD via
`sync-context`. Prossima azione: Fase 1 dell'handoff — implementare il tagging dei ruoli
(`src/roleTagging.ts`, §4.1) e la generazione team (`src/teamGenerator.ts`, §4.2) sul roster M-B
quando Alessio lo fornisce. Domanda aperta da chiudere in Fase 1: la mod `champions` di Showdown è
esposta da `@pkmn/mods` o va importata dal repository (ADR-005, vedi `current-work.md`).
