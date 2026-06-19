---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - package.json
  - tsconfig.json
  - src/**
  - data/**
last-verified-commit: 373419b
stato: in corso
source-doc: pokemon-champions-team-builder-spec.md
---

# Lavoro in corso

> La fonte di verità su cosa è fatto resta `memory/index.md` e il work-log, non le spunte di
> questo file.

## Feature: Fase 0 — scaffold del progetto Node/TS

Cosa fa: predispone il progetto avviabile (manifesto, configurazione, struttura sorgenti e dati)
secondo §6 dell'handoff, senza ancora la logica del motore (che è Fase 1).

File da creare:

```
LICENSE                      MIT
package.json                 dipendenze + scripts dev/test/build
tsconfig.json                configurazione TypeScript strict
src/server.ts                entrypoint Fastify con rotta health
src/pkmnData.ts              stub wrapper @pkmn/dex + @smogon/calc
src/roleTagging.ts           stub §4.1
src/teamGenerator.ts         stub §4.2
src/rationale.ts             stub §4.3
tests/roleTagging.test.ts    test placeholder Vitest
data/champions_overrides.json  stub eccezioni (ADR-005)
data/seasons/.gitkeep        roster e meta arrivano da Alessio
data/generated_teams/.gitkeep
scripts/refresh_meta_sets.ts stub opzionale
```

Definition of done:

- [ ] `npm install` completa e genera `package-lock.json`
- [ ] `npm run dev` avvia Fastify e una rotta health risponde
- [ ] `npm test` esegue Vitest senza errori di configurazione
- [ ] esito della verifica §0.3 (mod champions) registrato in `decisions.md`

Domande aperte:

§0.3 — la mod `champions` di Pokémon Showdown è esposta dal pacchetto npm `@pkmn/mods`, oppure va
recuperata direttamente dal repository perché troppo recente? Da chiarire integrando i pacchetti
(vedi ADR-005). Non blocca lo scaffold.

Promemoria MCP: il server MCP `code-context-provider-mcp` non è stato configurato in fase di init
(poco utile in greenfield). Si può aggiungere in seguito rieseguendo il gate MCP della skill
`init-project-system`, istanziando `templates/mcp.windows.json` in `.mcp.json` di radice.

## Riconciliazione

Ultima verifica: 2026-06-19 al commit 373419b.
