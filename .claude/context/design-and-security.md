---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - src/**
last-verified-commit: 17fdd2a
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

Nessun diagramma ancora. Quando si documenterà la pipeline del motore (Fase 1+), i sorgenti `.mmd`
andranno in `diagrams/` e si renderanno in `.svg` con `tools/render-diagrams.mjs`, in
corrispondenza uno a uno coi componenti descritti.

| Diagramma | Sorgente | Componenti rappresentati |
|---|---|---|
| (nessuno) | | |
