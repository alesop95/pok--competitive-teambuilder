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

Fase 3 implementata. Fatto: Fasi 0-2 (data layer, tagging §4.1, generazione §4.2, rationale §4.3,
meta M-B, engine/server/UI) + damage calc reale `src/calc.ts` (`@smogon/calc` + `@pkmn/data` sulla
mod champions) con coverage offensiva verificata in rationale e card UI (10/10 minacce M-B),
archetipo Weather e bonus sinergia. Inoltre: set competitivi completi per membro (`src/setBuilder.ts`)
con item, abilità, natura, Stat Points (66/max32, §0.5) e 4 mosse, esposti in rationale/API/UI/export.
App web su http://127.0.0.1:5187 (PORT override; NON usare la 3000, è di un'altra app dell'utente).
24/24 test verdi, typecheck pulito, pipeline ~2s. Prossima
azione: verificare la resa visiva delle card (coverage offensiva) con screenshot, poi committare il
blocco Fase 3 e ri-ancorare le schede con `sync-context` (puntano ancora a 373419b). Possibili
sviluppi: Fase 4 (rationale Livello 2 via API Claude) o Fase 5 (packaging/deploy), o raffinare il
meta con usage stats. Modifiche Fase 3 non committate.
