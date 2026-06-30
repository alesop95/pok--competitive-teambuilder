---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - src/**
last-verified-commit: 61690d5
source-doc: pokemon-champions-team-builder-spec.md
---

# Design e sicurezza applicativa

> Struttura iniziale con i fatti già noti dall'handoff. Si popola in dettaglio leggendo il codice
> man mano che la Fase 1 implementa il motore. I diagrammi referenziati vivono in `diagrams/`.

## Paradigmi di software design

L'app separa nettamente tre famiglie di dati per poter aggiornare la stagione senza toccare il
codice (handoff §3): i dati base Pokémon (da `@pkmn/dex` più la mod `champions`), il roster e il
meta di stagione (file curati in `data/seasons/`), e l'output generato (storico in
`data/generated_teams/`). Il motore è una pipeline deterministica: tagging dei ruoli su regole
esplicite (§4.1) → calcolo della viability competitiva di ogni candidato con il damage calc reale
(`@smogon/calc`) → generazione candidati per archetipo con core e riempimento guidati dalla viability
e da una penalità di diversità (§4.2) → verifica della coverage offensiva col damage calc → set
completi (`setBuilder`) validati contro la legalità di formato → rationale testuale (§4.3). La
formulazione matematica di viability, scoring e selezione è documentata in `docs/TECHNICAL.md`. Il
principio di token economy del progetto
(`rules/token-economy.md`) si riflette qui: il lavoro deterministico (tagging, coverage, scoring)
sta nel codice; l'eventuale salto semantico (rationale in prosa naturale) è isolato nel solo
Livello 2 opzionale.

La generazione accetta dei vincoli iniziali (ADR-010): un team Showdown incollato viene parsato
(`src/showdown.ts` su `@pkmn/sets`), risolto alla specie base del roster e validato senza mutare i
set; i membri riconosciuti diventano un seed bloccato che `teamGenerator` include in ogni proposta,
completando gli slot liberi e preservando i set importati verbatim. L'I/O usa il formato EV standard
di Showdown con una mappatura Stat Points<->EV centralizzata in `setBuilder.ts`. Questo non altera la
natura deterministica della pipeline: l'import è parsing puro, la generazione resta euristica su dati.

Il rationale ha due livelli attivabili in configurazione: il Livello 1 è offline, deterministico,
a template testuali sui fatti strutturati, sempre disponibile e a costo zero; il Livello 2 è un
enhancement opzionale che passa quei fatti a una chiamata API Claude per ottenere prosa più
naturale. Il Livello 1 non deve mai dipendere dal Livello 2.

## Sicurezza applicativa

L'app è locale e stateless per richiesta (dato un roster più meta, restituisce dei team; nessuna
sessione da mantenere), quindi la superficie esposta dell'MVP è minima. Non c'è autenticazione né
dati personali. L'unico segreto previsto è la chiave `ANTHROPIC_API_KEY` del rationale Livello 2
(non ancora implementato): vivrà in un `.env` ignorato da git e l'assenza dovrà degradare con grazia
al Livello 1. La validazione input riguarda i file dati curati (roster JSON, meta YAML); la rotta di
salvataggio dei team valida il nome file contro il path traversal (`src/engine.ts`, `SAFE_NAME`), e
la legalità degli strumenti/mosse dei set è verificata contro `data/seasons/legal_<id>.json`.

## Diagrammi

La pipeline del motore è rappresentata in `diagrams/pipeline.svg`, reso da `diagrams/pipeline.mmd`
con `tools/render-diagrams.mjs` (browser Chromium di sistema). La corrispondenza è uno a uno coi
moduli descritti sopra e in `docs/TECHNICAL.md` §3: ogni nodo del diagramma è un file/stadio reale
del codice.

| Diagramma | Sorgente | Componenti rappresentati |
|---|---|---|
| `pipeline.svg` | `pipeline.mmd` | Fonti dati (`@pkmn/dex`+mod, serebii, usage), `pkmnData`, `roleTagging`, `engine` (viability/coverage), `@smogon/calc`, `teamGenerator`, `setBuilder`, validazione legalità, `rationale`, output CLI e server |
