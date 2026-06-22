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

## Stato sintetico (2026-06-22)

App completa rispetto al richiesto: motore (tagging §4.1, generazione §4.2 guidata da viability con
damage calc, rationale §4.3), meta M-B curato, set completi (item/abilità/natura/Stat Points/mosse,
Mega), damage calc reale `@smogon/calc`, legalità di formato (serebii), UI Fastify con salvataggio e
storico, rifiniture (viability con stazza, TR vs Tailwind, nature da contesto), prep deploy Render, e
documentazione tecnica `docs/TECHNICAL.md`. 29/29 test verdi, typecheck pulito. Non fatto (opzionale,
non selezionato): Fase 4 rationale Livello 2 via API Claude.

## Punto di ripresa

App web su http://127.0.0.1:5187 (PORT override; NON usare la 3000, è di un'altra app dell'utente).
Prossima azione di processo: l'utente fa il commit dei blocchi accumulati (Fase 3, set, viability,
salvataggio/storico, legalità, rifiniture, Fase 5, documentazione) e poi si esegue `sync-context`
per ri-ancorare le schede a HEAD (puntano ancora a 373419b). Sviluppi opzionali rimasti: Fase 4
(rationale Livello 2 via API Claude, non selezionata), raffinare il meta con usage stats reali, e i
limiti noti elencati in `docs/TECHNICAL.md` §7.
