---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - src/**
  - package.json
  - tsconfig.json
  - data/**
last-verified-commit: ce14c8e
source-doc: pokemon-champions-team-builder-spec.md
---

# Stack applicativo

> Documento di recupero più importante: tracciato, perché un collega che clona deve vederlo. Le
> decisioni di stack derivano dall'handoff `pokemon-champions-team-builder-spec.md` (§2, §9), che
> resta la fonte. I dettagli di implementazione dei file si affinano leggendo il codice man mano.

## Stack e runtime

Il backend è interamente Node.js, versione 20 o superiore LTS, scritto in TypeScript. Il web server
è Fastify. La gestione delle dipendenze è npm tramite `package.json`, con `package-lock.json`
tracciato per garantire build riproducibili; l'avvio è identico su Windows e Linux (`npm install`
poi `npm run dev`), senza script di shell separati per i due sistemi operativi.

I dati di gioco non si importano a mano: arrivano dall'ecosistema open source MIT costruito attorno
a Pokémon Showdown. Le dipendenze npm dirette, con licenza e ruolo, sono le seguenti.

```
@pkmn/dex     MIT  dati di gioco completi: specie, stats base, abilità, movepool, type chart
              https://www.npmjs.com/package/@pkmn/dex  ·  repo https://github.com/pkmn/ps
@smogon/calc  MIT  damage calc reale (formula esatta gen 1-9), ha "Champions" come formato
              https://www.npmjs.com/package/@smogon/calc  ·  repo https://github.com/smogon/damage-calc
js-yaml       MIT  parsing dei file meta di stagione (data/seasons/*_meta.yaml)
              https://www.npmjs.com/package/js-yaml
fastify       MIT  web server leggero (Fase 2+)
              https://www.npmjs.com/package/fastify  ·  repo https://github.com/fastify/fastify
```

DevDependencies: TypeScript (compilatore Apache 2.0), Vitest (MIT,
https://www.npmjs.com/package/vitest) come test runner, e tsx (MIT) per eseguire TS senza build
in sviluppo.

Installati in aggiunta (Fase 1-3): `@pkmn/mods` (MIT, espone la mod `champions` - ADR-005),
`@pkmn/data` (MIT, costruisce la `Generation` per `@smogon/calc` dalla dex moddata - Fase 3),
`@fastify/static` (MIT, serve il frontend - Fase 2).

Pacchetti opzionali non installati: `@smogon/sets` (MIT, set da usage stats Showdown; riflette il
meta dei tier Showdown, non quello Champions, solo riferimento generico), `@pkmn/sets` (MIT,
import/export team in formato testo), `@pkmn/dmg` (MIT, successore di `@smogon/calc`),
`better-sqlite3` (MIT, solo se servirà un DB - vedi ADR-003).

## Fonti open source da consultare (non installate, ma origine di dati/logica)

```
smogon/pokemon-showdown            MIT     motore originale da cui derivano i pacchetti @pkmn/@smogon
  https://github.com/smogon/pokemon-showdown
  data/mods/champions              MIT     regole specifiche del formato Champions (ADR-005)
pkmn/dmg                           MIT     damage calc moderno alternativo
smogon/pokemon-showdown-client     AGPLv3  NON usato (licenza diversa dal server; non ci serve la UI)
calc.pokemonshowdown.com           -       calcolatore ufficiale, per verifiche manuali dei numeri
```

## Fonti dati di stagione (serebii.net) - da rileggere a ogni aggiornamento del roster

Fonte autorevole per la disponibilità di stagione (Pokémon, mosse, strumenti), da riconsultare ogni
volta che cambia la stagione prima di rigenerare i file `data/seasons/`. Riferimento, non dipendenze.
La procedura operativa di aggiornamento vive in `data/seasons/README.md` (handoff §8).

```
Pokémon disponibili     https://www.serebii.net/pokemonchampions/pokemon.shtml
Mosse usabili           https://www.serebii.net/pokemonchampions/moves.shtml
Attacchi (aggiornati)   https://www.serebii.net/pokemonchampions/updatedattacks.shtml
Strumenti disponibili   https://www.serebii.net/pokemonchampions/items.shtml
```

## Alternative deliberatamente escluse

Python come linguaggio del backend: scartato (ADR-002) perché imporrebbe un ponte permanente verso
Node per usare l'ecosistema `@pkmn`/`@smogon`, nativo TypeScript. Battle engine completo / simulazione
turno per turno: fuori ambito per l'MVP, l'app ragiona per sinergie e coverage, non per simulazione
(eventuale Fase 5). Database relazionale o SQLite per l'MVP: non necessario (ADR-003), si usano file
flat JSON/YAML. Client di Pokémon Showdown: escluso per licenza AGPLv3 e perché non serve la loro UI.

## Flussi di codice e ruolo architetturale dei file

La struttura sorgente segue §6 dell'handoff. In Fase 0 i moduli sono stub commentati; la logica
arriva in Fase 1+.

```
src/server.ts        entrypoint Fastify + @fastify/static; API REST (seasons/season/meta/generate)
src/engine.ts        orchestrazione condivisa CLI+server: load dati, cache candidati, post-pass coverage offensiva
src/pkmnData.ts      wrapper su @pkmn/dex + mod champions; specie, movepool, tagging, mappa difensiva
src/calc.ts          damage calc reale (@smogon/calc + @pkmn/data sulla mod champions); bestDamagePercent
src/roleTagging.ts   §4.1 - assegna tag di ruolo deterministici a ogni Pokémon (regole su stats/ability/movepool)
src/teamGenerator.ts §4.2 - identifica archetipi, costruisce core, riempie slot, assegna punteggio
src/rationale.ts     §4.3 - Livello 1 testo deterministico (con coverage offensiva); hook Livello 2 via API Claude
src/public/index.html SPA frontend servita da Fastify (Fase 2): le 4 pagine §5
src/engine.ts        orchestrazione: load dati, cache candidati, viability, generazione, salvataggio/storico, legalità
src/setBuilder.ts    set completo per Pokémon: item, abilità, natura, Stat Points, 4 mosse, forme Mega
data/champions_overrides.json   eccezioni residue non coperte dalla mod champions (ADR-005)
data/seasons/season_<id>.json   roster + regolamento (regulation) di stagione
data/seasons/season_<id>_meta.yaml  meta curato: top_threats, common_cores (curato a mano)
data/seasons/legal_<id>.json    strumenti e mosse legali nel formato (da scripts/fetch_legality.ts, serebii)
data/generated_teams/           storico team salvati, un JSON timestampato per salvataggio
scripts/fetch_roster.ts         scraper roster da serebii -> available_pokemon
scripts/fetch_legality.ts       scraper items/moves legali da serebii -> legal_<id>.json
scripts/generate.ts             CLI: genera team e scrive report .md/.json
scripts/refresh_meta_sets.ts    opzionale: aggiorna riferimento da @smogon/sets
```

## Riferimenti a snippet

Da popolare leggendo il codice quando la Fase 1 implementa la logica. In Fase 0 i file sono stub.
Per le regole di tagging dei ruoli la fonte è l'handoff §4.1; per lo scoring dei team §4.2.
