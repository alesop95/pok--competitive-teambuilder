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

Fase 1 in corso. Data layer verificato: `pkmnData.ts` carica la mod `champions` via `@pkmn/mods` e
interroga le specie (test verdi). ADR-005 e ADR-007 chiuse. Prossima azione: generare
`data/seasons/season_MB.json` (lista M-B da serebii, con validità regolamento 17 giu → 2 set 2026)
e implementare il tagging dei ruoli `src/roleTagging.ts` (§4.1) con i relativi test. Nota: ci sono
modifiche non committate (data layer + decisioni + ancoraggio sync-context).
