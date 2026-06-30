---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - tests/**
  - package.json
last-verified-commit: 61690d5
source-doc: pokemon-champions-team-builder-spec.md
---

# Test di sviluppo

> Struttura con i fatti noti. La checklist operativa locale dei test manuali vive in
> `_notes/TEST-CHECKLIST.md`, ignorata da git.

## Test runner e comandi

Il test runner è Vitest (MIT), eseguito con `npm test` (`vitest run`). La config dei test sta in
`vitest.config.ts`, separata da `vite.config.ts` (che ha root in `web/` per la build della SPA): senza
quella separazione Vitest erediterebbe il root `web/` e non troverebbe i test. I test stanno sotto `tests/`
e sono 40 su sette file (inclusi i casi calc per meteo e immunità da abilità): `roleTagging.test.ts`
(regole §4.1 su fixture), `pkmnData.test.ts` (mod champions: specie reali e tagging),
`teamGenerator.test.ts` (archetipi, Species Clause, ordinamento, vincoli iniziali `locked`,
integrazione), `calc.test.ts` (damage calc reale su matchup noti), `setBuilder.test.ts` (set, Mega,
filtro mosse, Stat Points), `legality.test.ts` (validazione legalità formato), `showdown.test.ts`
(mappatura SP<->EV, round-trip export/import Showdown, `prepareImport` sul roster M-B reale). I test
unitari usano fixture pure; quelli di integrazione interrogano la dex champions in-process.

## Rotte e dati mockati

Per i test del motore non serve rete: i dati di gioco vengono da `@pkmn/dex` in-process. Il damage
calc è memoizzato. Il rationale Livello 2 (API Claude) non è implementato; quando lo sarà andrà
isolato dietro la presenza di `ANTHROPIC_API_KEY`, così la suite resta offline per default.

## Hook e controlli di qualità

Prima del commit (manuale dell'utente) si eseguono i controlli di qualità: type-check TypeScript
(`tsc --noEmit`, esposto come `npm run typecheck`) e la suite Vitest. Lint da definire in Fase 1 se
si adotta ESLint. Commit e push restano sempre manuali.
