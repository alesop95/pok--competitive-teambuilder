# Snapshot di sincronizzazione

> Da leggere per primo a inizio sessione. Fotografa lo stato del progetto al commit di
> riferimento e mappa ogni scheda al suo stato di verifica. È la fonte di verità su cosa è fatto,
> non le spunte del diario.

## Stato

```
Branch attivo:         main
Commit di riferimento: 61690d5
Data snapshot:         2026-06-30
```

## Stato di verifica delle schede

| Scheda | last-verified | Stato |
|---|---|---|
| STACK.md | 61690d5 | aggiornata |
| design-and-security.md | 61690d5 | aggiornata |
| deployment.md | 61690d5 | aggiornata |
| dev-testing.md | 61690d5 | aggiornata |
| current-work.md | 61690d5 | aggiornata |
| roadmap.md | 61690d5 | aggiornata |

## Stato sintetico (2026-06-30)

App completa rispetto al richiesto: motore (tagging §4.1, generazione §4.2 guidata da viability con
damage calc, rationale §4.3), meta M-B curato, set completi (item/abilità/natura/Stat Points/mosse,
Mega), damage calc reale `@smogon/calc`, legalità di formato (serebii), UI Fastify con salvataggio e
storico, rifiniture, prep deploy Render, documentazione tecnica `docs/TECHNICAL.md`. In più (commit
61690d5, ADR-010): vincoli iniziali alla generazione (membri bloccati completati fino a 6) con
import/export in formato Pokémon Showdown (`src/showdown.ts` su `@pkmn/sets`, mappatura SP<->EV); e
watcher dei content creator competitivi (`npm run creators`, RSS keyless) con JoeUX9, WolfeyVGC,
CybertronVGC e aDrive come reference. 40/40 test verdi, typecheck pulito. Verificato il 2026-06-30 che
non esiste un mod Reg M-B a monte (solo `champions` + `championsregma`): serebii più usage restano
fonte di verità. Migrazione ADR-009/ADR-011 completata nel codice: app eseguibile anche come SPA
statica client-side in `web/` (motore nel browser, dati via fetch, storico/meta su IndexedDB),
pubblicabile gratis su GitHub Pages via workflow. Non fatto (opzionale, non selezionato): Fase 4
rationale Livello 2 via API Claude.

## Punto di ripresa

Due modi di eseguire l'app: server locale Fastify su http://127.0.0.1:5187 (`npm start`; NON usare la
3000), e la nuova SPA statica client-side in `web/` (`npm run dev:web`, build `npm run build:web`,
anteprima `npm run preview:web`). La migrazione ADR-009/ADR-011 è completata nel codice (porting UI +
hosting Pages configurato); manca solo, lato utente, abilitare Pages (Settings > Pages > Source =
GitHub Actions) e fare push, oltre al commit di questo blocco (schede da ri-ancorare con sync-context
dopo il commit). Prossimo lavoro concordato: modalità Costruisci, builder manuale interattivo ispirato
a champteams.gg/builder (coverage, speed tier, damage calc live, share), riusando l'engine. Sviluppi
opzionali residui: Fase 4 rationale Livello 2 via API Claude (non selezionata); altri canali in
`creators.json` (James Baek in attesa dell'URL giusto); limiti in `docs/TECHNICAL.md` §7 e
ri-quantizzazione EV->SP dell'import (ADR-010).
