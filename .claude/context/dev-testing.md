---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - tests/**
  - package.json
last-verified-commit: 373419b
source-doc: pokemon-champions-team-builder-spec.md
---

# Test di sviluppo

> Struttura con i fatti noti. La checklist operativa locale dei test manuali vive in
> `_notes/TEST-CHECKLIST.md`, ignorata da git.

## Test runner e comandi

Il test runner è Vitest (MIT), eseguito con `npm test` (`vitest run`). I test stanno sotto
`tests/`. In Fase 0 c'è un test placeholder; la copertura reale parte in Fase 1 sul tagging dei
ruoli (`tests/roleTagging.test.ts`), dove le regole deterministiche di §4.1 sono naturalmente
testabili con casi noti (un Pokémon con Prankster + Reflect deve risultare `screens_setter`, ecc.).

## Rotte e dati mockati

Per i test del motore non serve rete: i dati di gioco vengono da `@pkmn/dex` in-process e i roster
di test sono fixture JSON locali. Il rationale Livello 2 (API Claude) si testa solo con la chiave
presente e va isolato dietro un flag, così la suite gira offline per default.

## Hook e controlli di qualità

Prima del commit (manuale dell'utente) si eseguono i controlli di qualità: type-check TypeScript
(`tsc --noEmit`, esposto come `npm run typecheck`) e la suite Vitest. Lint da definire in Fase 1 se
si adotta ESLint. Commit e push restano sempre manuali.
