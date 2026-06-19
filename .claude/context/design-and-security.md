---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - src/**
last-verified-commit: 373419b
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
esplicite (§4.1) → generazione candidati per archetipo con scoring di sinergia e coverage (§4.2) →
generazione del rationale testuale (§4.3). Il principio di token economy del progetto
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
dati personali. L'unico segreto è la chiave `ANTHROPIC_API_KEY` del rationale Livello 2: vive in un
file `.env` ignorato da git, non si committa mai, e il suo assenza degrada con grazia al Livello 1.
La validazione input riguarda i file dati curati (roster JSON, meta YAML): vanno validati allo
schema prima dell'uso per evitare che un file malformato propaghi errori nel motore.

## Diagrammi

Nessun diagramma ancora. Quando si documenterà la pipeline del motore (Fase 1+), i sorgenti `.mmd`
andranno in `diagrams/` e si renderanno in `.svg` con `tools/render-diagrams.mjs`, in
corrispondenza uno a uno coi componenti descritti.

| Diagramma | Sorgente | Componenti rappresentati |
|---|---|---|
| (nessuno) | | |
