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

Fase 2 implementata (MVP). Fatto: motore Fase 1 (data layer, tagging §4.1, generazione §4.2,
rationale L1 §4.3), meta M-B curato (preliminare), engine condiviso `src/engine.ts`, server Fastify
+ API + SPA `src/public/index.html` con le 4 pagine §5. App web su http://127.0.0.1:5187 (PORT
override; la 3000 è di un'altra app dell'utente, non usarla). 19/19 test verdi, API verificate via
curl. Prossima azione: verificare la resa visiva della UI con uno screenshot dell'utente, poi
committare il blocco Fase 2. Limiti noti: scoring senza damage calc reale (Fase 3); meta da
raffinare con usage stats. Modifiche non committate: meta + Fase 1 (teamGenerator/rationale/CLI) +
Fase 2 (engine/server/UI).
