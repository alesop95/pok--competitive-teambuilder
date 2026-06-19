# Snapshot di sincronizzazione

> Da leggere per primo a inizio sessione. Fotografa lo stato del progetto al commit di
> riferimento e mappa ogni scheda al suo stato di verifica. È la fonte di verità su cosa è fatto,
> non le spunte del diario.

## Stato

```
Branch attivo:         main
Commit di riferimento: PENDING-FIRST-COMMIT
Data snapshot:         2026-06-19
```

## Stato di verifica delle schede

| Scheda | last-verified | Stato |
|---|---|---|
| STACK.md | PENDING-FIRST-COMMIT | aggiornata |
| design-and-security.md | PENDING-FIRST-COMMIT | aggiornata |
| deployment.md | PENDING-FIRST-COMMIT | aggiornata |
| dev-testing.md | PENDING-FIRST-COMMIT | aggiornata |
| current-work.md | PENDING-FIRST-COMMIT | aggiornata |
| roadmap.md | PENDING-FIRST-COMMIT | aggiornata |

## Punto di ripresa

Il sistema è inizializzato e lo scaffold della Fase 0 è creato ma non ancora committato. Prossima
azione: l'utente esegue il primo commit manuale, poi si lancia la skill `sync-context` per
sostituire ogni `PENDING-FIRST-COMMIT` con l'hash reale di HEAD. Subito dopo, Fase 1 dell'handoff:
implementare il tagging dei ruoli (`src/roleTagging.ts`, §4.1) e la generazione team
(`src/teamGenerator.ts`, §4.2) sul roster M-B quando Alessio lo fornisce. Domanda aperta da
chiudere in Fase 0/1: la mod `champions` di Showdown è esposta da `@pkmn/mods` o va importata dal
repository (vedi `current-work.md`).
