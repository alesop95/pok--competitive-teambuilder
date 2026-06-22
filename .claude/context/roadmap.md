---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths: []
last-verified-commit: 17fdd2a
source-doc: pokemon-champions-team-builder-spec.md
---

# Roadmap

> Direzione e priorità del progetto. Tracciata. Non è il work-log: qui sta dove si va, non cosa è
> già stato fatto. Le fasi derivano da §7 dell'handoff.

## Direzione

App locale (Windows 11 / Linux, nessuna dipendenza cloud obbligatoria) che, dato il roster di
Pokémon disponibili in una stagione di Pokémon Champions, genera N proposte di team competitivi con
ruoli, tattica, punti di forza, debolezze e counter, aggiornabile stagione per stagione senza
toccare il codice ma solo i file dati.

## Fasi

```
Fase 0  Inizializzazione: repo, npm init, installare @pkmn/dex e @smogon/calc, schema dati.   [in corso]
Fase 1  Motore offline da CLI: tagging ruoli (§4.1) + generazione team (§4.2) su un roster,
        output Markdown su file. Niente UI.
Fase 2  Wrapping in Fastify + UI minima (le 4 pagine di §5). App locale usabile via browser.   [MVP]
Fase 3  Raffinamento algoritmo: scoring sinergia, coverage contro meta threats con damage calc
        reale via @smogon/calc, più archetipi.
Fase 4  Rationale Livello 2 opzionale (prosa via API Claude, dietro ANTHROPIC_API_KEY).
Fase 5  (opzionale) Packaging desktop (Tauri) oppure deploy web (Render / Cloudflare Workers).
```

## Criterio di successo MVP (fine Fase 2)

Dato il roster M-B fornito, l'app produce almeno 3 team distinti con qualità di analisi comparabile
a quella prodotta manualmente nelle conversazioni precedenti, in meno di un secondo (rationale
Livello 1, nessuna chiamata di rete).

## Priorità

La priorità immediata è chiudere la Fase 0 (scaffold avviabile) e aprire la Fase 1, che è il cuore
del valore: il motore deterministico di tagging e generazione. La UI (Fase 2) viene dopo che il
motore produce output di qualità da CLI. Le integrazioni di rete (rationale Livello 2, deploy) sono
enhancement, non requisiti dell'MVP.

## Idee e ipotesi da verificare

Accessibilità della mod `champions` via `@pkmn/mods` rispetto al recupero diretto dal repository
Showdown (ADR-005, da verificare). Dettaglio esatto del preview/pick di squadra in game (box ~30
slot, squadra giocabile 6 con 4 in campo in doppio) — non bloccante per l'architettura.

Import su Pokémon Home da app di terze parti: esplorare se sia possibile creare/preparare Pokémon
con un tool esterno e portarli su Pokémon Home, per chiudere il ciclo dal team proposto al team
giocabile. Da verificare fattibilità e legittimità. Non prioritario: prima la logica applicativa e
l'uso competitivo del tool; questa esplorazione viene dopo.
